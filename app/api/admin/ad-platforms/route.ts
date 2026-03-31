// app/api/admin/ad-platforms/route.ts — 広告プラットフォーム連携 CRUD
import { NextRequest, NextResponse } from "next/server";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveTenantIdOrThrow, tenantPayload } from "@/lib/tenant";

const VALID_PLATFORMS = ["meta", "google", "tiktok", "x"] as const;

// シークレット値をマスク（先頭4文字 + 末尾4文字のみ表示）
function maskSecret(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value.length <= 8) return "****";
  return `${value.slice(0, 4)}****${value.slice(-4)}`;
}

// config内のシークレット値をマスク
function maskConfig(config: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!config) return null;
  const masked: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(config)) {
    // キー名にsecret/key/tokenを含む値をマスク
    if (
      typeof val === "string" &&
      /secret|key|token|password|credential/i.test(key)
    ) {
      masked[key] = maskSecret(val);
    } else {
      masked[key] = val;
    }
  }
  return masked;
}

// 広告プラットフォーム一覧取得（config内シークレットはマスク）
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);

  const { data, error } = await supabaseAdmin
    .from("ad_platforms")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[ad-platforms] GET error:", error);
    return serverError("広告プラットフォームの取得に失敗しました");
  }

  // configのシークレットをマスクして返す
  const platforms = (data ?? []).map((p) => ({
    ...p,
    config: maskConfig(p.config),
  }));

  return NextResponse.json({ ok: true, platforms });
}

// 広告プラットフォーム作成
export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const body = await req.json();
  const { name, display_name, config } = body;

  if (!name || !display_name) {
    return badRequest("プラットフォーム名と表示名は必須です");
  }

  if (!VALID_PLATFORMS.includes(name)) {
    return badRequest(`プラットフォームは ${VALID_PLATFORMS.join(", ")} のいずれかを指定してください`);
  }

  // 同一テナント・同一プラットフォームの重複チェック
  const { data: existing } = await supabaseAdmin
    .from("ad_platforms")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("name", name)
    .limit(1)
    .single();

  if (existing) {
    return badRequest(`${name}の連携は既に登録されています`);
  }

  const { data, error } = await supabaseAdmin
    .from("ad_platforms")
    .insert({
      ...tenantPayload(tenantId),
      name,
      display_name: display_name.trim(),
      config: config || {},
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    console.error("[ad-platforms] POST error:", error);
    return serverError("広告プラットフォームの作成に失敗しました");
  }

  return NextResponse.json({ ok: true, platform: { ...data, config: maskConfig(data.config) } });
}

// 広告プラットフォーム更新
export async function PUT(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const body = await req.json();
  const { id, display_name, config, is_active } = body;

  if (!id) {
    return badRequest("IDは必須です");
  }

  const updates: Record<string, unknown> = {};
  if (display_name !== undefined) updates.display_name = display_name.trim();
  if (config !== undefined) updates.config = config;
  if (is_active !== undefined) updates.is_active = is_active;

  const { data, error } = await supabaseAdmin
    .from("ad_platforms")
    .update(updates)
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .select()
    .single();

  if (error) {
    console.error("[ad-platforms] PUT error:", error);
    return serverError("広告プラットフォームの更新に失敗しました");
  }

  return NextResponse.json({ ok: true, platform: { ...data, config: maskConfig(data.config) } });
}

// 広告プラットフォーム削除
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
    .from("ad_platforms")
    .delete()
    .eq("id", id)
    .eq("tenant_id", tenantId);

  if (error) {
    console.error("[ad-platforms] DELETE error:", error);
    return serverError("広告プラットフォームの削除に失敗しました");
  }

  return NextResponse.json({ ok: true });
}
