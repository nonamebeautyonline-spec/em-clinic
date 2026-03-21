// 問診フォーム定義 公開API (GET)
// 患者向け — 認証不要、テナント解決のみ
// ?templateId=xxx でテンプレートID指定取得
// ?fieldId=xxx で分野別フォームを取得（マルチ分野モード時・後方互換）
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
  const templateId = searchParams.get("templateId");
  const fieldId = searchParams.get("fieldId");

  let query = strictWithTenant(
    supabaseAdmin
      .from("intake_form_definitions")
      .select("id, fields, settings"),
    tenantId,
  );

  if (templateId) {
    // テンプレートID指定（問診フォーム選択画面から）
    query = query.eq("id", templateId).eq("is_active", true);
  } else {
    // 従来の方式: アクティブなフォームを取得
    query = query.eq("is_active", true);
    const multiField = await isMultiFieldEnabled(tenantId);
    if (multiField && fieldId) {
      query = query.eq("field_id", fieldId);
    }
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    return NextResponse.json(DEFAULT_RESPONSE);
  }

  if (!data) {
    return NextResponse.json(DEFAULT_RESPONSE);
  }

  return NextResponse.json({
    templateId: data.id,
    fields: data.fields || DEFAULT_INTAKE_FIELDS,
    settings: data.settings || DEFAULT_INTAKE_SETTINGS,
  });
}
