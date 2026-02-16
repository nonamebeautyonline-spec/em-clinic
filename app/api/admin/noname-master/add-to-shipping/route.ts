import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";

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

    // DB更新なし: 発送漏れ注文はpending APIが自動検出する
    // shipping_list_created_atはCSV出力時のみ設定
    console.log(`[AddToShipping] ✅ Order ${order_id} marked for today's shipping (no DB update needed)`);

    return NextResponse.json({
      success: true,
      order: { id: order_id },
    });
  } catch (error) {
    console.error("[AddToShipping] API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}
