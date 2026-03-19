// app/api/admin/product-categories/route.ts — 商品カテゴリ（フォルダ）CRUD API
import { NextRequest, NextResponse } from "next/server";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveTenantIdOrThrow, strictWithTenant, tenantPayload } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import {
  productCategoryCreateSchema,
  productCategoryUpdateSchema,
} from "@/lib/validations/admin-operations";

export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);

  const { data, error } = await strictWithTenant(
    supabaseAdmin
      .from("product_categories")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    tenantId,
  );

  if (error) {
    console.error("[product-categories API] select error:", error.message);
    return serverError(error.message);
  }

  return NextResponse.json({ categories: data ?? [] });
}

export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const parsed = await parseBody(req, productCategoryCreateSchema);
  if ("error" in parsed) return parsed.error;

  const { name, parent_id, sort_order } = parsed.data;

  const { data, error } = await supabaseAdmin
    .from("product_categories")
    .insert({
      ...tenantPayload(tenantId),
      name,
      parent_id: parent_id || null,
      sort_order: sort_order ?? 0,
    })
    .select()
    .single();

  if (error) {
    console.error("[product-categories API] insert error:", error.message);
    return serverError(error.message);
  }

  return NextResponse.json({ category: data }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const parsed = await parseBody(req, productCategoryUpdateSchema);
  if ("error" in parsed) return parsed.error;

  const { id, ...updates } = parsed.data;
  updates.updated_at = new Date().toISOString();

  const { data, error } = await strictWithTenant(
    supabaseAdmin.from("product_categories").update(updates),
    tenantId,
  )
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[product-categories API] update error:", error.message);
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

  // CASCADE: 子カテゴリも自動削除。配下商品のcategory_idはNULLに（ON DELETE SET NULL）
  const { error } = await strictWithTenant(
    supabaseAdmin.from("product_categories").delete(),
    tenantId,
  ).eq("id", id);

  if (error) {
    console.error("[product-categories API] delete error:", error.message);
    return serverError(error.message);
  }

  return NextResponse.json({ success: true });
}
