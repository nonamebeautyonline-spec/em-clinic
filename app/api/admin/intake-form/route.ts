// 問診フォーム定義 管理API (GET / PUT)
import { NextRequest, NextResponse } from "next/server";
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
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);

  const { data, error } = await withTenant(
    supabaseAdmin
      .from("intake_form_definitions")
      .select("id, name, fields, settings, created_at, updated_at"),
    tenantId,
  ).maybeSingle();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

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
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);
  const parsed = await parseBody(req, IntakeFormUpdateSchema);
  if (parsed.error) return parsed.error;

  const { name, fields, settings } = parsed.data;

  // 既存レコードを確認
  const { data: existing } = await withTenant(
    supabaseAdmin.from("intake_form_definitions").select("id"),
    tenantId,
  ).maybeSingle();

  if (existing) {
    // UPDATE
    const { error } = await supabaseAdmin
      .from("intake_form_definitions")
      .update({
        ...(name ? { name } : {}),
        fields,
        settings,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    // INSERT
    const { error } = await supabaseAdmin
      .from("intake_form_definitions")
      .insert({
        ...tenantPayload(tenantId),
        name: name || "問診フォーム",
        fields,
        settings,
      });

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
