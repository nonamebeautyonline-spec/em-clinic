// app/api/admin/line/followup-rules/[id]/route.ts — フォローアップルール個別操作API
import { NextRequest, NextResponse } from "next/server";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow, strictWithTenant } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { updateFollowupRuleSchema } from "@/lib/validations/followup";
import { logAudit } from "@/lib/audit";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * PUT: フォローアップルール更新
 */
export async function PUT(req: NextRequest, ctx: RouteContext) {
  if (!(await verifyAdminAuth(req))) {
    return unauthorized();
  }

  const { id } = await ctx.params;
  const ruleId = parseInt(id, 10);
  if (isNaN(ruleId)) {
    return badRequest("無効なIDです");
  }

  const tenantId = resolveTenantIdOrThrow(req);
  const { data, error: parseError } = await parseBody(req, updateFollowupRuleSchema);
  if (parseError) return parseError;

  // テナントフィルタ付きで更新
  let query = supabaseAdmin
    .from("followup_rules")
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq("id", ruleId);
  query = strictWithTenant(query, tenantId);

  const { error } = await query;
  if (error) {
    return serverError(error.message);
  }

  logAudit(req, "followup_rule.update", "followup_rule", String(id));
  return NextResponse.json({ ok: true });
}

/**
 * DELETE: フォローアップルール削除（関連ログは保持）
 */
export async function DELETE(req: NextRequest, ctx: RouteContext) {
  if (!(await verifyAdminAuth(req))) {
    return unauthorized();
  }

  const { id } = await ctx.params;
  const ruleId = parseInt(id, 10);
  if (isNaN(ruleId)) {
    return badRequest("無効なIDです");
  }

  const tenantId = resolveTenantIdOrThrow(req);

  // テナントフィルタ付きで削除
  let query = supabaseAdmin
    .from("followup_rules")
    .delete()
    .eq("id", ruleId);
  query = strictWithTenant(query, tenantId);

  const { error } = await query;
  if (error) {
    return serverError(error.message);
  }

  logAudit(req, "followup_rule.delete", "followup_rule", String(id));
  return NextResponse.json({ ok: true });
}
