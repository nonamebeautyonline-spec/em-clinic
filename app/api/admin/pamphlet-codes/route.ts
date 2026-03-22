// パンフレットコード管理API（管理者用）
import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized, badRequest } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow, strictWithTenant, tenantPayload } from "@/lib/tenant";
import { logAudit } from "@/lib/audit";

// ===== GET — 一覧取得 =====
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);

  const { data, error } = await strictWithTenant(
    supabaseAdmin
      .from("pamphlet_codes")
      .select("*")
      .order("created_at", { ascending: false }),
    tenantId,
  );

  if (error) return serverError(error.message);
  return NextResponse.json({ items: data || [] });
}

// ===== POST — 新規作成 =====
export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);

  const body = (await req.json()) as {
    code?: string;
    label?: string;
    expires_at?: string | null;
  };

  if (!body.code || body.code.trim().length === 0) {
    return badRequest("コードは必須です");
  }

  // 重複チェック
  const { data: existing } = await strictWithTenant(
    supabaseAdmin
      .from("pamphlet_codes")
      .select("id")
      .eq("code", body.code.trim()),
    tenantId,
  );
  if (existing && existing.length > 0) {
    return badRequest("このコードは既に存在します");
  }

  const { data, error } = await supabaseAdmin
    .from("pamphlet_codes")
    .insert({
      ...tenantPayload(tenantId),
      code: body.code.trim(),
      label: (body.label || "").trim(),
      expires_at: body.expires_at || null,
    })
    .select()
    .single();

  if (error) return serverError(error.message);
  logAudit(req, "pamphlet_code.create", "pamphlet_codes", String(data.id));

  return NextResponse.json({ item: data });
}

// ===== DELETE — 削除 =====
export async function DELETE(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) return badRequest("IDは必須です");

  const { error } = await strictWithTenant(
    supabaseAdmin
      .from("pamphlet_codes")
      .delete()
      .eq("id", Number(id)),
    tenantId,
  );

  if (error) return serverError(error.message);
  logAudit(req, "pamphlet_code.delete", "pamphlet_codes", id);

  return NextResponse.json({ ok: true });
}

// ===== PATCH — 有効/無効切替 =====
export async function PATCH(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const body = (await req.json()) as { id: number; is_active?: boolean };

  if (!body.id) return badRequest("IDは必須です");

  const { data, error } = await strictWithTenant(
    supabaseAdmin
      .from("pamphlet_codes")
      .update({ is_active: body.is_active ?? false, updated_at: new Date().toISOString() })
      .eq("id", body.id),
    tenantId,
  ).select().single();

  if (error) return serverError(error.message);
  logAudit(req, "pamphlet_code.update", "pamphlet_codes", String(body.id));

  return NextResponse.json({ item: data });
}
