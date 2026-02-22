import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant } from "@/lib/tenant";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = "force-dynamic";

// 仕入れ原価（2本あたり）
const COST_PER_2_PENS: Record<string, number> = {
  "2.5mg": 3848,
  "5mg": 7696,
  "7.5mg": 11544,
};

// 1ヶ月分 = 4本
// 2ヶ月分 = 8本
// 3ヶ月分 = 12本
const PENS_PER_PRODUCT: Record<string, number> = {
  "MJL_2.5mg_1m": 4,
  "MJL_2.5mg_2m": 8,
  "MJL_2.5mg_3m": 12,
  "MJL_5mg_1m": 4,
  "MJL_5mg_2m": 8,
  "MJL_5mg_3m": 12,
  "MJL_7.5mg_1m": 4,
  "MJL_7.5mg_2m": 8,
  "MJL_7.5mg_3m": 12,
};

function getDoseFromCode(productCode: string): string | null {
  if (productCode.includes("2.5mg")) return "2.5mg";
  if (productCode.includes("5mg") && !productCode.includes("7.5mg")) return "5mg";
  if (productCode.includes("7.5mg")) return "7.5mg";
  return null;
}

function calculateCost(productCode: string, quantity: number): number {
  const pens = PENS_PER_PRODUCT[productCode] || 4;
  const dose = getDoseFromCode(productCode);
  if (!dose) return 0;

  const costPer2Pens = COST_PER_2_PENS[dose] || 0;
  const costPerPen = costPer2Pens / 2;

  return costPerPen * pens * quantity;
}

// GET: 月次売上原価計算
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
    const endDate = new Date(year, month, 0).toISOString().split("T")[0];

    const tenantId = resolveTenantId(req);

    const jstOffset = 9 * 60 * 60 * 1000;
    const startISO = new Date(new Date(`${startDate}T00:00:00`).getTime() - jstOffset).toISOString();
    const endISO = new Date(new Date(`${endDate}T23:59:59`).getTime() - jstOffset + 1000).toISOString();

    // 2クエリを並列実行（逐次ページネーション→並列に最適化）
    const [squareResult, bankResult] = await Promise.all([
      // カード決済
      withTenant(
        supabase
          .from("orders")
          .select("id, product_code, amount")
          .eq("payment_method", "credit_card")
          .gte("paid_at", startISO)
          .lt("paid_at", endISO)
          .not("paid_at", "is", null)
          .limit(10000),
        tenantId
      ),
      // 銀行振込
      withTenant(
        supabase
          .from("orders")
          .select("id, product_code, amount")
          .eq("payment_method", "bank_transfer")
          .in("status", ["pending_confirmation", "confirmed"])
          .gte("created_at", startISO)
          .lt("created_at", endISO)
          .limit(10000),
        tenantId
      ),
    ]);

    const allSquareOrders = squareResult.data || [];
    const allBankOrders = bankResult.data || [];

    const allOrders = [...allSquareOrders, ...allBankOrders];

    // 商品別に集計
    const productSummary: Record<string, { code: string; count: number; revenue: number; cost: number }> = {};

    allOrders.forEach((order) => {
      const code = order.product_code || "unknown";
      if (!productSummary[code]) {
        productSummary[code] = { code, count: 0, revenue: 0, cost: 0 };
      }
      productSummary[code].count += 1;
      productSummary[code].revenue += order.amount || 0;
      productSummary[code].cost += calculateCost(code, 1);
    });

    const products = Object.values(productSummary).sort((a, b) => b.revenue - a.revenue);
    const totalRevenue = products.reduce((sum, p) => sum + p.revenue, 0);
    const totalCost = products.reduce((sum, p) => sum + p.cost, 0);

    // カード決済手数料（3.6%）
    const cardRevenue = allSquareOrders.reduce((sum, o) => sum + (o.amount || 0), 0);
    const processingFee = Math.round(cardRevenue * 0.036);

    const grossProfit = totalRevenue - totalCost;
    const grossMargin = totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 100) : 0;

    // 原価計算の詳細
    const costBreakdown = [
      { dose: "2.5mg", costPer2Pens: COST_PER_2_PENS["2.5mg"], costPerPen: COST_PER_2_PENS["2.5mg"] / 2 },
      { dose: "5mg", costPer2Pens: COST_PER_2_PENS["5mg"], costPerPen: COST_PER_2_PENS["5mg"] / 2 },
      { dose: "7.5mg", costPer2Pens: COST_PER_2_PENS["7.5mg"], costPerPen: COST_PER_2_PENS["7.5mg"] / 2 },
    ];

    return NextResponse.json({
      ok: true,
      data: {
        products,
        totalRevenue,
        totalCost,
        cardRevenue,
        processingFee,
        grossProfit,
        grossMargin,
        costBreakdown,
        orderCount: allOrders.length,
      },
    });
  } catch (err) {
    console.error("[cost-calculation] Exception:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
