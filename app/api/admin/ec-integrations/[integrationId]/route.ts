// app/api/admin/ec-integrations/[integrationId]/route.ts — EC連携設定 更新・削除
import { NextRequest, NextResponse } from "next/server";
import { badRequest, notFound, serverError, unauthorized } from "@/lib/api-error";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveTenantIdOrThrow } from "@/lib/tenant";

type RouteContext = { params: Promise<{ integrationId: string }> };

export async function PUT(req: NextRequest, ctx: RouteContext) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const { integrationId } = await ctx.params;
  const body = await req.json();

  // 更新可能フィールドのみ抽出
  const updates: Record<string, unknown> = {};
  if (body.shop_domain !== undefined) updates.shop_domain = body.shop_domain;
  if (body.api_key !== undefined) updates.api_key_encrypted = body.api_key;
  if (body.is_active !== undefined) updates.is_active = body.is_active;
  if (body.webhook_secret !== undefined) updates.webhook_secret = body.webhook_secret;
  updates.updated_at = new Date().toISOString();

  if (Object.keys(updates).length <= 1) {
    return badRequest("更新するフィールドを指定してください");
  }

  const { data, error } = await supabaseAdmin
    .from("ec_integrations")
    .update(updates)
    .eq("id", integrationId)
    .eq("tenant_id", tenantId)
    .select("id, platform, shop_domain, is_active, last_synced_at, created_at, updated_at")
    .single();

  if (error) {
    console.error("ec_integrations PUT error:", error);
    return serverError("連携設定の更新に失敗しました");
  }

  if (!data) return notFound("連携設定が見つかりません");

  return NextResponse.json({ ok: true, integration: data });
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const { integrationId } = await ctx.params;

  const { error } = await supabaseAdmin
    .from("ec_integrations")
    .delete()
    .eq("id", integrationId)
    .eq("tenant_id", tenantId);

  if (error) {
    console.error("ec_integrations DELETE error:", error);
    return serverError("連携設定の削除に失敗しました");
  }

  return NextResponse.json({ ok: true });
}
