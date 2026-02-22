// app/api/admin/line/followup-rules/[id]/route.ts — フォローアップルール個別操作API
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { updateFollowupRuleSchema } from "@/lib/validations/followup";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * PUT: フォローアップルール更新
 */
export async function PUT(req: NextRequest, ctx: RouteContext) {
  if (!(await verifyAdminAuth(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const ruleId = parseInt(id, 10);
  if (isNaN(ruleId)) {
    return NextResponse.json({ error: "無効なIDです" }, { status: 400 });
  }

  const tenantId = resolveTenantId(req);
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
  query = withTenant(query, tenantId);

  const { error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

/**
 * DELETE: フォローアップルール削除（関連ログは保持）
 */
export async function DELETE(req: NextRequest, ctx: RouteContext) {
  if (!(await verifyAdminAuth(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const ruleId = parseInt(id, 10);
  if (isNaN(ruleId)) {
    return NextResponse.json({ error: "無効なIDです" }, { status: 400 });
  }

  const tenantId = resolveTenantId(req);

  // テナントフィルタ付きで削除
  let query = supabaseAdmin
    .from("followup_rules")
    .delete()
    .eq("id", ruleId);
  query = withTenant(query, tenantId);

  const { error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
