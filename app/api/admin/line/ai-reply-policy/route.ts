// AI返信 ポリシールール管理API（Phase 2-3）
// GET: ルール一覧 + ログ取得 / POST: ルール追加 / PATCH: ルール更新 / DELETE: ルール削除

import { NextRequest, NextResponse } from "next/server";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveTenantIdOrThrow, strictWithTenant, tenantPayload } from "@/lib/tenant";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

// ルール一覧 + 直近のログ
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);

  try {
    const [rulesRes, logsRes] = await Promise.all([
      strictWithTenant(
        supabaseAdmin
          .from("ai_reply_policy_rules")
          .select("*")
          .order("priority", { ascending: true }),
        tenantId
      ),
      strictWithTenant(
        supabaseAdmin
          .from("ai_reply_policy_logs")
          .select("id, draft_id, patient_id, matched_rules, final_decision, created_at")
          .order("created_at", { ascending: false })
          .limit(50),
        tenantId
      ),
    ]);

    return NextResponse.json({
      rules: rulesRes.data || [],
      recentLogs: logsRes.data || [],
    });
  } catch (err) {
    console.error("[Policy API] 取得エラー:", err);
    return serverError("ポリシーの取得に失敗しました");
  }
}

// ルール追加
export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);

  try {
    const body = await req.json();
    const { rule_name, rule_type, priority, conditions, action } = body;
    if (!rule_name || !rule_type) return badRequest("rule_nameとrule_typeが必要です");

    const { data, error } = await supabaseAdmin
      .from("ai_reply_policy_rules")
      .insert({
        ...tenantPayload(tenantId),
        rule_name,
        rule_type,
        priority: priority || 100,
        conditions: conditions || {},
        action: action || {},
      })
      .select("id")
      .single();

    if (error) return serverError("ルールの追加に失敗しました");

    logAudit(req, "policy_rule.create", "ai_reply_policy_rules", String(data.id));
    return NextResponse.json({ ok: true, id: data.id });
  } catch (err) {
    console.error("[Policy API] 追加エラー:", err);
    return serverError("ルールの追加に失敗しました");
  }
}

// ルール更新
export async function PATCH(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);

  try {
    const body = await req.json();
    const { id, ...updates } = body;
    if (!id) return badRequest("IDが必要です");

    const { error } = await strictWithTenant(
      supabaseAdmin
        .from("ai_reply_policy_rules")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id),
      tenantId
    );

    if (error) return serverError("ルールの更新に失敗しました");

    logAudit(req, "policy_rule.update", "ai_reply_policy_rules", String(id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Policy API] 更新エラー:", err);
    return serverError("ルールの更新に失敗しました");
  }
}

// ルール削除
export async function DELETE(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);

  try {
    const { id } = await req.json();
    if (!id) return badRequest("IDが必要です");

    const { error } = await strictWithTenant(
      supabaseAdmin
        .from("ai_reply_policy_rules")
        .delete()
        .eq("id", id),
      tenantId
    );

    if (error) return serverError("ルールの削除に失敗しました");

    logAudit(req, "policy_rule.delete", "ai_reply_policy_rules", String(id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Policy API] 削除エラー:", err);
    return serverError("ルールの削除に失敗しました");
  }
}
