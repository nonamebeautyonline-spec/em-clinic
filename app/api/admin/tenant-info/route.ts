// app/api/admin/tenant-info/route.ts — ログイン前にテナント名を返す軽量API
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveTenantId } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  const tenantId = resolveTenantId(req);
  if (!tenantId) {
    return NextResponse.json({ ok: true, name: null, logo_url: null });
  }

  const { data } = await supabaseAdmin
    .from("tenants")
    .select("name, logo_url")
    .eq("id", tenantId)
    .maybeSingle();

  return NextResponse.json({
    ok: true,
    name: data?.name ?? null,
    logo_url: data?.logo_url ?? null,
  });
}
