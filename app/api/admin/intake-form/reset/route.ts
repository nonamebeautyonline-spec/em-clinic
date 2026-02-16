// 問診フォーム定義リセットAPI (POST)
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant } from "@/lib/tenant";
import {
  DEFAULT_INTAKE_FIELDS,
  DEFAULT_INTAKE_SETTINGS,
} from "@/lib/intake-form-defaults";

export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);

  // 既存レコードを確認
  const { data: existing } = await withTenant(
    supabaseAdmin.from("intake_form_definitions").select("id"),
    tenantId,
  ).maybeSingle();

  if (existing) {
    const { error } = await supabaseAdmin
      .from("intake_form_definitions")
      .update({
        fields: DEFAULT_INTAKE_FIELDS,
        settings: DEFAULT_INTAKE_SETTINGS,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    fields: DEFAULT_INTAKE_FIELDS,
    settings: DEFAULT_INTAKE_SETTINGS,
  });
}
