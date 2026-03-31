// app/api/admin/stylists/[stylistId]/route.ts — スタイリスト個別 更新/論理削除 API
import { NextRequest, NextResponse } from "next/server";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveTenantIdOrThrow, strictWithTenant } from "@/lib/tenant";

type Params = { params: Promise<{ stylistId: string }> };

// PUT: スタイリスト更新
export async function PUT(req: NextRequest, { params }: Params) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  try {
    const tenantId = resolveTenantIdOrThrow(req);
    const { stylistId } = await params;
    const body = await req.json();
    const { name, display_name, photo_url, specialties, sort_order, is_active } = body;

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (name !== undefined) updates.name = name;
    if (display_name !== undefined) updates.display_name = display_name || null;
    if (photo_url !== undefined) updates.photo_url = photo_url || null;
    if (specialties !== undefined) updates.specialties = specialties;
    if (sort_order !== undefined) updates.sort_order = sort_order;
    if (is_active !== undefined) updates.is_active = is_active;

    const { data, error } = await strictWithTenant(
      supabaseAdmin.from("stylists").update(updates), tenantId
    ).eq("id", stylistId).select("*, stylist_shifts(*)").single();

    if (error) throw error;
    return NextResponse.json({ ok: true, stylist: data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "不明なエラー";
    console.error("[stylists API] PUT error:", msg);
    return serverError(msg);
  }
}

// DELETE: 論理削除（is_active = false）
export async function DELETE(req: NextRequest, { params }: Params) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  try {
    const tenantId = resolveTenantIdOrThrow(req);
    const { stylistId } = await params;

    const { error } = await strictWithTenant(
      supabaseAdmin.from("stylists").update({
        is_active: false,
        updated_at: new Date().toISOString(),
      }), tenantId
    ).eq("id", stylistId);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "不明なエラー";
    console.error("[stylists API] DELETE error:", msg);
    return serverError(msg);
  }
}
