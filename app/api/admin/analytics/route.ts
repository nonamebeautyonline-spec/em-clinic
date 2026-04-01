// app/api/admin/analytics/route.ts — 売上分析・LTV・コホート（DB側RPC集計）
import { NextRequest, NextResponse } from "next/server";
import { badRequest, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth, getAdminTenantId } from "@/lib/admin-auth";
import { resolveTenantId } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  const ok = await verifyAdminAuth(req);
  if (!ok) return unauthorized();

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "overview";
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";

  const tenantId = resolveTenantId(req) || await getAdminTenantId(req);

  switch (type) {
    case "daily":
      return getDailyRevenue(from, to, tenantId);
    case "ltv":
      return getLTV(from, to, tenantId);
    case "cohort":
      return getCohort(tenantId);
    case "products":
      return getProductBreakdown(from, to, tenantId);
    default:
      return badRequest("不明なtype");
  }
}

/** 日別売上推移 — daily_revenue_summary RPCを使用（日別サマリーと同じデータソース） */
async function getDailyRevenue(from: string, to: string, tenantId: string | null) {
  if (!tenantId) return NextResponse.json({ daily: [] });

  const { data, error } = await supabaseAdmin.rpc("daily_revenue_summary", {
    p_tenant_id: tenantId,
    p_start_date: from || null,
    p_end_date: to || null,
  });

  if (error || !data?.data) {
    console.error("[analytics] daily_revenue_summary error:", error);
    return NextResponse.json({ daily: [] });
  }

  // RPCの応答をフロント互換フォーマットに変換（売上がある日のみ）
  const daily = (data.data as { date: string; square: number; bank: number; refund: number; total: number; squareCount: number; bankCount: number }[])
    .filter((row) => row.total > 0 || row.refund > 0)
    .map((row) => ({
      date: row.date,
      revenue: row.total,
      gross: row.square + row.bank,
      refunds: row.refund,
      count: row.squareCount + row.bankCount,
    }));

  return NextResponse.json({ daily });
}

/** 患者LTV（生涯価値） — DB側RPC */
async function getLTV(from: string, to: string, tenantId: string | null) {
  const { data, error } = await supabaseAdmin.rpc("analytics_ltv", {
    p_tenant_id: tenantId,
    p_start_date: from || null,
    p_end_date: to || null,
  });

  if (error || !data) {
    console.error("[analytics] analytics_ltv error:", error);
    return NextResponse.json({ ltv: {} });
  }

  // RPC結果をそのまま返す（キー名はRPC側でフロント互換に合わせてある）
  return NextResponse.json({ ltv: data });
}

/** コホート分析（月別初回購入→リピート率） — DB側RPC */
async function getCohort(tenantId: string | null) {
  const { data, error } = await supabaseAdmin.rpc("analytics_cohort", {
    p_tenant_id: tenantId,
    p_months: 12,
  });

  if (error || !data) {
    console.error("[analytics] analytics_cohort error:", error);
    return NextResponse.json({ cohort: [] });
  }

  // RPCはJSONB配列を返す
  return NextResponse.json({ cohort: data });
}

/** 商品別売上内訳 — ordersテーブルから直接集計（商品名で表示） */
async function getProductBreakdown(from: string, to: string, tenantId: string | null) {
  if (!tenantId) return NextResponse.json({ products: [] });

  let query = supabaseAdmin
    .from("orders")
    .select("product_code, product_name, amount, refunded_amount, refund_status")
    .eq("tenant_id", tenantId)
    .not("paid_at", "is", null);
  if (from) query = query.gte("paid_at", `${from}T00:00:00`);
  if (to) query = query.lte("paid_at", `${to}T23:59:59`);

  const { data: orders, error } = await query;
  if (error || !orders) {
    console.error("[analytics] product breakdown error:", error);
    return NextResponse.json({ products: [] });
  }

  // 商品名で集計（codeにproduct_nameを使用）
  const productMap = new Map<string, { code: string; revenue: number; count: number }>();
  for (const o of orders) {
    const name = o.product_name || o.product_code || "不明";
    const entry = productMap.get(name) || { code: name, revenue: 0, count: 0 };
    const amount = Number(o.amount) || 0;
    const refund = o.refund_status === "refunded" ? (Number(o.refunded_amount) || amount) : 0;
    entry.revenue += amount - refund;
    entry.count += 1;
    productMap.set(name, entry);
  }

  const products = Array.from(productMap.values())
    .sort((a, b) => b.revenue - a.revenue);

  return NextResponse.json({ products });
}
