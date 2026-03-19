// app/api/admin/billing/summary/route.ts
// テナント課金サマリーAPI: プラン情報 + 使用量 + 請求書一覧

import { NextRequest, NextResponse } from "next/server";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase";
import { getPlanByKey } from "@/lib/plan-config";

export async function GET(req: NextRequest) {
  const isAuth = await verifyAdminAuth(req);
  if (!isAuth) {
    return unauthorized();
  }

  const tenantId = resolveTenantIdOrThrow(req);
  if (!tenantId) {
    return badRequest("テナントが特定できません");
  }

  try {
    // プラン情報
    const { data: plan } = await supabaseAdmin
      .from("tenant_plans")
      .select("plan_name, monthly_fee, setup_fee, started_at, next_billing_at, status, message_quota, overage_unit_price, stripe_subscription_id, stripe_customer_id")
      .eq("tenant_id", tenantId)
      .single();

    // 当月使用量
    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const { data: usage } = await supabaseAdmin
      .from("monthly_usage")
      .select("message_count, ai_reply_count, voice_input_count")
      .eq("tenant_id", tenantId)
      .eq("year_month", yearMonth)
      .single();

    // 最近の請求書（直近6件）
    const { data: invoices } = await supabaseAdmin
      .from("billing_invoices")
      .select("id, invoice_number, billing_period_start, billing_period_end, amount, tax_amount, total_amount, status, paid_at, created_at")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(6);

    // プラン定義の詳細情報
    const planConfig = plan ? getPlanByKey(plan.plan_name) : null;

    // 超過メッセージ計算
    const messageCount = usage?.message_count || 0;
    const quota = plan?.message_quota || planConfig?.messageQuota || 5000;
    const overageCount = Math.max(0, messageCount - quota);
    const overageUnitPrice = plan?.overage_unit_price || planConfig?.overageUnitPrice || 1.0;
    const overageAmount = Math.ceil(overageCount * overageUnitPrice);

    return NextResponse.json({
      ok: true,
      plan: plan ? {
        planName: plan.plan_name,
        planLabel: planConfig?.label || plan.plan_name,
        monthlyFee: plan.monthly_fee,
        setupFee: plan.setup_fee,
        messageQuota: quota,
        overageUnitPrice,
        startedAt: plan.started_at,
        nextBillingAt: plan.next_billing_at,
        status: plan.status,
        hasStripe: !!plan.stripe_subscription_id,
      } : null,
      usage: {
        yearMonth,
        messageCount,
        messageQuota: quota,
        overageCount,
        overageAmount,
        aiReplyCount: usage?.ai_reply_count || 0,
        voiceInputCount: usage?.voice_input_count || 0,
      },
      invoices: invoices || [],
    });
  } catch (err) {
    console.error("[admin/billing/summary] error:", err);
    return serverError("データ取得に失敗しました");
  }
}
