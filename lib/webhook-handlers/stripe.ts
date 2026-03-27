// lib/webhook-handlers/stripe.ts — Stripe Webhook業務ロジック（リプレイ対応）
import type Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase";

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

/** invoice.payment_succeeded: 支払い成功 → status=active、billing_invoices作成、サスペンド解除 */
async function handleInvoicePaymentSucceeded(event: Stripe.Event) {
  const invoice = event.data.object as unknown as Record<string, unknown>;
  const customerId = invoice.customer as string;
  const subscriptionId = invoice.subscription as string;

  const tenant = await findTenantByCustomerId(customerId);
  if (!tenant) {
    console.warn(`[stripe/handler] テナント不明: customer=${customerId}`);
    return;
  }

  // プランステータスをactiveに戻し、payment_failed_atをクリア
  await supabaseAdmin
    .from("tenant_plans")
    .update({
      status: "active",
      payment_failed_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("tenant_id", tenant.tenant_id)
    .eq("stripe_subscription_id", subscriptionId);

  // 支払い滞納でサスペンドされていた場合は復活
  await supabaseAdmin
    .from("tenants")
    .update({
      is_active: true,
      suspended_at: null,
      suspend_reason: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", tenant.tenant_id)
    .eq("suspend_reason", "payment_overdue");

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

/** invoice.payment_failed: 支払い失敗 → status=payment_failed、猶予期間開始 */
async function handleInvoicePaymentFailed(event: Stripe.Event) {
  const invoice = event.data.object as unknown as Record<string, unknown>;
  const customerId = invoice.customer as string;
  const subscriptionId = invoice.subscription as string;

  const tenant = await findTenantByCustomerId(customerId);
  if (!tenant) return;

  const now = new Date().toISOString();

  // 現在のプラン情報を取得
  const { data: plan } = await supabaseAdmin
    .from("tenant_plans")
    .select("payment_failed_at")
    .eq("tenant_id", tenant.tenant_id)
    .eq("stripe_subscription_id", subscriptionId)
    .single();

  // payment_failed_at は初回失敗時のみ記録（猶予期間の起算日を保持）
  await supabaseAdmin
    .from("tenant_plans")
    .update({
      status: "payment_failed",
      payment_failed_at: plan?.payment_failed_at || now,
      updated_at: now,
    })
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

/**
 * Stripe Webhook業務ロジック（リプレイ可能）
 * 署名検証・冪等チェックの外側で呼ぶ純粋な業務処理
 */
export async function processStripeEvent(event: Stripe.Event): Promise<void> {
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
      console.log(`[stripe/handler] 未処理イベント: ${event.type}`);
  }
}
