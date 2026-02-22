// app/api/admin/analytics/route.ts — 売上分析・LTV・コホート
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  const ok = await verifyAdminAuth(req);
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "overview";
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";

  const tenantId = resolveTenantId(req);

  switch (type) {
    case "daily":
      return getDailyRevenue(from, to, tenantId);
    case "ltv":
      return getLTV(tenantId);
    case "cohort":
      return getCohort(tenantId);
    case "products":
      return getProductBreakdown(from, to, tenantId);
    default:
      return NextResponse.json({ error: "不明なtype" }, { status: 400 });
  }
}

/** 日別売上推移 */
async function getDailyRevenue(from: string, to: string, tenantId: string | null) {
  let query = supabaseAdmin
    .from("orders")
    .select("amount, paid_at, refund_status, refunded_amount")
    .not("paid_at", "is", null);

  if (from) query = query.gte("paid_at", from);
  if (to) query = query.lte("paid_at", to + "T23:59:59");

  const { data } = await withTenant(query.limit(10000), tenantId);
  if (!data) return NextResponse.json({ daily: [] });

  const map = new Map<string, { revenue: number; refunds: number; count: number }>();
  for (const o of data) {
    const day = o.paid_at.split("T")[0];
    const entry = map.get(day) || { revenue: 0, refunds: 0, count: 0 };
    entry.revenue += Number(o.amount) || 0;
    entry.count += 1;
    if (o.refund_status === "COMPLETED") {
      entry.refunds += Number(o.refunded_amount) || 0;
    }
    map.set(day, entry);
  }

  const daily = Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({
      date,
      revenue: v.revenue - v.refunds,
      gross: v.revenue,
      refunds: v.refunds,
      count: v.count,
    }));

  return NextResponse.json({ daily });
}

/** 患者LTV（生涯価値） */
async function getLTV(tenantId: string | null) {
  const { data: orders } = await withTenant(
    supabaseAdmin
      .from("orders")
      .select("patient_id, amount, paid_at, refund_status, refunded_amount")
      .not("paid_at", "is", null)
      .limit(50000),
    tenantId
  );

  if (!orders) return NextResponse.json({ ltv: {} });

  // 患者別集計
  const patientMap = new Map<string, { total: number; count: number; first: string }>();
  for (const o of orders) {
    const pid = o.patient_id;
    if (!pid) continue;
    const entry = patientMap.get(pid) || { total: 0, count: 0, first: o.paid_at };
    const amt = (Number(o.amount) || 0) - (o.refund_status === "COMPLETED" ? Number(o.refunded_amount) || 0 : 0);
    entry.total += amt;
    entry.count += 1;
    if (o.paid_at < entry.first) entry.first = o.paid_at;
    patientMap.set(pid, entry);
  }

  const patients = Array.from(patientMap.values());
  const totalPatients = patients.length;
  const totalRevenue = patients.reduce((s, p) => s + p.total, 0);
  const avgLtv = totalPatients > 0 ? Math.round(totalRevenue / totalPatients) : 0;
  const avgOrders = totalPatients > 0 ? +(patients.reduce((s, p) => s + p.count, 0) / totalPatients).toFixed(1) : 0;

  // LTV分布（ヒストグラム用）
  const buckets = [0, 5000, 10000, 20000, 30000, 50000, 100000, 200000];
  const distribution = buckets.map((min, i) => {
    const max = buckets[i + 1] || Infinity;
    const label = max === Infinity ? `${(min / 1000).toFixed(0)}万〜` : `${(min / 1000).toFixed(0)}〜${(max / 1000).toFixed(0)}千`;
    return {
      label: max === Infinity ? `${min / 10000}万〜` : `¥${min.toLocaleString()}〜`,
      count: patients.filter(p => p.total >= min && p.total < max).length,
    };
  });

  // リピーター分布
  const repeatDist = [
    { label: "1回", count: patients.filter(p => p.count === 1).length },
    { label: "2回", count: patients.filter(p => p.count === 2).length },
    { label: "3回", count: patients.filter(p => p.count === 3).length },
    { label: "4回以上", count: patients.filter(p => p.count >= 4).length },
  ];

  return NextResponse.json({
    ltv: {
      avgLtv,
      avgOrders,
      totalPatients,
      totalRevenue,
      distribution,
      repeatDist,
    },
  });
}

/** コホート分析（月別初回購入→リピート率） */
async function getCohort(tenantId: string | null) {
  const { data: orders } = await withTenant(
    supabaseAdmin
      .from("orders")
      .select("patient_id, paid_at")
      .not("paid_at", "is", null)
      .order("paid_at", { ascending: true })
      .limit(50000),
    tenantId
  );

  if (!orders) return NextResponse.json({ cohort: [] });

  // 患者別の初回月と各月の購入を記録
  const firstMonth = new Map<string, string>();
  const monthlyPurchases = new Map<string, Set<string>>(); // month → Set<patient_id>

  for (const o of orders) {
    const pid = o.patient_id;
    if (!pid) continue;
    const month = o.paid_at.slice(0, 7); // YYYY-MM

    if (!firstMonth.has(pid)) firstMonth.set(pid, month);

    const key = month;
    if (!monthlyPurchases.has(key)) monthlyPurchases.set(key, new Set());
    monthlyPurchases.get(key)!.add(pid);
  }

  // コホート別: 初回月ごとにN月後のリピート率を算出
  const cohortMonths = Array.from(new Set(firstMonth.values())).sort();
  const allMonths = Array.from(monthlyPurchases.keys()).sort();

  const cohort = cohortMonths.slice(-12).map(cm => {
    const cohortPatients = new Set(
      Array.from(firstMonth.entries())
        .filter(([, m]) => m === cm)
        .map(([pid]) => pid)
    );
    const size = cohortPatients.size;
    if (size === 0) return { month: cm, size, retention: [] };

    const retention = allMonths
      .filter(m => m >= cm)
      .slice(0, 6) // 最大6ヶ月
      .map((m, i) => {
        const active = monthlyPurchases.get(m);
        const retained = active ? Array.from(cohortPatients).filter(p => active.has(p)).length : 0;
        return { monthOffset: i, rate: Math.round((retained / size) * 100) };
      });

    return { month: cm, size, retention };
  });

  return NextResponse.json({ cohort });
}

/** 商品別売上内訳 */
async function getProductBreakdown(from: string, to: string, tenantId: string | null) {
  let query = supabaseAdmin
    .from("orders")
    .select("product_code, amount, refund_status, refunded_amount")
    .not("paid_at", "is", null);

  if (from) query = query.gte("paid_at", from);
  if (to) query = query.lte("paid_at", to + "T23:59:59");

  const { data } = await withTenant(query.limit(10000), tenantId);
  if (!data) return NextResponse.json({ products: [] });

  const map = new Map<string, { revenue: number; count: number }>();
  for (const o of data) {
    const code = o.product_code || "不明";
    const entry = map.get(code) || { revenue: 0, count: 0 };
    const amt = (Number(o.amount) || 0) - (o.refund_status === "COMPLETED" ? Number(o.refunded_amount) || 0 : 0);
    entry.revenue += amt;
    entry.count += 1;
    map.set(code, entry);
  }

  const products = Array.from(map.entries())
    .map(([code, v]) => ({ code, ...v }))
    .sort((a, b) => b.revenue - a.revenue);

  return NextResponse.json({ products });
}
