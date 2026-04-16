import { NextRequest, NextResponse } from "next/server";
import { unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow, strictWithTenant } from "@/lib/tenant";
import { getSettingOrEnv } from "@/lib/settings";

// Supabaseクエリ結果用の型定義
interface DailyStatRow {
  stat_date: string;
  followers: number;
  targeted_reaches: number;
  blocks: number;
  messages_sent: number;
  total_clicks: number;
  unique_clicks: number;
  blocks_daily?: number;
}

interface BroadcastRow {
  id: number;
  name: string;
  status: string;
  total_targets: number;
  sent_count: number;
  failed_count: number;
  no_uid_count: number;
  sent_at: string | null;
  created_at: string;
}

interface PatientNameRow {
  patient_id: string;
  name: string;
}

// ページネーション結果の型
interface FetchAllResult<T> {
  data: T[];
  error: { message: string } | null;
}

// LINE Follower IDs API でリアルタイムの有効フォロワー数を取得
async function getCurrentFollowerCount(token: string): Promise<number | null> {
  if (!token) return null;
  try {
    let count = 0;
    let next: string | undefined;
    do {
      const url = next
        ? `https://api.line.me/v2/bot/followers/ids?start=${next}&limit=1000`
        : "https://api.line.me/v2/bot/followers/ids?limit=1000";
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      const data = await res.json();
      count += (data.userIds || []).length;
      next = data.next || undefined;
    } while (next);
    return count;
  } catch {
    return null;
  }
}

async function fetchAll<T = Record<string, unknown>>(buildQuery: () => { range: (from: number, to: number) => Promise<{ data: T[] | null; error: { message: string } | null }> }, pageSize = 5000): Promise<FetchAllResult<T>> {
  const all: T[] = [];
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
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const lineToken = await getSettingOrEnv("line", "channel_access_token", "LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN", tenantId ?? undefined) || "";
  const notifyToken = await getSettingOrEnv("line", "notify_channel_access_token", "LINE_NOTIFY_CHANNEL_ACCESS_TOKEN", tenantId ?? undefined) || "";
  const period = Number(req.nextUrl.searchParams.get("period")) || 7;
  const validPeriod = [7, 30, 90].includes(period) ? period : 7;

  // 1. フォロワー統計（LINE Insight API から過去7日分を並列取得）
  const dates: string[] = [];
  for (let i = 1; i <= 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().slice(0, 10).replace(/-/g, ""));
  }

  // LINE Insight API（過去7日）とリアルタイムフォロワー数を並列取得
  const [dailyResults, realtimeCount] = await Promise.all([
    Promise.all(dates.map(d => fetchFollowerStats(d, lineToken))),
    getCurrentFollowerCount(lineToken),
  ]);
  const dailyStats = dailyResults.filter(Boolean) as {
    date: string; followers: number; targetedReaches: number; blocks: number;
  }[];

  // 最新の統計: リアルタイムフォロワー数があればそちらを優先
  const insightStats = dailyStats.length > 0
    ? { followers: dailyStats[0].followers, targetedReaches: dailyStats[0].targetedReaches, blocks: dailyStats[0].blocks }
    : { followers: 0, targetedReaches: 0, blocks: 0 };
  const stats = {
    followers: realtimeCount ?? insightStats.followers,
    targetedReaches: insightStats.targetedReaches,
    blocks: insightStats.blocks,
    // Insight APIの累積友だち数（LINE公式管理画面の「友だち数」と同値 = ブロック込み）
    cumulativeFriends: insightStats.followers,
  };

  // 2. 今月の送信数 + LINE メッセージ残数
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01T00:00:00`;
  const [{ count: monthlySent }, quotaData, consumptionData] = await Promise.all([
    strictWithTenant(
      supabaseAdmin
        .from("message_log")
        .select("id", { count: "exact", head: true })
        .eq("status", "sent")
        .gte("sent_at", monthStart),
      tenantId
    ),
    // LINE メッセージ配信上限
    lineToken
      ? fetch("https://api.line.me/v2/bot/message/quota", {
          headers: { Authorization: `Bearer ${lineToken}` },
        }).then(r => r.ok ? r.json() : null).catch(() => null)
      : Promise.resolve(null),
    // LINE メッセージ配信済み数
    lineToken
      ? fetch("https://api.line.me/v2/bot/message/quota/consumption", {
          headers: { Authorization: `Bearer ${lineToken}` },
        }).then(r => r.ok ? r.json() : null).catch(() => null)
      : Promise.resolve(null),
  ]);

  // 通知bot送信数（トークンがある場合のみ）
  let notifyQuota: { used: number; limit: number | null; remaining: number | null } | null = null;
  if (notifyToken) {
    const [nQuota, nConsumption] = await Promise.all([
      fetch("https://api.line.me/v2/bot/message/quota", {
        headers: { Authorization: `Bearer ${notifyToken}` },
      }).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch("https://api.line.me/v2/bot/message/quota/consumption", {
        headers: { Authorization: `Bearer ${notifyToken}` },
      }).then(r => r.ok ? r.json() : null).catch(() => null),
    ]);
    if (nConsumption) {
      const nLimit = nQuota?.type === "limited" ? (nQuota.value || 0) : null;
      notifyQuota = {
        used: nConsumption.totalUsage || 0,
        limit: nLimit,
        remaining: nLimit != null ? nLimit - (nConsumption.totalUsage || 0) : null,
      };
    }
  }

  // 3. 最新送信メッセージ10件
  const { data: recentMsgs } = await strictWithTenant(
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
    const { data: patientRows } = await fetchAll<PatientNameRow>(() =>
      strictWithTenant(
        supabaseAdmin
          .from("patients")
          .select("patient_id, name")
          .in("patient_id", patientIds),
        tenantId
      ) as unknown as { range: (from: number, to: number) => Promise<{ data: PatientNameRow[] | null; error: { message: string } | null }> }
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

  const { data: chartRows } = await strictWithTenant(
    supabaseAdmin
      .from("line_daily_stats")
      .select("stat_date, followers, targeted_reaches, blocks, messages_sent, total_clicks, unique_clicks")
      .gte("stat_date", periodStartStr)
      .order("stat_date", { ascending: true }),
    tenantId
  );

  // LINE Insight APIのリアルタイムデータで line_daily_stats の欠落日を補完
  const dbDates = new Set((chartRows || []).map((r: DailyStatRow) => r.stat_date));
  const supplementRows = (dailyStats || [])
    .filter(d => !dbDates.has(d.date))
    .map(d => ({
      stat_date: d.date,
      followers: d.followers,
      targeted_reaches: d.targetedReaches,
      blocks: d.blocks,
      messages_sent: 0,
      total_clicks: 0,
      unique_clicks: 0,
    }));
  const allRows: DailyStatRow[] = [...(chartRows || []), ...supplementRows]
    .sort((a: DailyStatRow, b: DailyStatRow) => a.stat_date.localeCompare(b.stat_date));

  // LINE Insight API未準備の直近日をmessage_logのfollow/unfollowイベントで推定補完
  // Vercelサーバーは UTC なので JST(+9h) に変換して日付生成
  const jstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const coveredDates = new Set(allRows.map((r: DailyStatRow) => r.stat_date));
  const estimateDates: string[] = [];
  for (let i = 0; i <= 2; i++) {
    const d = new Date(jstNow);
    d.setDate(d.getDate() - i);
    const ds = d.toISOString().slice(0, 10);
    if (!coveredDates.has(ds) && ds >= periodStartStr) estimateDates.push(ds);
  }

  if (estimateDates.length > 0) {
    const oldest = estimateDates[estimateDates.length - 1];
    // JST日付の開始 = UTC 15:00前日（例: 2/26 JST → 2/25T15:00:00Z）
    const { data: followEvents } = await strictWithTenant(
      supabaseAdmin
        .from("message_log")
        .select("sent_at, event_type")
        .eq("message_type", "event")
        .in("event_type", ["follow", "unfollow"])
        .gte("sent_at", oldest + "T00:00:00+09:00"),
      tenantId
    );

    // 日別のfollow/unfollow集計（sent_atをJST日付に変換）
    const dailyNet = new Map<string, { follows: number; unfollows: number }>();
    for (const evt of followEvents || []) {
      if (!evt.sent_at) continue;
      // UTC → JST変換して日付抽出
      const jstDate = new Date(new Date(evt.sent_at).getTime() + 9 * 60 * 60 * 1000)
        .toISOString().slice(0, 10);
      if (coveredDates.has(jstDate)) continue;
      if (!dailyNet.has(jstDate)) dailyNet.set(jstDate, { follows: 0, unfollows: 0 });
      const entry = dailyNet.get(jstDate)!;
      if (evt.event_type === "follow") entry.follows++;
      else entry.unfollows++;
    }

    // 最新の既知フォロワー数・累積ブロック数をベースに推定値を算出
    const lastKnown = allRows.length > 0 ? allRows[allRows.length - 1] : null;
    let baseFollowers = lastKnown?.followers || stats.followers;
    let baseCumulativeBlocks = lastKnown?.blocks || stats.blocks;
    const sorted = estimateDates.sort();
    for (const date of sorted) {
      const net = dailyNet.get(date) || { follows: 0, unfollows: 0 };
      baseFollowers += net.follows - net.unfollows;
      baseCumulativeBlocks += net.unfollows;
      allRows.push({
        stat_date: date,
        followers: baseFollowers,
        targeted_reaches: 0,
        blocks: baseCumulativeBlocks,
        blocks_daily: net.unfollows,
        messages_sent: 0,
        total_clicks: 0,
        unique_clicks: 0,
      });
    }
    allRows.sort((a: DailyStatRow, b: DailyStatRow) => a.stat_date.localeCompare(b.stat_date));
  }

  // LINE API / line_daily_stats 行に blocks_daily を算出（blocksは累積なので前日差分）
  for (let i = 0; i < allRows.length; i++) {
    if (allRows[i].blocks_daily === undefined) {
      allRows[i].blocks_daily = i > 0
        ? Math.max(0, (allRows[i].blocks || 0) - (allRows[i - 1].blocks || 0))
        : 0;
    }
  }

  // チャート用データ構築
  const chartData = {
    period: validPeriod,
    followerTrend: allRows.map((r: DailyStatRow, i: number, arr: DailyStatRow[]) => ({
      date: r.stat_date,
      followers: r.followers,
      diff: i > 0 ? r.followers - arr[i - 1].followers : 0,
    })),
    deliveryStats: allRows.map((r: DailyStatRow) => ({
      date: r.stat_date,
      sent: r.messages_sent,
    })),
    clickStats: allRows.map((r: DailyStatRow) => ({
      date: r.stat_date,
      clicks: r.total_clicks,
      uniqueClicks: r.unique_clicks,
    })),
    blockStats: allRows.map((r: DailyStatRow) => ({
      date: r.stat_date,
      blocks: r.blocks,
      followers: r.followers,
      blockRate: r.followers > 0 ? Number(((r.blocks / r.followers) * 100).toFixed(2)) : 0,
    })),
  };

  // 5. 配信別統計（直近20件のbroadcast）
  const { data: broadcastRows } = await strictWithTenant(
    supabaseAdmin
      .from("broadcasts")
      .select("id, name, status, total_targets, sent_count, failed_count, no_uid_count, sent_at, created_at")
      .in("status", ["sent", "sending"])
      .order("created_at", { ascending: false })
      .limit(20),
    tenantId
  );

  // 各broadcastのクリック数をRPCで一括取得
  const broadcastIds = (broadcastRows || []).map((b: BroadcastRow) => b.id);
  const broadcastClickMap = new Map<number, { total: number; unique: number }>();
  if (broadcastIds.length > 0) {
    const { data: clickStats } = await supabaseAdmin.rpc("broadcast_click_stats", {
      p_tenant_id: tenantId,
      p_broadcast_ids: broadcastIds,
    });
    if (clickStats && Array.isArray(clickStats)) {
      for (const s of clickStats) {
        broadcastClickMap.set(s.broadcast_id, {
          total: s.total_clicks,
          unique: s.unique_clicks,
        });
      }
    }
  }

  const broadcastStats = (broadcastRows || []).map((b: BroadcastRow) => {
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

  // allRows から統一された dailyStats を構築（詳細タブ用）
  const mergedDailyStats = allRows.map((r: DailyStatRow) => ({
    date: r.stat_date,
    followers: r.followers,
    targetedReaches: r.targeted_reaches || 0,
    blocks: r.blocks || 0,
    blocksDaily: r.blocks_daily || 0,
  })).reverse(); // 降順（新しい日付が先頭）

  // リアルタイム数がない場合のみ、最新推定値でフォールバック
  if (realtimeCount == null) {
    const latestRow = allRows.length > 0 ? allRows[allRows.length - 1] : null;
    if (latestRow) {
      stats.followers = latestRow.followers;
      stats.blocks = latestRow.blocks;
    }
  }

  // LINE メッセージ残数
  const quotaLimit = quotaData?.type === "limited" ? (quotaData.value || 0) : null;
  const quotaUsed = consumptionData?.totalUsage || 0;
  const messageQuota = {
    planType: quotaData?.type || "unknown", // "limited" | "none"(従量課金無制限)
    limit: quotaLimit,
    used: quotaUsed,
    remaining: quotaLimit != null ? quotaLimit - quotaUsed : null,
  };

  return NextResponse.json({
    stats,
    monthlySent: monthlySent || 0,
    messageQuota,
    notifyQuota,
    dailyStats: mergedDailyStats,
    recentMessages,
    chartData,
    broadcastStats,
  });
}
