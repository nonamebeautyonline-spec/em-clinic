// app/api/admin/ec-integrations/route.ts — EC連携設定 一覧取得・新規追加
import { NextRequest, NextResponse } from "next/server";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveTenantIdOrThrow, tenantPayload } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);

  const { data, error } = await supabaseAdmin
    .from("ec_integrations")
    .select("id, platform, shop_domain, is_active, last_synced_at, created_at, updated_at")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("ec_integrations GET error:", error);
    return serverError("連携設定の取得に失敗しました");
  }

  return NextResponse.json({ ok: true, integrations: data ?? [] });
}

export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const body = await req.json();
  const { platform, shop_domain, api_key } = body;

  if (!platform || !shop_domain) {
    return badRequest("プラットフォームとショップドメインは必須です");
  }

  // 同一テナント・同一プラットフォームの重複チェック
  const { data: existing } = await supabaseAdmin
    .from("ec_integrations")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("platform", platform)
    .limit(1)
    .single();

  if (existing) {
    return badRequest(`${platform}の連携は既に登録されています`);
  }

  const { data, error } = await supabaseAdmin
    .from("ec_integrations")
    .insert({
      ...tenantPayload(tenantId),
      platform,
      shop_domain,
      api_key_encrypted: api_key || null,
      is_active: true,
    })
    .select("id, platform, shop_domain, is_active, last_synced_at, created_at, updated_at")
    .single();

  if (error) {
    console.error("ec_integrations POST error:", error);
    return serverError("連携設定の追加に失敗しました");
  }

  return NextResponse.json({ ok: true, integration: data });
}
