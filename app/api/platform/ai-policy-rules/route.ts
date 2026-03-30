// AI Workflow Policy Rules API: 一覧取得 + 作成
import { NextRequest, NextResponse } from "next/server";
import { verifyPlatformAdmin } from "@/lib/platform-auth";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { logAudit } from "@/lib/audit";
import { policyRuleCreateSchema } from "@/lib/validations/ai-tasks";

/**
 * GET: ポリシールール一覧（priority昇順）
 */
export async function GET(req: NextRequest) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin) return unauthorized();

  const url = new URL(req.url);
  const workflowType = url.searchParams.get("workflow_type");
  const isActiveParam = url.searchParams.get("is_active");

  try {
    let query = supabaseAdmin
      .from("ai_workflow_policy_rules")
      .select("*")
      .order("priority", { ascending: true });

    if (workflowType) query = query.eq("workflow_type", workflowType);
    if (isActiveParam !== null) {
      const isActive = isActiveParam === "true";
      query = query.eq("is_active", isActive);
    }

    const { data, error } = await query;
    if (error) {
      console.error("[AI Policy Rules] 一覧取得エラー:", error);
      return serverError("ポリシールール一覧の取得に失敗しました");
    }

    return NextResponse.json({ ok: true, rules: data || [] });
  } catch (err) {
    console.error("[AI Policy Rules] エラー:", err);
    return serverError("ポリシールール一覧の取得に失敗しました");
  }
}

/**
 * POST: ポリシールール作成
 */
export async function POST(req: NextRequest) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin) return unauthorized();

  let body;
  try {
    body = await req.json();
  } catch {
    return badRequest("JSONの解析に失敗しました");
  }

  const parsed = policyRuleCreateSchema.safeParse(body);
  if (!parsed.success) return badRequest("入力が不正です");

  const { workflow_type, rule_name, rule_type, priority, conditions, action, is_active, tenant_id } = parsed.data;

  try {
    const { data, error } = await supabaseAdmin
      .from("ai_workflow_policy_rules")
      .insert({
        workflow_type,
        rule_name,
        rule_type,
        priority,
        conditions,
        action,
        is_active,
        tenant_id: tenant_id ?? null,
      })
      .select()
      .single();

    if (error) {
      console.error("[AI Policy Rules] 作成エラー:", error);
      return serverError("ポリシールールの作成に失敗しました");
    }

    logAudit(req, "ai_policy_rule.create", "ai_workflow_policy_rules", data.id);

    return NextResponse.json({ ok: true, rule: data }, { status: 201 });
  } catch (err) {
    console.error("[AI Policy Rules] 作成エラー:", err);
    return serverError("ポリシールールの作成に失敗しました");
  }
}
