// lib/generate-invoice.ts — 超過料金のStripe請求書自動生成
//
// monthly_usage の超過金額(overage_amount)を元に、
// Stripe Invoice を作成して billing_invoices に記録する。
// 冪等性: invoice_generated フラグで重複生成を防止。

import { supabaseAdmin } from "@/lib/supabase";
import { getStripeClient } from "@/lib/stripe";
import { getMonthUsage } from "@/lib/usage";

/** 請求書生成結果 */
export interface InvoiceResult {
  status:
    | "generated" // 請求書を生成した
    | "skipped_no_overage" // 超過なし
    | "skipped_already_generated" // 生成済み（冪等）
    | "skipped_no_stripe" // Stripe未設定
    | "skipped_no_customer" // stripe_customer_id なし
    | "error"; // エラー
  tenantId: string;
  overageAmount?: number;
  stripeInvoiceId?: string;
  error?: string;
}

/**
 * テナントの指定月の超過料金に対してStripe請求書を生成する
 * @param tenantId テナントID
 * @param targetDate 対象月を含む日付（この日付の月を対象とする）
 */
export async function generateOverageInvoice(
  tenantId: string,
  targetDate: Date,
): Promise<InvoiceResult> {
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth();
  const monthDate = new Date(year, month, 1).toISOString().split("T")[0];
  const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;

  // 1. 冪等チェック: monthly_usage の invoice_generated フラグ
  const { data: existingUsage } = await supabaseAdmin
    .from("monthly_usage")
    .select("id, overage_amount, invoice_generated")
    .eq("tenant_id", tenantId)
    .eq("month", monthDate)
    .maybeSingle();

  if (existingUsage?.invoice_generated) {
    return { status: "skipped_already_generated", tenantId };
  }

  // 2. 超過料金算出（monthly_usage があればそこから、なければリアルタイム計算）
  let overageAmount: number;
  let usageRecordId: string | undefined;

  if (existingUsage) {
    overageAmount = existingUsage.overage_amount ?? 0;
    usageRecordId = existingUsage.id;
  } else {
    // monthly_usage が未集計の場合はリアルタイムで算出
    const usage = await getMonthUsage(tenantId, targetDate);
    overageAmount = usage.overageAmount;
  }

  // 3. 超過なし → フラグだけ立てて終了
  if (overageAmount <= 0) {
    if (usageRecordId) {
      await supabaseAdmin
        .from("monthly_usage")
        .update({ invoice_generated: true, updated_at: new Date().toISOString() })
        .eq("id", usageRecordId);
    }
    return { status: "skipped_no_overage", tenantId, overageAmount: 0 };
  }

  // 4. Stripeクライアント取得
  const stripe = await getStripeClient();
  if (!stripe) {
    return { status: "skipped_no_stripe", tenantId };
  }

  // 5. tenant_plans から stripe_customer_id 取得
  const { data: plan } = await supabaseAdmin
    .from("tenant_plans")
    .select("id, stripe_customer_id")
    .eq("tenant_id", tenantId)
    .eq("status", "active")
    .maybeSingle();

  if (!plan?.stripe_customer_id) {
    return { status: "skipped_no_customer", tenantId };
  }

  try {
    // 6. 消費税計算（10%、切り上げ）
    const taxAmount = Math.ceil(overageAmount * 0.1);
    const totalAmount = overageAmount + taxAmount;

    // 7. Stripe Invoice 生成
    // 7a. 請求書作成（下書き状態）
    const stripeInvoice = await stripe.invoices.create({
      customer: plan.stripe_customer_id,
      collection_method: "charge_automatically",
      auto_advance: false, // 手動で確定するため
      metadata: {
        tenant_id: tenantId,
        month: monthStr,
        type: "overage",
      },
    });

    // 7b. 請求明細（超過料金）
    await stripe.invoiceItems.create({
      customer: plan.stripe_customer_id,
      invoice: stripeInvoice.id,
      amount: totalAmount, // 税込金額（円）
      currency: "jpy",
      description: `メッセージ超過料金（${monthStr}）`,
      metadata: {
        tenant_id: tenantId,
        month: monthStr,
        overage_amount: String(overageAmount),
        tax_amount: String(taxAmount),
      },
    });

    // 7c. 請求書確定（自動請求開始）
    await stripe.invoices.finalizeInvoice(stripeInvoice.id, {
      auto_advance: true,
    });

    // 8. billing_invoices にレコード INSERT
    const billingPeriodStart = new Date(year, month, 1).toISOString();
    const billingPeriodEnd = new Date(year, month + 1, 0).toISOString(); // 月末

    await supabaseAdmin.from("billing_invoices").insert({
      tenant_id: tenantId,
      plan_id: plan.id,
      invoice_number: stripeInvoice.number || `OVG-${monthStr}-${Date.now()}`,
      billing_period_start: billingPeriodStart,
      billing_period_end: billingPeriodEnd,
      amount: overageAmount,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      status: "pending", // Webhook で paid に更新される
      stripe_invoice_id: stripeInvoice.id,
      notes: `メッセージ超過料金（${monthStr}）`,
    });

    // 9. monthly_usage.invoice_generated = true
    if (usageRecordId) {
      await supabaseAdmin
        .from("monthly_usage")
        .update({ invoice_generated: true, updated_at: new Date().toISOString() })
        .eq("id", usageRecordId);
    }

    console.log(
      `[generate-invoice] テナント ${tenantId} の${monthStr}超過請求書を生成: ¥${totalAmount}（税込）`,
    );

    return {
      status: "generated",
      tenantId,
      overageAmount,
      stripeInvoiceId: stripeInvoice.id,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(
      `[generate-invoice] テナント ${tenantId} の請求書生成エラー:`,
      err,
    );
    return {
      status: "error",
      tenantId,
      overageAmount,
      error: errorMsg,
    };
  }
}
