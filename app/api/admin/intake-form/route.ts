// 問診フォーム定義 管理API (GET / PUT)
import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant, tenantPayload } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { IntakeFormUpdateSchema } from "@/lib/validations/intake-form";
import {
  DEFAULT_INTAKE_FIELDS,
  DEFAULT_INTAKE_SETTINGS,
} from "@/lib/intake-form-defaults";

// 問診フォーム定義取得
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized)
    return unauthorized();

  const tenantId = resolveTenantId(req);

  const { data, error } = await withTenant(
    supabaseAdmin
      .from("intake_form_definitions")
      .select("id, name, fields, settings, is_active, created_at, updated_at")
      .eq("is_active", true),
    tenantId,
  ).maybeSingle();

  if (error)
    return serverError(error.message);

  // DB定義がなければデフォルトを返す
  if (!data) {
    return NextResponse.json({
      ok: true,
      definition: {
        id: null,
        name: "問診フォーム",
        fields: DEFAULT_INTAKE_FIELDS,
        settings: DEFAULT_INTAKE_SETTINGS,
        is_default: true,
      },
    });
  }

  return NextResponse.json({ ok: true, definition: data });
}

// 問診フォーム定義更新
export async function PUT(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized)
    return unauthorized();

  const tenantId = resolveTenantId(req);
  const parsed = await parseBody(req, IntakeFormUpdateSchema);
  if (parsed.error) return parsed.error;

  const { name, fields, settings } = parsed.data;

  // アクティブなレコードを確認
  const { data: existing } = await withTenant(
    supabaseAdmin.from("intake_form_definitions").select("id").eq("is_active", true),
    tenantId,
  ).maybeSingle();

  if (existing) {
    // UPDATE
    const { error } = await withTenant(
      supabaseAdmin
        .from("intake_form_definitions")
        .update({
          ...(name ? { name } : {}),
          fields,
          settings,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id),
      tenantId,
    );

    if (error)
      return serverError(error.message);
  } else {
    // INSERT（新規作成時はアクティブに設定）
    const { error } = await supabaseAdmin
      .from("intake_form_definitions")
      .insert({
        ...tenantPayload(tenantId),
        name: name || "問診フォーム",
        fields,
        settings,
        is_active: true,
      });

    if (error)
      return serverError(error.message);
  }

  return NextResponse.json({ ok: true });
}
