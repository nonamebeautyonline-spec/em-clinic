import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant } from "@/lib/tenant";
import { getSettingOrEnv } from "@/lib/settings";

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

// 特定日のフォロワー統計を取得
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
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);
  const lineToken = await getSettingOrEnv("line", "channel_access_token", "LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN", tenantId ?? undefined) || "";
  const period = Number(req.nextUrl.searchParams.get("period")) || 7;
  const validPeriod = [7, 30, 90].includes(period) ? period : 7;

  // 1. フォロワー統計（LINE Insight API から過去7日分を並列取得）
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

  // 最新（昨日）の統計
  const stats = dailyStats.length > 0
    ? { followers: dailyStats[0].followers, targetedReaches: dailyStats[0].targetedReaches, blocks: dailyStats[0].blocks }
    : { followers: 0, targetedReaches: 0, blocks: 0 };

  // 2. 今月の送信数
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01T00:00:00`;
  const { count: monthlySent } = await withTenant(
    supabaseAdmin
      .from("message_log")
      .select("id", { count: "exact", head: true })
      .eq("status", "sent")
      .gte("sent_at", monthStart),
    tenantId
  );

  // 3. 最新送信メッセージ10件
  const { data: recentMsgs } = await withTenant(
    supabaseAdmin
      .from("message_log")
      .select("id, patient_id, message_type, content, status, sent_at")
      .order("sent_at", { ascending: false })
      .limit(10),
    tenantId
  );

  // patient_id → patient_name のマッピング（patients テーブルから取得）
  const patientIds = [...new Set((recentMsgs || []).map(m => m.patient_id).filter(Boolean))];
  let nameMap = new Map<string, string>();
  if (patientIds.length > 0) {
    const { data: patientRows } = await fetchAll(() =>
      withTenant(
        supabaseAdmin
          .from("patients")
          .select("patient_id, name")
          .in("patient_id", patientIds),
        tenantId
      )
    );
    for (const row of patientRows || []) {
      if (!nameMap.has(row.patient_id)) {
        nameMap.set(row.patient_id, row.name || "");
      }
    }
  }

  const recentMessages = (recentMsgs || []).map(m => ({
    ...m,
    patient_name: nameMap.get(m.patient_id) || m.patient_id || "—",
  }));

  // 4. チャートデータ（line_daily_stats から指定期間分を取得）
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

  // チャート用データ構築
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

  // 5. 配信別統計（直近20件のbroadcast）
  const { data: broadcastRows } = await withTenant(
    supabaseAdmin
      .from("broadcasts")
      .select("id, name, status, total_targets, sent_count, failed_count, no_uid_count, sent_at, created_at")
      .in("status", ["sent", "sending"])
      .order("created_at", { ascending: false })
      .limit(20),
    tenantId
  );

  // 各broadcastのクリック数を取得
  const broadcastIds = (broadcastRows || []).map((b: any) => b.id);
  let broadcastClickMap = new Map<number, { total: number; unique: number }>();
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

      const { data: clickEvts } = await fetchAll(() =>
        withTenant(
          supabaseAdmin
            .from("click_tracking_events")
            .select("link_id, ip_address")
            .in("link_id", linkIds),
          tenantId
        )
      );

      for (const evt of clickEvts || []) {
        const bid = linkToBroadcast.get(evt.link_id);
        if (bid == null) continue;
        const cur = broadcastClickMap.get(bid) || { total: 0, unique: 0 };
        cur.total++;
        broadcastClickMap.set(bid, cur);
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
        const cur = broadcastClickMap.get(bid) || { total: 0, unique: 0 };
        cur.unique = ips.size;
        broadcastClickMap.set(bid, cur);
      }
    }
  }

  const broadcastStats = (broadcastRows || []).map((b: any) => {
    const clicks = broadcastClickMap.get(b.id) || { total: 0, unique: 0 };
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
      sentAt: b.sent_at || b.created_at,
    };
  });

  return NextResponse.json({
    stats,
    monthlySent: monthlySent || 0,
    dailyStats,
    recentMessages,
    chartData,
    broadcastStats,
  });
}
