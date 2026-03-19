// app/api/admin/line/tracking-sources/stats/route.ts — 流入経路統計API
import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow, strictWithTenant } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const to = searchParams.get("to") || new Date().toISOString().slice(0, 10);
  const sourceId = searchParams.get("source_id");

  // 期間内の全visit取得
  let visitsQuery = supabaseAdmin
    .from("tracking_visits")
    .select("source_id, visited_at, converted_at, utm_source, utm_medium")
    .gte("visited_at", `${from}T00:00:00Z`)
    .lte("visited_at", `${to}T23:59:59Z`);

  if (sourceId) {
    visitsQuery = visitsQuery.eq("source_id", Number(sourceId));
  }

  const { data: visits, error } = await strictWithTenant(visitsQuery, tenantId);
  if (error) return serverError(error.message);

  const allVisits = visits || [];
  const totalClicks = allVisits.length;
  const totalConverted = allVisits.filter(v => v.converted_at).length;
  const uniqueIps = new Set(allVisits.map(v => v.source_id)).size; // 経路数

  // 日別集計
  const dailyMap: Record<string, { clicks: number; conversions: number }> = {};
  for (const v of allVisits) {
    const day = (v.visited_at as string).slice(0, 10);
    if (!dailyMap[day]) dailyMap[day] = { clicks: 0, conversions: 0 };
    dailyMap[day].clicks++;
    if (v.converted_at) dailyMap[day].conversions++;
  }

  // from〜toの全日を埋める
  const daily: { date: string; clicks: number; conversions: number }[] = [];
  const start = new Date(from);
  const end = new Date(to);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().slice(0, 10);
    daily.push({
      date: dateStr,
      clicks: dailyMap[dateStr]?.clicks || 0,
      conversions: dailyMap[dateStr]?.conversions || 0,
    });
  }

  // 経路別集計
  const sourceMap: Record<number, { clicks: number; conversions: number }> = {};
  for (const v of allVisits) {
    const sid = v.source_id as number;
    if (!sourceMap[sid]) sourceMap[sid] = { clicks: 0, conversions: 0 };
    sourceMap[sid].clicks++;
    if (v.converted_at) sourceMap[sid].conversions++;
  }

  // 経路名を取得
  const sourceIds = Object.keys(sourceMap).map(Number);
  let sourceNames: Record<number, string> = {};
  if (sourceIds.length > 0) {
    const { data: sources } = await strictWithTenant(
      supabaseAdmin.from("tracking_sources").select("id, name").in("id", sourceIds),
      tenantId
    );
    sourceNames = Object.fromEntries((sources || []).map(s => [s.id, s.name]));
  }

  const bySource = sourceIds.map(id => ({
    source_id: id,
    name: sourceNames[id] || `ID:${id}`,
    clicks: sourceMap[id].clicks,
    conversions: sourceMap[id].conversions,
    cvr: sourceMap[id].clicks > 0
      ? Math.round((sourceMap[id].conversions / sourceMap[id].clicks) * 1000) / 10
      : 0,
  })).sort((a, b) => b.clicks - a.clicks);

  // UTM別集計
  const utmSourceMap: Record<string, number> = {};
  const utmMediumMap: Record<string, number> = {};
  for (const v of allVisits) {
    const us = (v.utm_source as string) || "(未設定)";
    const um = (v.utm_medium as string) || "(未設定)";
    utmSourceMap[us] = (utmSourceMap[us] || 0) + 1;
    utmMediumMap[um] = (utmMediumMap[um] || 0) + 1;
  }

  const byUtmSource = Object.entries(utmSourceMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const byUtmMedium = Object.entries(utmMediumMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return NextResponse.json({
    summary: {
      total_clicks: totalClicks,
      total_conversions: totalConverted,
      cvr: totalClicks > 0 ? Math.round((totalConverted / totalClicks) * 1000) / 10 : 0,
      source_count: uniqueIps,
    },
    daily,
    by_source: bySource,
    by_utm_source: byUtmSource,
    by_utm_medium: byUtmMedium,
  });
}
