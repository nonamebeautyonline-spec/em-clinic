import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyAdminAuth } from "@/lib/admin-auth";

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

    const body = await req.json();
    const { order_id } = body;

    if (!order_id) {
      return NextResponse.json({ error: "order_id is required" }, { status: 400 });
    }

    // 現在時刻
    const now = new Date().toISOString();

    // 注文を更新:
    // - tracking_number を NULL
    // - shipping_date を NULL
    // - shipping_list_created_at を今日（発送リストに追加）
    const { data, error } = await supabase
      .from("orders")
      .update({
        tracking_number: null,
        shipping_date: null,
        shipping_list_created_at: now,
        updated_at: now,
      })
      .eq("id", order_id)
      .select("id, tracking_number, shipping_date, shipping_list_created_at");

    if (error) {
      console.error("[RecreateLabel] Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    console.log(`[RecreateLabel] ✅ Reset shipping info for order ${order_id} and added to shipping list`);

    return NextResponse.json({
      success: true,
      order: data[0],
    });
  } catch (error) {
    console.error("[RecreateLabel] API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}
