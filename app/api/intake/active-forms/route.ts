// 患者向け: 有効な問診フォーム一覧 (GET)
// 認証不要、テナント解決のみ
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveTenantIdOrThrow, strictWithTenant } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  const tenantId = resolveTenantIdOrThrow(req);

  const { data, error } = await strictWithTenant(
    supabaseAdmin
      .from("intake_form_definitions")
      .select("id, name")
      .eq("is_active", true)
      .order("created_at", { ascending: true }),
    tenantId,
  );

  if (error) {
    return NextResponse.json({ forms: [] });
  }

  return NextResponse.json({ forms: data || [] });
}
