// app/api/admin/treatment-categories/route.ts — 施術カテゴリ CRUD API
import { NextRequest, NextResponse } from "next/server";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveTenantIdOrThrow, strictWithTenant, tenantPayload } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);

  const { data, error } = await strictWithTenant(
    supabaseAdmin
      .from("treatment_categories")
      .select("*")
      .order("sort_order", { ascending: true }),
    tenantId,
  );

  if (error) {
    console.error("[treatment-categories API] GET error:", error.message);
    return serverError(error.message);
  }

  return NextResponse.json({ categories: data });
}

export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return badRequest("リクエストの形式が不正です");
  }

  const { name, sort_order } = body as { name?: string; sort_order?: number };
  if (!name) return badRequest("name は必須です");

  const { data, error } = await supabaseAdmin
    .from("treatment_categories")
    .insert({
      ...tenantPayload(tenantId),
      name,
      sort_order: sort_order ?? 0,
    })
    .select()
    .single();

  if (error) {
    console.error("[treatment-categories API] POST error:", error.message);
    return serverError(error.message);
  }

  return NextResponse.json({ category: data }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return badRequest("リクエストの形式が不正です");
  }

  const { id, name, sort_order } = body as { id?: string; name?: string; sort_order?: number };
  if (!id) return badRequest("id は必須です");

  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (sort_order !== undefined) updates.sort_order = sort_order;

  const { data, error } = await strictWithTenant(
    supabaseAdmin.from("treatment_categories").update(updates),
    tenantId,
  )
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[treatment-categories API] PUT error:", error.message);
    return serverError(error.message);
  }

  return NextResponse.json({ category: data });
}

export async function DELETE(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return badRequest("id は必須です");

  // 物理削除
  const { error } = await strictWithTenant(
    supabaseAdmin.from("treatment_categories").delete(),
    tenantId,
  ).eq("id", id);

  if (error) {
    console.error("[treatment-categories API] DELETE error:", error.message);
    return serverError(error.message);
  }

  return NextResponse.json({ success: true });
}
