// app/api/admin/tenant-info/route.ts — テナント情報取得API
// ログイン前: テナント名・ロゴのみ返す
// ログイン後: 業種・有効オプション情報も返す
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveTenantId } from "@/lib/tenant";
import { verifyAdminAuth } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  const tenantId = resolveTenantId(req);
  if (!tenantId) {
    return NextResponse.json({
      ok: true,
      name: null,
      logo_url: null,
      industry: "clinic",
      enabledOptions: [],
    });
  }

  const { data } = await supabaseAdmin
    .from("tenants")
    .select("name, logo_url, industry")
    .eq("id", tenantId)
    .maybeSingle();

  // 認証済みの場合のみオプション情報を返す
  const authed = await verifyAdminAuth(req);
  let enabledOptions: string[] = [];
  if (authed) {
    const { data: options } = await supabaseAdmin
      .from("tenant_options")
      .select("option_key")
      .eq("tenant_id", tenantId)
      .eq("is_active", true);
    enabledOptions = (options || []).map((o) => o.option_key);
  }

  return NextResponse.json({
    ok: true,
    name: data?.name ?? null,
    logo_url: data?.logo_url ?? null,
    industry: data?.industry ?? "clinic",
    enabledOptions,
  });
}
