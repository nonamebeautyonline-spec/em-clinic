import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized } from "@/lib/api-error";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { parseBody } from "@/lib/validations/helpers";
import { addToShippingSchema } from "@/lib/validations/shipping";
import { logAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  try {
    // 認証チェック（クッキーまたはBearerトークン）
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) {
      return unauthorized();
    }

    const parsed = await parseBody(req, addToShippingSchema);
    if ("error" in parsed) return parsed.error;
    const { order_id } = parsed.data;

    // DB更新なし: 発送漏れ注文はpending APIが自動検出する
    // shipping_list_created_atはCSV出力時のみ設定
    console.log(`[AddToShipping] ✅ Order ${order_id} marked for today's shipping (no DB update needed)`);

    logAudit(req, "shipping.add", "order", String(order_id));
    return NextResponse.json({
      success: true,
      order: { id: order_id },
    });
  } catch (error) {
    console.error("[AddToShipping] API error:", error);
    return serverError(error instanceof Error ? error.message : "Server error");
  }
}
