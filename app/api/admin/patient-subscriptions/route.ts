// app/api/admin/patient-subscriptions/route.ts — 患者サブスクリプション管理API
import { NextRequest, NextResponse } from "next/server";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveTenantIdOrThrow, strictWithTenant, tenantPayload } from "@/lib/tenant";
import { logAudit } from "@/lib/audit";

// 患者サブスク一覧
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const { searchParams } = new URL(req.url);
  const patientId = searchParams.get("patient_id");

  let query = strictWithTenant(
    supabaseAdmin
      .from("patient_subscriptions")
      .select("*, subscription_plans(name, price, interval_months, gateway)")
      .order("created_at", { ascending: false }),
    tenantId,
  );

  if (patientId) query = query.eq("patient_id", patientId);

  const { data, error } = await query;
  if (error) return serverError(error.message);
  return NextResponse.json({ subscriptions: data || [] });
}

// サブスク作成（管理者が手動で患者にプランを割り当て）
export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const body = await req.json();
  const { patient_id, plan_id } = body;

  if (!patient_id || !plan_id) return badRequest("patient_idとplan_idは必須です");

  // プラン情報取得
  const { data: plan } = await strictWithTenant(
    supabaseAdmin.from("subscription_plans").select("*").eq("id", plan_id).single(),
    tenantId,
  );
  if (!plan) return badRequest("プランが見つかりません");

  // 次回請求日を計算
  const nextBilling = new Date();
  if (plan.trial_days > 0) {
    nextBilling.setDate(nextBilling.getDate() + plan.trial_days);
  } else {
    nextBilling.setMonth(nextBilling.getMonth() + (plan.interval_months || 1));
  }

  const { data, error } = await supabaseAdmin
    .from("patient_subscriptions")
    .insert({
      ...tenantPayload(tenantId),
      patient_id,
      plan_id,
      status: "active",
      gateway: plan.gateway || "square",
      current_cycle: 1,
      next_billing_at: nextBilling.toISOString(),
    })
    .select("*, subscription_plans(name, price, interval_months, gateway)")
    .single();

  if (error) return serverError(error.message);
  logAudit(req, "patient_subscription.create", "patient_subscription", data.id);
  return NextResponse.json({ subscription: data }, { status: 201 });
}

// サブスクステータス更新（一時停止・解約等）
export async function PUT(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const body = await req.json();
  const { id, status } = body;
  if (!id) return badRequest("IDは必須です");

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (status) {
    updates.status = status;
    if (status === "cancelled") updates.cancelled_at = new Date().toISOString();
  }

  const { data, error } = await strictWithTenant(
    supabaseAdmin.from("patient_subscriptions").update(updates),
    tenantId,
  ).eq("id", id).select().single();

  if (error) return serverError(error.message);
  logAudit(req, "patient_subscription.update", "patient_subscription", id);
  return NextResponse.json({ subscription: data });
}
