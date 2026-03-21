// 問診フォーム定義 公開API (GET)
// 患者向け — 認証不要、テナント解決のみ
// ?fieldId=xxx で分野別フォームを取得（マルチ分野モード時）
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveTenantIdOrThrow, strictWithTenant } from "@/lib/tenant";
import {
  DEFAULT_INTAKE_FIELDS,
  DEFAULT_INTAKE_SETTINGS,
} from "@/lib/intake-form-defaults";
import { isMultiFieldEnabled } from "@/lib/medical-fields";

const DEFAULT_RESPONSE = {
  fields: DEFAULT_INTAKE_FIELDS,
  settings: DEFAULT_INTAKE_SETTINGS,
};

export async function GET(req: NextRequest) {
  const tenantId = resolveTenantIdOrThrow(req);
  const { searchParams } = new URL(req.url);
  const fieldId = searchParams.get("fieldId");

  const multiField = await isMultiFieldEnabled(tenantId);

  let query = strictWithTenant(
    supabaseAdmin
      .from("intake_form_definitions")
      .select("fields, settings")
      .eq("is_active", true),
    tenantId,
  );

  // マルチ分野モードかつfieldId指定時のみ分野フィルタ
  if (multiField && fieldId) {
    query = query.eq("field_id", fieldId);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    return NextResponse.json(DEFAULT_RESPONSE);
  }

  if (!data) {
    return NextResponse.json(DEFAULT_RESPONSE);
  }

  return NextResponse.json({
    fields: data.fields || DEFAULT_INTAKE_FIELDS,
    settings: data.settings || DEFAULT_INTAKE_SETTINGS,
  });
}
