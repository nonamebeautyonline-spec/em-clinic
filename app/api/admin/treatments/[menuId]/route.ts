// app/api/admin/treatments/[menuId]/route.ts — 施術メニュー個別 更新/論理削除
import { NextRequest, NextResponse } from "next/server";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveTenantIdOrThrow, strictWithTenant } from "@/lib/tenant";

type Params = { params: Promise<{ menuId: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const { menuId } = await params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return badRequest("リクエストの形式が不正です");
  }

  // 更新可能なフィールドだけ抽出
  const allowedFields = [
    "name", "category_id", "duration_min", "price",
    "description", "photo_url", "is_active", "sort_order",
  ];
  const updates: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (key in body) updates[key] = body[key];
  }
  updates.updated_at = new Date().toISOString();

  const { data, error } = await strictWithTenant(
    supabaseAdmin.from("treatment_menus").update(updates),
    tenantId,
  )
    .eq("id", menuId)
    .select("*, treatment_categories(id, name)")
    .single();

  if (error) {
    console.error("[treatments API] PUT error:", error.message);
    return serverError(error.message);
  }

  return NextResponse.json({ menu: data });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const { menuId } = await params;

  // 論理削除: is_active = false
  const { error } = await strictWithTenant(
    supabaseAdmin
      .from("treatment_menus")
      .update({ is_active: false, updated_at: new Date().toISOString() }),
    tenantId,
  ).eq("id", menuId);

  if (error) {
    console.error("[treatments API] DELETE error:", error.message);
    return serverError(error.message);
  }

  return NextResponse.json({ success: true });
}
