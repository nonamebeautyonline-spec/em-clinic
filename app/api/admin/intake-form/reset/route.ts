// 問診フォーム定義リセットAPI (POST)
import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow, strictWithTenant } from "@/lib/tenant";
import {
  DEFAULT_INTAKE_FIELDS,
  DEFAULT_INTAKE_SETTINGS,
} from "@/lib/intake-form-defaults";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized)
    return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);

  // アクティブなレコードを確認
  const { data: existing } = await strictWithTenant(
    supabaseAdmin.from("intake_form_definitions").select("id").eq("is_active", true),
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
      return serverError(error.message);
  }

  logAudit(req, "intake_form.reset", "intake_form", existing?.id ?? "unknown");
  return NextResponse.json({
    ok: true,
    fields: DEFAULT_INTAKE_FIELDS,
    settings: DEFAULT_INTAKE_SETTINGS,
  });
}
