// app/api/admin/analytics/route.ts — 売上分析・LTV・コホート（DB側RPC集計）
import { NextRequest, NextResponse } from "next/server";
import { badRequest, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  const ok = await verifyAdminAuth(req);
  if (!ok) return unauthorized();

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "overview";
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";

  const tenantId = resolveTenantIdOrThrow(req);

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

/** 日別売上推移 — daily_metricsテーブルから取得 */
async function getDailyRevenue(from: string, to: string, tenantId: string | null) {
  if (!tenantId) return NextResponse.json({ daily: [] });

  let query = supabaseAdmin
    .from("daily_metrics")
    .select("metric_date, card_revenue, bank_revenue, refund_amount, card_orders, bank_orders, refund_orders")
    .eq("tenant_id", tenantId)
    .order("metric_date", { ascending: true });

  if (from) query = query.gte("metric_date", from);
  if (to) query = query.lte("metric_date", to);

  const { data, error } = await query;
  if (error || !data) return NextResponse.json({ daily: [] });

  // daily_metricsの行をフロント互換フォーマットに変換
  const daily = data.map((row) => {
    const gross = Number(row.card_revenue) + Number(row.bank_revenue);
    const refunds = Number(row.refund_amount);
    const count = Number(row.card_orders) + Number(row.bank_orders);
    return {
      date: row.metric_date,
      revenue: gross - refunds,
      gross,
      refunds,
      count,
    };
  });

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

/** 商品別売上内訳 — DB側RPC */
async function getProductBreakdown(from: string, to: string, tenantId: string | null) {
  const { data, error } = await supabaseAdmin.rpc("analytics_product_breakdown", {
    p_tenant_id: tenantId,
    p_start_date: from || null,
    p_end_date: to || null,
  });

  if (error || !data) {
    console.error("[analytics] analytics_product_breakdown error:", error);
    return NextResponse.json({ products: [] });
  }

  // RPCはJSONB配列を返す（code, product_name, revenue, count）
  return NextResponse.json({ products: data });
}
