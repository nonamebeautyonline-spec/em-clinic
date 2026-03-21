// 問診テンプレート複製API (POST)
import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized, notFound } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow, strictWithTenant, tenantPayload } from "@/lib/tenant";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized)
    return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);

  let body: { name?: string; source_id?: string } = {};
  try {
    body = await req.json();
  } catch { /* bodyなしでもOK（後方互換） */ }

  const newName = body.name?.trim();

  // source_id指定があればそのテンプレートを複製、なければアクティブを複製
  let sourceQuery = strictWithTenant(
    supabaseAdmin
      .from("intake_form_definitions")
      .select("id, name, fields, settings, field_id"),
    tenantId,
  );

  if (body.source_id) {
    sourceQuery = sourceQuery.eq("id", body.source_id);
  } else {
    sourceQuery = sourceQuery.eq("is_active", true);
  }

  const { data: source, error: fetchError } = await sourceQuery.maybeSingle();

  if (fetchError)
    return serverError(fetchError.message);

  if (!source)
    return notFound("コピー元のテンプレートが見つかりません");

  // コピーして新レコード作成（is_active = false）
  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("intake_form_definitions")
    .insert({
      ...tenantPayload(tenantId),
      name: newName || (source.name + "（コピー）"),
      fields: source.fields,
      settings: source.settings,
      field_id: source.field_id,
      is_active: false,
    })
    .select("id, name, is_active, created_at")
    .single();

  if (insertError)
    return serverError(insertError.message);

  logAudit(req, "intake_form.duplicate", "intake_form", String(inserted.id));
  return NextResponse.json({ ok: true, template: inserted });
}
