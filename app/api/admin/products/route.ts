// app/api/admin/products/route.ts — 商品 CRUD API
import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { getAllProducts } from "@/lib/products";

export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const products = await getAllProducts();
  return NextResponse.json({ products });
}

export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const {
    code, title, drug_name, dosage, duration_months, quantity, price,
    category, sort_order, image_url, stock_quantity, discount_price,
    discount_until, description, parent_id,
  } = body;

  if (!code || !title || !price) {
    return NextResponse.json({ error: "code, title, price は必須です" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("products")
    .insert({
      code,
      title,
      drug_name: drug_name || "マンジャロ",
      dosage: dosage || null,
      duration_months: duration_months || null,
      quantity: quantity || null,
      price,
      category: category || "injection",
      sort_order: sort_order || 0,
      is_active: true,
      tenant_id: null,
      image_url: image_url || null,
      stock_quantity: stock_quantity ?? null,
      discount_price: discount_price ?? null,
      discount_until: discount_until || null,
      description: description || null,
      parent_id: parent_id || null,
    })
    .select()
    .single();

  if (error) {
    console.error("[products API] insert error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ product: data }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: "id は必須です" }, { status: 400 });
  }

  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("products")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[products API] update error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ product: data });
}

export async function DELETE(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id は必須です" }, { status: 400 });
  }

  // 物理削除ではなく無効化
  const { error } = await supabaseAdmin
    .from("products")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("[products API] deactivate error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
