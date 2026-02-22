// app/api/admin/line/analytics/route.ts — 配信効果分析API
// 既存のdashboard APIのデータ + CVR算出ロジック
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant } from "@/lib/tenant";
import { getSettingOrEnv } from "@/lib/settings";

// ページネーション付きfetch
async function fetchAll(buildQuery: () => any, pageSize = 5000) {
  const all: any[] = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await buildQuery().range(offset, offset + pageSize - 1);
    if (error) return { data: all, error };
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < pageSize) break;
    offset += pageSize;
  }
  return { data: all, error: null };
}

// LINE Insight APIからフォロワー統計を取得
async function fetchFollowerStats(dateStr: string, token: string) {
  if (!token) return null;
  try {
    const res = await fetch(
      `https://api.line.me/v2/bot/insight/followers?date=${dateStr}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== "ready") return null;
    return {
      date: `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`,
      followers: data.followers || 0,
      targetedReaches: data.targetedReaches || 0,
      blocks: data.blocks || 0,
    };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = resolveTenantId(req);
  const lineToken = await getSettingOrEnv(
    "line",
    "channel_access_token",
    "LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN",
    tenantId ?? undefined
  ) || "";
  const period = Number(req.nextUrl.searchParams.get("period")) || 30;
  const validPeriod = [7, 30, 90].includes(period) ? period : 30;

  // --- 1. 日次チャートデータ（line_daily_stats） ---
  const periodStart = new Date();
  periodStart.setDate(periodStart.getDate() - validPeriod);
  const periodStartStr = periodStart.toISOString().slice(0, 10);

  const { data: chartRows } = await withTenant(
    supabaseAdmin
      .from("line_daily_stats")
      .select("stat_date, followers, targeted_reaches, blocks, messages_sent, total_clicks, unique_clicks")
      .gte("stat_date", periodStartStr)
      .order("stat_date", { ascending: true }),
    tenantId
  );

  const chartData = {
    period: validPeriod,
    followerTrend: (chartRows || []).map((r: any, i: number, arr: any[]) => ({
      date: r.stat_date,
      followers: r.followers,
      diff: i > 0 ? r.followers - arr[i - 1].followers : 0,
    })),
    deliveryStats: (chartRows || []).map((r: any) => ({
      date: r.stat_date,
      sent: r.messages_sent,
    })),
    clickStats: (chartRows || []).map((r: any) => ({
      date: r.stat_date,
      clicks: r.total_clicks,
      uniqueClicks: r.unique_clicks,
    })),
    blockStats: (chartRows || []).map((r: any) => ({
      date: r.stat_date,
      blocks: r.blocks,
      followers: r.followers,
      blockRate: r.followers > 0 ? Number(((r.blocks / r.followers) * 100).toFixed(2)) : 0,
    })),
  };

  // --- 2. フォロワー統計（LINE Insight API、直近7日分） ---
  const dates: string[] = [];
  for (let i = 1; i <= 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().slice(0, 10).replace(/-/g, ""));
  }
  const dailyResults = await Promise.all(dates.map(d => fetchFollowerStats(d, lineToken)));
  const dailyStats = dailyResults.filter(Boolean) as {
    date: string; followers: number; targetedReaches: number; blocks: number;
  }[];

  // --- 3. 配信別統計（直近50件） ---
  const { data: broadcastRows } = await withTenant(
    supabaseAdmin
      .from("broadcasts")
      .select("id, name, status, total_targets, sent_count, failed_count, no_uid_count, sent_at, created_at")
      .in("status", ["sent", "sending"])
      .order("created_at", { ascending: false })
      .limit(50),
    tenantId
  );

  // 各配信のクリック数を取得
  const broadcastIds = (broadcastRows || []).map((b: any) => b.id);
  let broadcastClickMap = new Map<number, { total: number; unique: number; linkIds: number[] }>();

  if (broadcastIds.length > 0) {
    const { data: clickLinks } = await withTenant(
      supabaseAdmin
        .from("click_tracking_links")
        .select("id, broadcast_id")
        .in("broadcast_id", broadcastIds),
      tenantId
    );

    if (clickLinks && clickLinks.length > 0) {
      const linkIds = clickLinks.map((l: any) => l.id);
      const linkToBroadcast = new Map<number, number>();
      for (const l of clickLinks) linkToBroadcast.set(l.id, l.broadcast_id);

      // 配信IDごとのlinkIdを記録
      for (const l of clickLinks) {
        const cur = broadcastClickMap.get(l.broadcast_id) || { total: 0, unique: 0, linkIds: [] };
        cur.linkIds.push(l.id);
        broadcastClickMap.set(l.broadcast_id, cur);
      }

      const { data: clickEvts } = await fetchAll(() =>
        withTenant(
          supabaseAdmin
            .from("click_tracking_events")
            .select("link_id, ip_address, clicked_at")
            .in("link_id", linkIds),
          tenantId
        )
      );

      // 総クリック数
      for (const evt of clickEvts || []) {
        const bid = linkToBroadcast.get(evt.link_id);
        if (bid == null) continue;
        const cur = broadcastClickMap.get(bid)!;
        cur.total++;
      }

      // ユニーククリック計算
      const uniqueByBroadcast = new Map<number, Set<string>>();
      for (const evt of clickEvts || []) {
        const bid = linkToBroadcast.get(evt.link_id);
        if (bid == null) continue;
        if (!uniqueByBroadcast.has(bid)) uniqueByBroadcast.set(bid, new Set());
        uniqueByBroadcast.get(bid)!.add(evt.ip_address || "unknown");
      }
      for (const [bid, ips] of uniqueByBroadcast) {
        const cur = broadcastClickMap.get(bid)!;
        cur.unique = ips.size;
      }
    }
  }

  // --- 4. CVR算出（配信 → 決済の転換率） ---
  // 各配信の送信日から7日間の決済数を照合して推定CVR算出
  const broadcastCvrMap = new Map<number, { orders: number; cvr: number }>();

  if (broadcastIds.length > 0) {
    for (const b of broadcastRows || []) {
      const sentDate = b.sent_at || b.created_at;
      if (!sentDate) continue;

      const sentStart = new Date(sentDate);
      // 配信後7日間を転換期間として計算
      const sentEnd = new Date(sentStart.getTime() + 7 * 24 * 60 * 60 * 1000);

      const { count: orderCount } = await withTenant(
        supabaseAdmin
          .from("orders")
          .select("id", { count: "exact", head: true })
          .gte("paid_at", sentStart.toISOString())
          .lte("paid_at", sentEnd.toISOString()),
        tenantId
      );

      const clicks = broadcastClickMap.get(b.id);
      const uniqueClicks = clicks?.unique || 0;
      const orders = orderCount || 0;
      const cvr = uniqueClicks > 0 ? Number(((orders / uniqueClicks) * 100).toFixed(1)) : 0;

      broadcastCvrMap.set(b.id, { orders, cvr });
    }
  }

  // 配信統計をまとめる
  const broadcastStats = (broadcastRows || []).map((b: any) => {
    const clicks = broadcastClickMap.get(b.id) || { total: 0, unique: 0, linkIds: [] };
    const cvrData = broadcastCvrMap.get(b.id) || { orders: 0, cvr: 0 };
    const deliveryRate = b.total_targets > 0
      ? Number(((b.sent_count / b.total_targets) * 100).toFixed(1))
      : 0;
    const clickRate = b.sent_count > 0
      ? Number(((clicks.unique / b.sent_count) * 100).toFixed(1))
      : 0;

    return {
      id: b.id,
      name: b.name,
      status: b.status,
      totalTargets: b.total_targets,
      sentCount: b.sent_count,
      failedCount: b.failed_count,
      noUidCount: b.no_uid_count,
      deliveryRate,
      totalClicks: clicks.total,
      uniqueClicks: clicks.unique,
      clickRate,
      orders: cvrData.orders,
      cvr: cvrData.cvr,
      sentAt: b.sent_at || b.created_at,
    };
  });

  // --- 5. KPI集計 ---
  const totalBroadcasts = broadcastStats.length;
  const avgDeliveryRate = totalBroadcasts > 0
    ? Number((broadcastStats.reduce((sum, b) => sum + b.deliveryRate, 0) / totalBroadcasts).toFixed(1))
    : 0;
  const avgClickRate = totalBroadcasts > 0
    ? Number((broadcastStats.reduce((sum, b) => sum + b.clickRate, 0) / totalBroadcasts).toFixed(1))
    : 0;
  // CVRが0でない配信のみの平均
  const cvrBroadcasts = broadcastStats.filter(b => b.uniqueClicks > 0);
  const avgCvr = cvrBroadcasts.length > 0
    ? Number((cvrBroadcasts.reduce((sum, b) => sum + b.cvr, 0) / cvrBroadcasts.length).toFixed(1))
    : 0;

  return NextResponse.json({
    kpi: {
      totalBroadcasts,
      avgDeliveryRate,
      avgClickRate,
      avgCvr,
    },
    broadcastStats,
    chartData,
    dailyStats,
    period: validPeriod,
  });
}
