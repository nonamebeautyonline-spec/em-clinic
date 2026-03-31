// app/api/admin/salon-visits/[visitId]/route.ts — 施術カルテ個別 更新/削除
import { NextRequest, NextResponse } from "next/server";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveTenantIdOrThrow, strictWithTenant } from "@/lib/tenant";

type Params = { params: Promise<{ visitId: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const { visitId } = await params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return badRequest("リクエストの形式が不正です");
  }

  // 更新可能フィールド
  const allowedFields = [
    "patient_id", "stylist_id", "visit_date", "menu_items",
    "total_amount", "payment_method", "notes", "photo_urls",
  ];
  const updates: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (key in body) updates[key] = body[key];
  }
  updates.updated_at = new Date().toISOString();

  const { data, error } = await strictWithTenant(
    supabaseAdmin.from("salon_visits").update(updates),
    tenantId,
  )
    .eq("id", visitId)
    .select("*, patients(id, name), stylists(id, name)")
    .single();

  if (error) {
    console.error("[salon-visits API] PUT error:", error.message);
    return serverError(error.message);
  }

  return NextResponse.json({ visit: data });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const { visitId } = await params;

  // 物理削除
  const { error } = await strictWithTenant(
    supabaseAdmin.from("salon_visits").delete(),
    tenantId,
  ).eq("id", visitId);

  if (error) {
    console.error("[salon-visits API] DELETE error:", error.message);
    return serverError(error.message);
  }

  return NextResponse.json({ success: true });
}
