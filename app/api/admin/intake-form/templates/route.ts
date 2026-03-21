// 問診テンプレート一覧API (GET / POST / DELETE)
import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized, badRequest } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow, strictWithTenant, tenantPayload } from "@/lib/tenant";
import { logAudit } from "@/lib/audit";
import { DEFAULT_INTAKE_FIELDS, DEFAULT_INTAKE_SETTINGS } from "@/lib/intake-form-defaults";

// テンプレート一覧取得
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized)
    return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);

  const { data, error } = await strictWithTenant(
    supabaseAdmin
      .from("intake_form_definitions")
      .select("id, name, fields, is_active, created_at, updated_at")
      .order("is_active", { ascending: false })
      .order("updated_at", { ascending: false }),
    tenantId,
  );

  if (error)
    return serverError(error.message);

  // フィールド数を付与してfieldsの中身は返さない（転送量削減）
  const templates = (data || []).map((t: Record<string, unknown>) => ({
    id: t.id,
    name: t.name,
    is_active: t.is_active,
    field_count: Array.isArray(t.fields) ? (t.fields as unknown[]).length : 0,
    created_at: t.created_at,
    updated_at: t.updated_at,
  }));

  return NextResponse.json({ ok: true, templates });
}

// テンプレート新規作成（デフォルトフィールドで作成、is_active = false）
export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized)
    return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);

  let body: { name?: string } = {};
  try {
    body = await req.json();
  } catch {
    return badRequest("リクエストボディが不正です");
  }

  const name = body.name?.trim();
  if (!name)
    return badRequest("問診フォーム名を入力してください");

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("intake_form_definitions")
    .insert({
      ...tenantPayload(tenantId),
      name,
      fields: DEFAULT_INTAKE_FIELDS,
      settings: DEFAULT_INTAKE_SETTINGS,
      is_active: false,
    })
    .select("id, name, is_active, created_at")
    .single();

  if (insertError)
    return serverError(insertError.message);

  logAudit(req, "intake_form_template.create", "intake_form_template", String(inserted.id));
  return NextResponse.json({ ok: true, template: inserted });
}

// テンプレート名変更（PATCH）
export async function PATCH(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized)
    return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);

  let body: { id?: string; name?: string } = {};
  try {
    body = await req.json();
  } catch {
    return badRequest("リクエストボディが不正です");
  }

  if (!body.id)
    return badRequest("テンプレートIDが必要です");

  const name = body.name?.trim();
  if (!name)
    return badRequest("問診フォーム名を入力してください");

  const { error } = await strictWithTenant(
    supabaseAdmin
      .from("intake_form_definitions")
      .update({ name, updated_at: new Date().toISOString() })
      .eq("id", body.id),
    tenantId,
  );

  if (error)
    return serverError(error.message);

  logAudit(req, "intake_form_template.rename", "intake_form_template", String(body.id));
  return NextResponse.json({ ok: true });
}

// テンプレート削除（アクティブなテンプレートは削除不可）
export async function DELETE(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized)
    return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);

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
  const { data: target, error: fetchError } = await strictWithTenant(
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

  logAudit(req, "intake_form_template.delete", "intake_form_template", String(templateId));
  return NextResponse.json({ ok: true });
}
