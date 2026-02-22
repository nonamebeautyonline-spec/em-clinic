import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { recreateLabelSchema } from "@/lib/validations/shipping";

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

    const parsed = await parseBody(req, recreateLabelSchema);
    if ("error" in parsed) return parsed.error;
    const { order_id } = parsed.data;

    // 現在時刻
    const now = new Date().toISOString();

    // 注文を更新:
    // - tracking_number を NULL
    // - shipping_date を NULL
    // - shipping_list_created_at を NULL（pending画面でチェック可能に戻す）
    const { data, error } = await withTenant(
      supabase
        .from("orders")
        .update({
          tracking_number: null,
          shipping_date: null,
          shipping_list_created_at: null,
          updated_at: now,
        })
        .eq("id", order_id)
        .select("id, tracking_number, shipping_date, shipping_list_created_at"),
      tenantId
    );

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
