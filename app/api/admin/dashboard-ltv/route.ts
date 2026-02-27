import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant } from "@/lib/tenant";

// LTV分析API: 患者あたり累計売上・セグメント別LTVを提供
export async function GET(request: NextRequest) {
  try {
    const isAuthorized = await verifyAdminAuth(request);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = resolveTenantId(request);

    // 全注文データ（patient_id + 金額）と セグメントデータを並列取得
    const [ordersResult, segmentsResult] = await Promise.all([
      withTenant(
        supabaseAdmin.from("orders").select("patient_id, amount, created_at")
          .not("patient_id", "is", null)
          .not("amount", "is", null)
          .limit(100000),
        tenantId,
      ),
      withTenant(
        supabaseAdmin.from("patient_segments").select("patient_id, segment")
          .limit(100000),
        tenantId,
      ),
    ]);

    const orders = ordersResult.data || [];
    const segments = segmentsResult.data || [];

    // セグメントマップ
    const segmentMap = new Map<string, string>();
    for (const s of segments) {
      if (s.patient_id) segmentMap.set(s.patient_id, s.segment);
    }

    // 患者ごとの累計売上・来院回数を集計
    const patientStats = new Map<string, { totalRevenue: number; orderCount: number; segment: string }>();
    for (const order of orders) {
      if (!order.patient_id) continue;
      const stats = patientStats.get(order.patient_id) || {
        totalRevenue: 0,
        orderCount: 0,
        segment: segmentMap.get(order.patient_id) || "unknown",
      };
      stats.totalRevenue += order.amount || 0;
      stats.orderCount++;
      patientStats.set(order.patient_id, stats);
    }

    // LTV分布（ヒストグラム用）
    const ltvValues = [...patientStats.values()].map((s) => s.totalRevenue);
    const distribution = buildDistribution(ltvValues);

    // セグメント別LTV
    const segmentLTV = new Map<string, { totalRevenue: number; count: number; orderCount: number }>();
    for (const stats of patientStats.values()) {
      const seg = stats.segment;
      const entry = segmentLTV.get(seg) || { totalRevenue: 0, count: 0, orderCount: 0 };
      entry.totalRevenue += stats.totalRevenue;
      entry.count++;
      entry.orderCount += stats.orderCount;
      segmentLTV.set(seg, entry);
    }

    const segmentData = [...segmentLTV.entries()]
      .map(([segment, data]) => ({
        segment,
        label: SEGMENT_LABELS[segment] || segment,
        avgLTV: data.count > 0 ? Math.round(data.totalRevenue / data.count) : 0,
        totalRevenue: data.totalRevenue,
        patientCount: data.count,
        avgOrders: data.count > 0 ? Math.round((data.orderCount / data.count) * 10) / 10 : 0,
      }))
      .sort((a, b) => b.avgLTV - a.avgLTV);

    // 全体統計
    const sortedLTVs = ltvValues.sort((a, b) => a - b);
    const totalPatients = sortedLTVs.length;
    const totalRevenue = sortedLTVs.reduce((sum, v) => sum + v, 0);
    const avgLTV = totalPatients > 0 ? Math.round(totalRevenue / totalPatients) : 0;
    const medianLTV = totalPatients > 0 ? sortedLTVs[Math.floor(totalPatients / 2)] : 0;
    const top10Threshold = totalPatients > 0 ? sortedLTVs[Math.floor(totalPatients * 0.9)] : 0;
    const top10Patients = sortedLTVs.filter((v) => v >= top10Threshold);
    const top10AvgLTV = top10Patients.length > 0
      ? Math.round(top10Patients.reduce((sum, v) => sum + v, 0) / top10Patients.length)
      : 0;

    return NextResponse.json({
      overview: {
        totalPatients,
        totalRevenue,
        avgLTV,
        medianLTV,
        top10AvgLTV,
      },
      distribution,
      segments: segmentData,
    });
  } catch (error) {
    console.error("[dashboard-ltv] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}

const SEGMENT_LABELS: Record<string, string> = {
  vip: "VIP",
  active: "アクティブ",
  churn_risk: "離脱リスク",
  dormant: "休眠",
  new: "新規",
  unknown: "未分類",
};

function buildDistribution(values: number[]): { range: string; count: number }[] {
  if (values.length === 0) return [];

  // 固定のレンジ区間
  const ranges = [
    { min: 0, max: 10000, label: "〜1万" },
    { min: 10000, max: 30000, label: "1〜3万" },
    { min: 30000, max: 50000, label: "3〜5万" },
    { min: 50000, max: 100000, label: "5〜10万" },
    { min: 100000, max: 200000, label: "10〜20万" },
    { min: 200000, max: 500000, label: "20〜50万" },
    { min: 500000, max: Infinity, label: "50万〜" },
  ];

  return ranges.map((r) => ({
    range: r.label,
    count: values.filter((v) => v >= r.min && v < r.max).length,
  })).filter((r) => r.count > 0);
}
