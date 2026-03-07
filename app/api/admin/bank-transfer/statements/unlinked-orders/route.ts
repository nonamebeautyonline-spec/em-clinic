// app/api/admin/bank-transfer/statements/unlinked-orders/route.ts
import { NextRequest, NextResponse } from "next/server";
import { unauthorized, serverError } from "@/lib/api-error";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { createClient } from "@supabase/supabase-js";
import { resolveTenantId, withTenant } from "@/lib/tenant";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * 未確認（pending_confirmation）の銀行振込注文一覧を取得
 * GET /api/admin/bank-transfer/statements/unlinked-orders
 */
export async function GET(req: NextRequest) {
  try {
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) return unauthorized();

    const tenantId = resolveTenantId(req);
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 未確認の銀行振込注文のみ取得（confirmedは確認済みなので除外）
    const { data: bankOrders, error } = await withTenant(
      supabase
        .from("orders")
        .select("id, patient_id, amount, account_name, shipping_name, product_code, created_at, status")
        .eq("status", "pending_confirmation")
        .eq("payment_method", "bank_transfer")
        .order("created_at", { ascending: false }),
      tenantId
    );

    if (error) {
      console.error("[UnlinkedOrders] fetch error:", error);
      return serverError(error.message);
    }

    if (!bankOrders || bankOrders.length === 0) {
      return NextResponse.json({ orders: [] });
    }

    // bank_statementsで既に紐づけ済みの注文IDを取得
    const { data: linkedStatements } = await withTenant(
      supabase
        .from("bank_statements")
        .select("matched_order_id")
        .eq("reconciled", true)
        .not("matched_order_id", "is", null),
      tenantId
    );

    const linkedOrderIds = new Set(
      (linkedStatements || []).map((s: Record<string, unknown>) => s.matched_order_id as string)
    );

    // 紐づいていない注文のみ返す
    const unlinkedOrders = bankOrders.filter(
      (o: Record<string, unknown>) => !linkedOrderIds.has(o.id as string)
    );

    return NextResponse.json({ orders: unlinkedOrders });
  } catch (e) {
    console.error("[UnlinkedOrders] error:", e);
    return serverError(e instanceof Error ? e.message : "サーバーエラー");
  }
}
