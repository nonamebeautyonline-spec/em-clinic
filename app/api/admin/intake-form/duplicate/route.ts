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

  // アクティブなテンプレートを取得
  const { data: active, error: fetchError } = await strictWithTenant(
    supabaseAdmin
      .from("intake_form_definitions")
      .select("id, name, fields, settings")
      .eq("is_active", true),
    tenantId,
  ).maybeSingle();

  if (fetchError)
    return serverError(fetchError.message);

  if (!active)
    return notFound("コピー元のテンプレートが見つかりません");

  // コピーして新レコード作成（is_active = false）
  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("intake_form_definitions")
    .insert({
      ...tenantPayload(tenantId),
      name: active.name + "（コピー）",
      fields: active.fields,
      settings: active.settings,
      is_active: false,
    })
    .select("id, name, is_active, created_at")
    .single();

  if (insertError)
    return serverError(insertError.message);

  logAudit(req, "intake_form.duplicate", "intake_form", "unknown");
  return NextResponse.json({ ok: true, template: inserted });
}
