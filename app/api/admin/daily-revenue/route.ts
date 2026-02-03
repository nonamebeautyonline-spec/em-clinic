import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

export const dynamic = "force-dynamic";

// GET: 日別売上データ取得
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!ADMIN_TOKEN || token !== ADMIN_TOKEN) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const yearMonth = searchParams.get("year_month");

    if (!yearMonth || !/^\d{4}-\d{2}$/.test(yearMonth)) {
      return NextResponse.json(
        { ok: false, error: "invalid_year_month" },
        { status: 400 }
      );
    }

    const [year, month] = yearMonth.split("-").map(Number);
    const startDate = `${yearMonth}-01`;
    const endDate = new Date(year, month, 0).toISOString().split("T")[0]; // 月末日

    // JSTで計算
    const jstOffset = 9 * 60 * 60 * 1000;
    const startISO = new Date(new Date(`${startDate}T00:00:00`).getTime() - jstOffset).toISOString();
    const endISO = new Date(new Date(`${endDate}T23:59:59`).getTime() - jstOffset + 1000).toISOString();

    // カード決済（paid_atベース）
    const { data: squareOrders, error: squareError } = await supabase
      .from("orders")
      .select("id, amount, paid_at")
      .eq("payment_method", "credit_card")
      .gte("paid_at", startISO)
      .lt("paid_at", endISO)
      .not("paid_at", "is", null);

    if (squareError) {
      console.error("[daily-revenue] Square query error:", squareError);
    }

    // 銀行振込（created_atベース、status確認済み）
    const { data: bankOrders, error: bankError } = await supabase
      .from("orders")
      .select("id, amount, created_at")
      .eq("payment_method", "bank_transfer")
      .in("status", ["pending_confirmation", "confirmed"])
      .gte("created_at", startISO)
      .lt("created_at", endISO);

    if (bankError) {
      console.error("[daily-revenue] Bank query error:", bankError);
    }

    // 返金（refunded_atベース）
    const { data: refundedOrders, error: refundError } = await supabase
      .from("orders")
      .select("id, refunded_amount, amount, refunded_at")
      .eq("refund_status", "COMPLETED")
      .gte("refunded_at", startISO)
      .lt("refunded_at", endISO);

    if (refundError) {
      console.error("[daily-revenue] Refund query error:", refundError);
    }

    // 日付ごとに集計
    const dailyData: Record<string, { date: string; square: number; bank: number; refund: number; total: number }> = {};

    // 月の全日付を初期化
    const daysInMonth = new Date(year, month, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${yearMonth}-${String(d).padStart(2, "0")}`;
      dailyData[dateStr] = { date: dateStr, square: 0, bank: 0, refund: 0, total: 0 };
    }

    // カード決済を集計
    (squareOrders || []).forEach((order) => {
      if (order.paid_at) {
        const jstDate = new Date(new Date(order.paid_at).getTime() + jstOffset);
        const dateStr = jstDate.toISOString().split("T")[0];
        if (dailyData[dateStr]) {
          dailyData[dateStr].square += order.amount || 0;
        }
      }
    });

    // 銀行振込を集計
    (bankOrders || []).forEach((order) => {
      if (order.created_at) {
        const jstDate = new Date(new Date(order.created_at).getTime() + jstOffset);
        const dateStr = jstDate.toISOString().split("T")[0];
        if (dailyData[dateStr]) {
          dailyData[dateStr].bank += order.amount || 0;
        }
      }
    });

    // 返金を集計
    (refundedOrders || []).forEach((order) => {
      if (order.refunded_at) {
        const jstDate = new Date(new Date(order.refunded_at).getTime() + jstOffset);
        const dateStr = jstDate.toISOString().split("T")[0];
        if (dailyData[dateStr]) {
          dailyData[dateStr].refund += order.refunded_amount || order.amount || 0;
        }
      }
    });

    // 純売上を計算
    Object.values(dailyData).forEach((day) => {
      day.total = day.square + day.bank - day.refund;
    });

    const result = Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      ok: true,
      data: result,
      summary: {
        totalSquare: result.reduce((sum, d) => sum + d.square, 0),
        totalBank: result.reduce((sum, d) => sum + d.bank, 0),
        totalRefund: result.reduce((sum, d) => sum + d.refund, 0),
        totalNet: result.reduce((sum, d) => sum + d.total, 0),
      },
    });
  } catch (err) {
    console.error("[daily-revenue] Exception:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
