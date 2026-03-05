// app/api/stripe/webhook/route.ts
// Stripe Webhook受信: 署名検証 + 冪等性チェック + イベント処理

import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { verifyWebhookSignature } from "@/lib/stripe";
import { checkIdempotency } from "@/lib/idempotency";
import { supabaseAdmin } from "@/lib/supabase";

// Next.jsのbody自動パースを無効化（Stripe署名検証に必要）
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // 生のリクエストボディを取得（署名検証に必要）
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "署名がありません" }, { status: 400 });
  }

  // 署名検証
  const event = await verifyWebhookSignature(body, signature);
  if (!event) {
    return NextResponse.json({ error: "署名検証失敗" }, { status: 400 });
  }

  // 冪等性チェック
  const idem = await checkIdempotency("stripe", event.id, null, {
    type: event.type,
  });
  if (idem.duplicate) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case "invoice.payment_succeeded":
        await handleInvoicePaymentSucceeded(event);
        break;
      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event);
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event);
        break;
      default:
        console.log(`[stripe-webhook] 未処理イベント: ${event.type}`);
    }

    await idem.markCompleted();
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error(`[stripe-webhook] イベント処理エラー (${event.type}):`, err);
    await idem.markFailed(err instanceof Error ? err.message : "unknown error");
    return NextResponse.json({ error: "処理エラー" }, { status: 500 });
  }
}

/** invoice.payment_succeeded: 支払い成功 → status=active、billing_invoices作成 */
async function handleInvoicePaymentSucceeded(event: Stripe.Event) {
  const invoice = event.data.object as unknown as Record<string, unknown>;
  const customerId = invoice.customer as string;
  const subscriptionId = invoice.subscription as string;

  // テナント特定
  const tenant = await findTenantByCustomerId(customerId);
  if (!tenant) {
    console.warn(`[stripe-webhook] テナント不明: customer=${customerId}`);
    return;
  }

  // サブスクリプションステータスをactiveに
  await supabaseAdmin
    .from("tenant_plans")
    .update({ status: "active", updated_at: new Date().toISOString() })
    .eq("tenant_id", tenant.tenant_id)
    .eq("stripe_subscription_id", subscriptionId);

  // billing_invoices に請求書レコード作成
  const periodStart = invoice.period_start
    ? new Date((invoice.period_start as number) * 1000).toISOString()
    : null;
  const periodEnd = invoice.period_end
    ? new Date((invoice.period_end as number) * 1000).toISOString()
    : null;
  const amountPaid = (invoice.amount_paid as number) || 0;
  const tax = (invoice.tax as number) || 0;

  await supabaseAdmin.from("billing_invoices").insert({
    tenant_id: tenant.tenant_id,
    invoice_number: (invoice.number as string) || `INV-${Date.now()}`,
    billing_period_start: periodStart,
    billing_period_end: periodEnd,
    amount: amountPaid - tax,
    tax_amount: tax,
    total_amount: amountPaid,
    status: "paid",
    paid_at: new Date().toISOString(),
    stripe_invoice_id: invoice.id as string,
    notes: null,
  });
}

/** invoice.payment_failed: 支払い失敗 → status=payment_failed */
async function handleInvoicePaymentFailed(event: Stripe.Event) {
  const invoice = event.data.object as unknown as Record<string, unknown>;
  const customerId = invoice.customer as string;
  const subscriptionId = invoice.subscription as string;

  const tenant = await findTenantByCustomerId(customerId);
  if (!tenant) return;

  await supabaseAdmin
    .from("tenant_plans")
    .update({ status: "payment_failed", updated_at: new Date().toISOString() })
    .eq("tenant_id", tenant.tenant_id)
    .eq("stripe_subscription_id", subscriptionId);
}

/** customer.subscription.updated: プラン変更同期 */
async function handleSubscriptionUpdated(event: Stripe.Event) {
  const subscription = event.data.object as unknown as Record<string, unknown>;
  const customerId = subscription.customer as string;
  const subscriptionId = subscription.id as string;
  const status = subscription.status as string;

  const tenant = await findTenantByCustomerId(customerId);
  if (!tenant) return;

  // Stripeステータスをローカルに変換
  const localStatus = mapStripeStatus(status);

  const currentPeriodEnd = subscription.current_period_end
    ? new Date((subscription.current_period_end as number) * 1000).toISOString()
    : null;

  await supabaseAdmin
    .from("tenant_plans")
    .update({
      status: localStatus,
      stripe_subscription_id: subscriptionId,
      next_billing_at: currentPeriodEnd,
      updated_at: new Date().toISOString(),
    })
    .eq("tenant_id", tenant.tenant_id);
}

/** customer.subscription.deleted: サブスク解約 */
async function handleSubscriptionDeleted(event: Stripe.Event) {
  const subscription = event.data.object as unknown as Record<string, unknown>;
  const customerId = subscription.customer as string;

  const tenant = await findTenantByCustomerId(customerId);
  if (!tenant) return;

  await supabaseAdmin
    .from("tenant_plans")
    .update({
      status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("tenant_id", tenant.tenant_id);
}

/** stripe_customer_id からテナントを検索 */
async function findTenantByCustomerId(customerId: string) {
  const { data } = await supabaseAdmin
    .from("tenant_plans")
    .select("tenant_id")
    .eq("stripe_customer_id", customerId)
    .single();
  return data;
}

/** StripeサブスクステータスをローカルDB用に変換 */
function mapStripeStatus(stripeStatus: string): string {
  switch (stripeStatus) {
    case "active":
    case "trialing":
      return "active";
    case "past_due":
      return "payment_failed";
    case "canceled":
    case "unpaid":
      return "cancelled";
    case "incomplete":
    case "incomplete_expired":
      return "pending";
    default:
      return stripeStatus;
  }
}
