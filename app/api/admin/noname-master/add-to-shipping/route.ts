import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant } from "@/lib/tenant";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  try {
    // 認証チェック（クッキーまたはBearerトークン）
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = resolveTenantId(req);

    const body = await req.json();
    const { order_id } = body;

    if (!order_id) {
      return NextResponse.json({ error: "order_id is required" }, { status: 400 });
    }

    // 現在時刻
    const now = new Date().toISOString();

    // 注文を更新（shipping_list_created_atを設定、shipping_dateはNULLのまま）
    const { data, error } = await withTenant(
      supabase
        .from("orders")
        .update({
          shipping_list_created_at: now,
          updated_at: now,
        })
        .eq("id", order_id)
        .select("id, shipping_date, shipping_list_created_at"),
      tenantId
    );

    if (error) {
      console.error("[AddToShipping] Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    console.log(`[AddToShipping] ✅ Added order ${order_id} to today's shipping list`);

    return NextResponse.json({
      success: true,
      order: data[0],
    });
  } catch (error) {
    console.error("[AddToShipping] API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}
