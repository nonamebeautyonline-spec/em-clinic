// AI Workflow Policy Rules API: 個別取得・更新・削除
import { NextRequest, NextResponse } from "next/server";
import { verifyPlatformAdmin } from "@/lib/platform-auth";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { logAudit } from "@/lib/audit";
import { policyRuleUpdateSchema } from "@/lib/validations/ai-tasks";

type RouteContext = { params: Promise<{ ruleId: string }> };

/**
 * PUT: ポリシールール更新
 */
export async function PUT(req: NextRequest, ctx: RouteContext) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin) return unauthorized();

  const { ruleId } = await ctx.params;
  if (!ruleId) return badRequest("ruleIdが必要です");

  let body;
  try {
    body = await req.json();
  } catch {
    return badRequest("JSONの解析に失敗しました");
  }

  const parsed = policyRuleUpdateSchema.safeParse(body);
  if (!parsed.success) return badRequest("入力が不正です");

  // 空オブジェクトの場合は更新不要
  const updateData = parsed.data;
  if (Object.keys(updateData).length === 0) {
    return badRequest("更新するフィールドがありません");
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("ai_workflow_policy_rules")
      .update({ ...updateData, updated_at: new Date().toISOString() })
      .eq("id", ruleId)
      .select()
      .single();

    if (error) {
      console.error("[AI Policy Rules] 更新エラー:", error);
      if (error.code === "PGRST116") {
        return badRequest("指定されたルールが見つかりません");
      }
      return serverError("ポリシールールの更新に失敗しました");
    }

    logAudit(req, "ai_policy_rule.update", "ai_workflow_policy_rules", ruleId);

    return NextResponse.json({ ok: true, rule: data });
  } catch (err) {
    console.error("[AI Policy Rules] 更新エラー:", err);
    return serverError("ポリシールールの更新に失敗しました");
  }
}

/**
 * DELETE: ポリシールール物理削除
 */
export async function DELETE(req: NextRequest, ctx: RouteContext) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin) return unauthorized();

  const { ruleId } = await ctx.params;
  if (!ruleId) return badRequest("ruleIdが必要です");

  try {
    const { error } = await supabaseAdmin
      .from("ai_workflow_policy_rules")
      .delete()
      .eq("id", ruleId);

    if (error) {
      console.error("[AI Policy Rules] 削除エラー:", error);
      return serverError("ポリシールールの削除に失敗しました");
    }

    logAudit(req, "ai_policy_rule.delete", "ai_workflow_policy_rules", ruleId);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[AI Policy Rules] 削除エラー:", err);
    return serverError("ポリシールールの削除に失敗しました");
  }
}
