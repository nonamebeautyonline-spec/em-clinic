// app/api/admin/treatments/route.ts — 施術メニュー CRUD API
import { NextRequest, NextResponse } from "next/server";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveTenantIdOrThrow, strictWithTenant, tenantPayload } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);

  // カテゴリ付きメニュー一覧を取得
  const { data, error } = await strictWithTenant(
    supabaseAdmin
      .from("treatment_menus")
      .select("*, treatment_categories(id, name)")
      .order("sort_order", { ascending: true }),
    tenantId,
  );

  if (error) {
    console.error("[treatments API] GET error:", error.message);
    return serverError(error.message);
  }

  return NextResponse.json({ menus: data });
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

  const { name, category_id, duration_min, price, description, photo_url, sort_order } = body as {
    name?: string;
    category_id?: string;
    duration_min?: number;
    price?: number;
    description?: string;
    photo_url?: string;
    sort_order?: number;
  };

  if (!name) return badRequest("name は必須です");

  const { data, error } = await supabaseAdmin
    .from("treatment_menus")
    .insert({
      ...tenantPayload(tenantId),
      name,
      category_id: category_id || null,
      duration_min: duration_min ?? null,
      price: price ?? 0,
      description: description || null,
      photo_url: photo_url || null,
      is_active: true,
      sort_order: sort_order ?? 0,
    })
    .select("*, treatment_categories(id, name)")
    .single();

  if (error) {
    console.error("[treatments API] POST error:", error.message);
    return serverError(error.message);
  }

  return NextResponse.json({ menu: data }, { status: 201 });
}
