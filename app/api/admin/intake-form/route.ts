// 問診フォーム定義 管理API (GET / PUT)
// ?fieldId=xxx で分野別フォームを取得・更新（マルチ分野モード時）
import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow, strictWithTenant, tenantPayload } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { IntakeFormUpdateSchema } from "@/lib/validations/intake-form";
import {
  DEFAULT_INTAKE_FIELDS,
  DEFAULT_INTAKE_SETTINGS,
} from "@/lib/intake-form-defaults";
import { logAudit } from "@/lib/audit";
import { isMultiFieldEnabled } from "@/lib/medical-fields";

// 問診フォーム定義取得
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized)
    return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const { searchParams } = new URL(req.url);
  const fieldId = searchParams.get("fieldId");
  const templateId = searchParams.get("id");
  const multiField = await isMultiFieldEnabled(tenantId);

  let query = strictWithTenant(
    supabaseAdmin
      .from("intake_form_definitions")
      .select("id, name, fields, settings, is_active, field_id, created_at, updated_at"),
    tenantId,
  );

  if (templateId) {
    // ID指定: 特定テンプレートを取得（一覧からの編集用）
    query = query.eq("id", templateId);
  } else {
    // デフォルト: アクティブなテンプレートを取得
    query = query.eq("is_active", true);
    if (multiField && fieldId) {
      query = query.eq("field_id", fieldId);
    }
  }

  const { data, error } = await query.maybeSingle();

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
        field_id: fieldId || null,
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

  const tenantId = resolveTenantIdOrThrow(req);
  const parsed = await parseBody(req, IntakeFormUpdateSchema);
  if (parsed.error) return parsed.error;

  const { name, fields, settings } = parsed.data;

  // field_id, id はリクエストボディから取得（Zodスキーマ外なのでraw bodyから）
  let fieldId: string | null = null;
  let targetId: string | null = null;
  try {
    const rawBody = await req.clone().json();
    fieldId = rawBody.field_id || null;
    targetId = rawBody.id || null;
  } catch { /* ignore */ }

  const multiField = await isMultiFieldEnabled(tenantId);

  if (targetId) {
    // ID指定: 特定テンプレートを更新（一覧からの編集用）
    const { error } = await strictWithTenant(
      supabaseAdmin
        .from("intake_form_definitions")
        .update({
          ...(name ? { name } : {}),
          fields,
          settings,
          updated_at: new Date().toISOString(),
        })
        .eq("id", targetId),
      tenantId,
    );

    if (error)
      return serverError(error.message);
  } else {
    // アクティブなレコードを確認（分野フィルタ付き）
    let existingQuery = strictWithTenant(
      supabaseAdmin.from("intake_form_definitions").select("id").eq("is_active", true),
      tenantId,
    );
    if (multiField && fieldId) {
      existingQuery = existingQuery.eq("field_id", fieldId);
    }
    const { data: existing } = await existingQuery.maybeSingle();

    if (existing) {
      // UPDATE
      const { error } = await strictWithTenant(
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
          field_id: fieldId,
        });

      if (error)
        return serverError(error.message);
    }
  }

  logAudit(req, "intake_form.update", "intake_form", targetId ?? "unknown");
  return NextResponse.json({ ok: true });
}
