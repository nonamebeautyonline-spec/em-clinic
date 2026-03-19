// app/api/admin/products/route.ts — 商品 CRUD API
import { NextRequest, NextResponse } from "next/server";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { getAllProducts } from "@/lib/products";
import { resolveTenantIdOrThrow, strictWithTenant, tenantPayload } from "@/lib/tenant";
import { checkInventoryAlerts } from "@/lib/inventory-alert";
import { parseBody } from "@/lib/validations/helpers";
import { productCreateSchema, productUpdateSchema } from "@/lib/validations/admin-operations";

export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) {
    return unauthorized();
  }

  const tenantId = resolveTenantIdOrThrow(req);
  // productsテーブルは lib/products.ts 経由で既にテナント対応済み
  const products = await getAllProducts(tenantId ?? undefined);
  return NextResponse.json({ products });
}

export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) {
    return unauthorized();
  }

  const tenantId = resolveTenantIdOrThrow(req);
  const parsed = await parseBody(req, productCreateSchema);
  if ("error" in parsed) return parsed.error;
  const {
    code, title, drug_name, dosage, duration_months, quantity, price,
    category, category_id, sort_order, image_url, stock_quantity, discount_price,
    discount_until, description, parent_id,
    stock_alert_threshold, stock_alert_enabled,
  } = parsed.data;

  const { data, error } = await supabaseAdmin
    .from("products")
    .insert({
      ...tenantPayload(tenantId),
      code,
      title,
      drug_name: drug_name || "マンジャロ",
      dosage: dosage || null,
      duration_months: duration_months || null,
      quantity: quantity || null,
      price,
      category: category || "injection",
      category_id: category_id || null,
      sort_order: sort_order || 0,
      is_active: true,
      image_url: image_url || null,
      stock_quantity: stock_quantity ?? null,
      discount_price: discount_price ?? null,
      discount_until: discount_until || null,
      description: description || null,
      parent_id: parent_id || null,
      stock_alert_threshold: stock_alert_threshold ?? null,
      stock_alert_enabled: stock_alert_enabled ?? false,
    })
    .select()
    .single();

  if (error) {
    console.error("[products API] insert error:", error.message);
    return serverError(error.message);
  }

  // 在庫アラートチェック（非同期、エラーは無視）
  checkInventoryAlerts(tenantId).catch(() => {});

  return NextResponse.json({ product: data }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) {
    return unauthorized();
  }

  const tenantId = resolveTenantIdOrThrow(req);
  const parsed = await parseBody(req, productUpdateSchema);
  if ("error" in parsed) return parsed.error;
  const { id, ...updates } = parsed.data;

  updates.updated_at = new Date().toISOString();

  const { data, error } = await strictWithTenant(
    supabaseAdmin.from("products").update(updates), tenantId
  ).eq("id", id).select().single();

  if (error) {
    console.error("[products API] update error:", error.message);
    return serverError(error.message);
  }

  // 在庫アラートチェック（非同期、エラーは無視）
  checkInventoryAlerts(tenantId).catch(() => {});

  return NextResponse.json({ product: data });
}

export async function DELETE(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) {
    return unauthorized();
  }

  const tenantId = resolveTenantIdOrThrow(req);
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return badRequest("id は必須です");
  }

  // 物理削除ではなく無効化
  const { error } = await strictWithTenant(
    supabaseAdmin.from("products").update({ is_active: false, updated_at: new Date().toISOString() }), tenantId
  ).eq("id", id);

  if (error) {
    console.error("[products API] deactivate error:", error.message);
    return serverError(error.message);
  }

  return NextResponse.json({ success: true });
}
