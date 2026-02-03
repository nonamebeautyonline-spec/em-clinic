import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/admin/refunds
 * 返金一覧を取得
 */
export async function GET(req: NextRequest) {
  try {
    // 管理者トークン認証
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!ADMIN_TOKEN || token !== ADMIN_TOKEN) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    // ordersテーブルから返金データを取得
    const { data: refunds, error } = await supabase
      .from("orders")
      .select("id, patient_id, amount, refunded_amount, refund_status, refunded_at, status, created_at, product_code")
      .or("refund_status.eq.COMPLETED,refund_status.eq.PENDING,refund_status.eq.FAILED,status.eq.refunded")
      .order("refunded_at", { ascending: false });

    if (error) {
      console.error("[admin/refunds] Database error:", error);
      return NextResponse.json({ ok: false, error: "database_error" }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      refunds: refunds || [],
    });
  } catch (err) {
    console.error("[admin/refunds] Unexpected error:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
