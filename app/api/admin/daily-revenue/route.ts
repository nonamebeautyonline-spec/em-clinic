import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant } from "@/lib/tenant";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = "force-dynamic";

// GET: 日別売上データ取得
export async function GET(req: NextRequest) {
  try {
    // 認証チェック（クッキーまたはBearerトークン）
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) {
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
    const tenantId = resolveTenantId(req);

    const startISO = new Date(new Date(`${startDate}T00:00:00`).getTime() - jstOffset).toISOString();
    const endISO = new Date(new Date(`${endDate}T23:59:59`).getTime() - jstOffset + 1000).toISOString();

    // 3クエリを並列実行（逐次ページネーション→並列に最適化）
    const [squareResult, bankResult, refundResult] = await Promise.all([
      // カード決済（paid_atベース）
      withTenant(
        supabase
          .from("orders")
          .select("id, amount, paid_at")
          .eq("payment_method", "credit_card")
          .gte("paid_at", startISO)
          .lt("paid_at", endISO)
          .not("paid_at", "is", null)
          .limit(10000),
        tenantId
      ),
      // 銀行振込（created_atベース）
      withTenant(
        supabase
          .from("orders")
          .select("id, amount, created_at")
          .eq("payment_method", "bank_transfer")
          .in("status", ["pending_confirmation", "confirmed"])
          .gte("created_at", startISO)
          .lt("created_at", endISO)
          .limit(10000),
        tenantId
      ),
      // 返金（refunded_atベース）
      withTenant(
        supabase
          .from("orders")
          .select("id, refunded_amount, amount, refunded_at")
          .eq("refund_status", "COMPLETED")
          .gte("refunded_at", startISO)
          .lt("refunded_at", endISO)
          .limit(10000),
        tenantId
      ),
    ]);

    const allSquareOrders = squareResult.data || [];
    const allBankOrders = bankResult.data || [];
    const allRefundedOrders = refundResult.data || [];

    // 日付ごとに集計
    const dailyData: Record<string, { date: string; square: number; bank: number; refund: number; total: number; squareCount: number; bankCount: number }> = {};

    // 月の全日付を初期化
    const daysInMonth = new Date(year, month, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${yearMonth}-${String(d).padStart(2, "0")}`;
      dailyData[dateStr] = { date: dateStr, square: 0, bank: 0, refund: 0, total: 0, squareCount: 0, bankCount: 0 };
    }

    // カード決済を集計
    allSquareOrders.forEach((order) => {
      if (order.paid_at) {
        const jstDate = new Date(new Date(order.paid_at).getTime() + jstOffset);
        const dateStr = jstDate.toISOString().split("T")[0];
        if (dailyData[dateStr]) {
          dailyData[dateStr].square += order.amount || 0;
          dailyData[dateStr].squareCount += 1;
        }
      }
    });

    // 銀行振込を集計
    allBankOrders.forEach((order) => {
      if (order.created_at) {
        const jstDate = new Date(new Date(order.created_at).getTime() + jstOffset);
        const dateStr = jstDate.toISOString().split("T")[0];
        if (dailyData[dateStr]) {
          dailyData[dateStr].bank += order.amount || 0;
          dailyData[dateStr].bankCount += 1;
        }
      }
    });

    // 返金を集計
    allRefundedOrders.forEach((order) => {
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

    const totalSquare = result.reduce((sum, d) => sum + d.square, 0);
    const totalBank = result.reduce((sum, d) => sum + d.bank, 0);
    const totalRefund = result.reduce((sum, d) => sum + d.refund, 0);
    const totalNet = result.reduce((sum, d) => sum + d.total, 0);
    const totalSquareCount = result.reduce((sum, d) => sum + d.squareCount, 0);
    const totalBankCount = result.reduce((sum, d) => sum + d.bankCount, 0);
    const totalCount = totalSquareCount + totalBankCount;
    const avgOrderValue = totalCount > 0 ? Math.round((totalSquare + totalBank) / totalCount) : 0;

    return NextResponse.json({
      ok: true,
      data: result,
      summary: {
        totalSquare,
        totalBank,
        totalRefund,
        totalNet,
        totalSquareCount,
        totalBankCount,
        totalCount,
        avgOrderValue,
      },
    });
  } catch (err) {
    console.error("[daily-revenue] Exception:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
