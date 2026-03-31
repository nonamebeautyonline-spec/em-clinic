// app/api/admin/line/tracking-sources/analytics/route.ts — 流入経路分析API
import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow, strictWithTenant } from "@/lib/tenant";

/**
 * GET: 流入経路の友だち追加分析データを返す
 *
 * レスポンス:
 * - summary: 今月の新規友だち数、トップ経路、QR/URL比率
 * - dailyCounts: 過去30日の日別友だち追加数
 * - sourceBreakdown: 経路別の友だち追加数と割合
 */
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);

  // 今月の範囲を計算
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const monthEnd = now.toISOString().slice(0, 10);

  // 過去30日の範囲
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000)
    .toISOString()
    .slice(0, 10);

  // ─── 今月の友だち追加（tracking_source_id が紐付いたpatients）───
  const { data: monthlyPatients, error: mpErr } = await strictWithTenant(
    supabaseAdmin
      .from("patients")
      .select("id, tracking_source_id, utm_medium, created_at")
      .not("tracking_source_id", "is", null)
      .gte("created_at", `${monthStart}T00:00:00Z`)
      .lte("created_at", `${monthEnd}T23:59:59Z`),
    tenantId
  );
  if (mpErr) return serverError(mpErr.message);

  const monthlyList = monthlyPatients || [];
  const totalThisMonth = monthlyList.length;

  // QR経由 vs URL経由の判定（utm_medium = "qr" はQR経由とみなす）
  let qrCount = 0;
  let urlCount = 0;
  for (const p of monthlyList) {
    if (
      p.utm_medium &&
      (p.utm_medium as string).toLowerCase().includes("qr")
    ) {
      qrCount++;
    } else {
      urlCount++;
    }
  }
  const qrRatio =
    totalThisMonth > 0 ? Math.round((qrCount / totalThisMonth) * 1000) / 10 : 0;
  const urlRatio =
    totalThisMonth > 0
      ? Math.round((urlCount / totalThisMonth) * 1000) / 10
      : 0;

  // 経路別の今月集計（トップ経路の特定用）
  const monthlySourceMap: Record<number, number> = {};
  for (const p of monthlyList) {
    const sid = p.tracking_source_id as number;
    monthlySourceMap[sid] = (monthlySourceMap[sid] || 0) + 1;
  }

  // ─── 過去30日の日別友だち追加数 ───
  const { data: dailyPatients, error: dpErr } = await strictWithTenant(
    supabaseAdmin
      .from("patients")
      .select("tracking_source_id, created_at")
      .not("tracking_source_id", "is", null)
      .gte("created_at", `${thirtyDaysAgo}T00:00:00Z`)
      .lte("created_at", `${monthEnd}T23:59:59Z`),
    tenantId
  );
  if (dpErr) return serverError(dpErr.message);

  // 日別集計
  const dailyMap: Record<string, number> = {};
  for (const p of dailyPatients || []) {
    const day = (p.created_at as string).slice(0, 10);
    dailyMap[day] = (dailyMap[day] || 0) + 1;
  }

  // 過去30日の全日を埋める
  const dailyCounts: { date: string; count: number }[] = [];
  const startDate = new Date(thirtyDaysAgo);
  const endDate = new Date(monthEnd);
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().slice(0, 10);
    dailyCounts.push({
      date: dateStr,
      count: dailyMap[dateStr] || 0,
    });
  }

  // ─── 経路別の全期間集計 ───
  // tracking_visits の converted_at を使って友だち追加（CV）数を経路別に集計
  const { data: allConverted, error: acErr } = await strictWithTenant(
    supabaseAdmin
      .from("tracking_visits")
      .select("source_id")
      .not("converted_at", "is", null),
    tenantId
  );
  if (acErr) return serverError(acErr.message);

  const sourceCountMap: Record<number, number> = {};
  for (const v of allConverted || []) {
    const sid = v.source_id as number;
    sourceCountMap[sid] = (sourceCountMap[sid] || 0) + 1;
  }

  // 経路名を取得
  const allSourceIds = [
    ...new Set([
      ...Object.keys(monthlySourceMap).map(Number),
      ...Object.keys(sourceCountMap).map(Number),
    ]),
  ];

  let sourceNames: Record<number, { name: string; code: string }> = {};
  if (allSourceIds.length > 0) {
    const { data: sources } = await strictWithTenant(
      supabaseAdmin
        .from("tracking_sources")
        .select("id, name, code")
        .in("id", allSourceIds),
      tenantId
    );
    sourceNames = Object.fromEntries(
      (sources || []).map((s) => [s.id, { name: s.name, code: s.code }])
    );
  }

  // 経路別内訳（CV数ベース）
  const totalConverted = Object.values(sourceCountMap).reduce(
    (a, b) => a + b,
    0
  );
  const sourceBreakdown = Object.entries(sourceCountMap)
    .map(([id, count]) => ({
      name: sourceNames[Number(id)]?.name || `ID:${id}`,
      code: sourceNames[Number(id)]?.code || "",
      count,
      percentage:
        totalConverted > 0
          ? Math.round((count / totalConverted) * 1000) / 10
          : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // トップ経路の特定（今月ベース）
  let topSource = { name: "-", count: 0 };
  const topMonthlyEntry = Object.entries(monthlySourceMap).sort(
    (a, b) => b[1] - a[1]
  )[0];
  if (topMonthlyEntry) {
    const sid = Number(topMonthlyEntry[0]);
    topSource = {
      name: sourceNames[sid]?.name || `ID:${sid}`,
      count: topMonthlyEntry[1],
    };
  }

  return NextResponse.json({
    summary: {
      totalThisMonth,
      topSource,
      qrRatio,
      urlRatio,
      qrCount,
      urlCount,
    },
    dailyCounts,
    sourceBreakdown,
  });
}
