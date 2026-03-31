// app/api/admin/webhooks/outgoing/route.ts — アウトゴーイングWebhook CRUD
import { NextRequest, NextResponse } from "next/server";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveTenantIdOrThrow, tenantPayload } from "@/lib/tenant";

// アウトゴーイングWebhook一覧取得
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);

  const { data, error } = await supabaseAdmin
    .from("outgoing_webhooks")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[outgoing-webhooks] GET error:", error);
    return serverError("Webhook一覧の取得に失敗しました");
  }

  return NextResponse.json({ ok: true, webhooks: data ?? [] });
}

// アウトゴーイングWebhook作成
export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const body = await req.json();
  const { name, url, event_types, secret } = body;

  if (!name || !url || !event_types || !Array.isArray(event_types) || event_types.length === 0) {
    return badRequest("名前・URL・イベントタイプ（配列）は必須です");
  }

  // URLの簡易バリデーション
  try {
    new URL(url);
  } catch {
    return badRequest("有効なURLを入力してください");
  }

  const { data, error } = await supabaseAdmin
    .from("outgoing_webhooks")
    .insert({
      ...tenantPayload(tenantId),
      name: name.trim(),
      url,
      event_types,
      secret: secret || null,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    console.error("[outgoing-webhooks] POST error:", error);
    return serverError("Webhookの作成に失敗しました");
  }

  return NextResponse.json({ ok: true, webhook: data });
}

// アウトゴーイングWebhook更新
export async function PUT(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const body = await req.json();
  const { id, name, url, event_types, secret, is_active } = body;

  if (!id) {
    return badRequest("IDは必須です");
  }

  // URLが指定されている場合はバリデーション
  if (url !== undefined) {
    try {
      new URL(url);
    } catch {
      return badRequest("有効なURLを入力してください");
    }
  }

  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name.trim();
  if (url !== undefined) updates.url = url;
  if (event_types !== undefined) updates.event_types = event_types;
  if (secret !== undefined) updates.secret = secret || null;
  if (is_active !== undefined) updates.is_active = is_active;

  const { data, error } = await supabaseAdmin
    .from("outgoing_webhooks")
    .update(updates)
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .select()
    .single();

  if (error) {
    console.error("[outgoing-webhooks] PUT error:", error);
    return serverError("Webhookの更新に失敗しました");
  }

  return NextResponse.json({ ok: true, webhook: data });
}

// アウトゴーイングWebhook削除
export async function DELETE(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return badRequest("IDは必須です");
  }

  const { error } = await supabaseAdmin
    .from("outgoing_webhooks")
    .delete()
    .eq("id", id)
    .eq("tenant_id", tenantId);

  if (error) {
    console.error("[outgoing-webhooks] DELETE error:", error);
    return serverError("Webhookの削除に失敗しました");
  }

  return NextResponse.json({ ok: true });
}
