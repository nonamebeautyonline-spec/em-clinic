import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow, strictWithTenant } from "@/lib/tenant";

export async function GET(request: NextRequest) {
  try {
    // 認証チェック（クッキーまたはBearerトークン）
    const isAuthorized = await verifyAdminAuth(request);
    if (!isAuthorized) {
      return unauthorized();
    }

    const tenantId = resolveTenantIdOrThrow(request);

    // 銀行振込注文一覧を取得（ordersテーブルからpayment_method='bank_transfer'を抽出）
    const { data: orders, error } = await strictWithTenant(
      supabaseAdmin
        .from("orders")
        .select("*")
        .eq("payment_method", "bank_transfer")
        .order("created_at", { ascending: false }),
      tenantId
    );

    if (error) {
      console.error("[bank-transfer-orders] Error:", error);
      return serverError(error.message);
    }

    return NextResponse.json({ orders });
  } catch (error) {
    console.error("[bank-transfer-orders] Error:", error);
    return serverError(error instanceof Error ? error.message : "Internal server error");
  }
}
