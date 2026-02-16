// 問診フォーム定義 公開API (GET)
// 患者向け — 認証不要、テナント解決のみ
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveTenantId, withTenant } from "@/lib/tenant";
import {
  DEFAULT_INTAKE_FIELDS,
  DEFAULT_INTAKE_SETTINGS,
} from "@/lib/intake-form-defaults";

export async function GET(req: NextRequest) {
  const tenantId = resolveTenantId(req);

  const { data, error } = await withTenant(
    supabaseAdmin
      .from("intake_form_definitions")
      .select("fields, settings"),
    tenantId,
  ).maybeSingle();

  if (error) {
    // DBエラー時もデフォルトで動作させる
    return NextResponse.json({
      fields: DEFAULT_INTAKE_FIELDS,
      settings: DEFAULT_INTAKE_SETTINGS,
    });
  }

  if (!data) {
    return NextResponse.json({
      fields: DEFAULT_INTAKE_FIELDS,
      settings: DEFAULT_INTAKE_SETTINGS,
    });
  }

  return NextResponse.json({
    fields: data.fields || DEFAULT_INTAKE_FIELDS,
    settings: data.settings || DEFAULT_INTAKE_SETTINGS,
  });
}
