// 問診テンプレート一覧API (GET / DELETE)
import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized, badRequest } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant } from "@/lib/tenant";

// テンプレート一覧取得
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized)
    return unauthorized();

  const tenantId = resolveTenantId(req);

  const { data, error } = await withTenant(
    supabaseAdmin
      .from("intake_form_definitions")
      .select("id, name, is_active, created_at, updated_at")
      .order("is_active", { ascending: false })
      .order("updated_at", { ascending: false }),
    tenantId,
  );

  if (error)
    return serverError(error.message);

  return NextResponse.json({ ok: true, templates: data || [] });
}

// テンプレート削除（アクティブなテンプレートは削除不可）
export async function DELETE(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized)
    return unauthorized();

  const tenantId = resolveTenantId(req);

  let body: { id?: string };
  try {
    body = await req.json();
  } catch {
    return badRequest("リクエストボディが不正です");
  }

  const templateId = body.id;
  if (!templateId)
    return badRequest("テンプレートIDが必要です");

  // 対象テンプレートを確認（アクティブなものは削除不可）
  const { data: target, error: fetchError } = await withTenant(
    supabaseAdmin
      .from("intake_form_definitions")
      .select("id, is_active")
      .eq("id", templateId),
    tenantId,
  ).maybeSingle();

  if (fetchError)
    return serverError(fetchError.message);

  if (!target)
    return badRequest("テンプレートが見つかりません");

  if (target.is_active)
    return badRequest("使用中のテンプレートは削除できません");

  const { error: deleteError } = await supabaseAdmin
    .from("intake_form_definitions")
    .delete()
    .eq("id", templateId);

  if (deleteError)
    return serverError(deleteError.message);

  return NextResponse.json({ ok: true });
}
