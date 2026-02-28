// app/api/cron/collect-line-stats/route.ts — 日次LINE統計収集Cron
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { withTenant, tenantPayload } from "@/lib/tenant";
import { getSettingOrEnv } from "@/lib/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// LINE Insight API からフォロワー統計を取得
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
      followers: data.followers || 0,
      targetedReaches: data.targetedReaches || 0,
      blocks: data.blocks || 0,
    };
  } catch {
    return null;
  }
}

// 1テナント分の統計を収集
async function collectForTenant(tenantId: string, dateStr: string, statDate: string) {
  const lineToken = await getSettingOrEnv(
    "line", "channel_access_token",
    "LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN",
    tenantId
  ) || "";

  // 既に収集済みならスキップ
  const { data: existing } = await withTenant(
    supabaseAdmin
      .from("line_daily_stats")
      .select("id")
      .eq("stat_date", statDate)
      .maybeSingle(),
    tenantId
  );
  if (existing) return { skipped: true };

  // 1. LINE Insight API からフォロワー統計
  const followerStats = await fetchFollowerStats(dateStr, lineToken);

  // 2. message_log から昨日の送信数
  const dayStart = `${statDate}T00:00:00+09:00`;
  const dayEnd = `${statDate}T23:59:59+09:00`;
  const { count: messagesSent } = await withTenant(
    supabaseAdmin
      .from("message_log")
      .select("id", { count: "exact", head: true })
      .eq("status", "sent")
      .eq("direction", "outgoing")
      .gte("sent_at", dayStart)
      .lte("sent_at", dayEnd),
    tenantId
  );

  // 3. click_tracking_events から昨日のクリック数
  const { data: clickEvents } = await withTenant(
    supabaseAdmin
      .from("click_tracking_events")
      .select("id, ip_address")
      .gte("clicked_at", dayStart)
      .lte("clicked_at", dayEnd),
    tenantId
  );
  const totalClicks = clickEvents?.length || 0;
  const uniqueClicks = new Set((clickEvents || []).map(e => e.ip_address)).size;

  // line_daily_stats に保存
  const { error } = await supabaseAdmin
    .from("line_daily_stats")
    .insert({
      ...tenantPayload(tenantId),
      stat_date: statDate,
      followers: followerStats?.followers || 0,
      targeted_reaches: followerStats?.targetedReaches || 0,
      blocks: followerStats?.blocks || 0,
      messages_sent: messagesSent || 0,
      total_clicks: totalClicks,
      unique_clicks: uniqueClicks,
    });

  if (error) {
    console.error(`[collect-line-stats] insert error tenant=${tenantId}:`, error.message);
    return { error: error.message };
  }

  console.log(`[collect-line-stats] tenant=${tenantId} ${statDate}: followers=${followerStats?.followers || 0}, sent=${messagesSent || 0}, clicks=${totalClicks}`);
  return { ok: true };
}

export async function GET(req: NextRequest) {
  // Vercel Cron認証
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 昨日の日付（JST）
    const now = new Date();
    const jstOffset = 9 * 60 * 60 * 1000;
    const yesterday = new Date(now.getTime() + jstOffset - 24 * 60 * 60 * 1000);
    const dateStr = yesterday.toISOString().slice(0, 10).replace(/-/g, "");
    const statDate = `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;

    // 全アクティブテナントを取得してループ
    const { data: tenants } = await supabaseAdmin
      .from("tenants")
      .select("id")
      .eq("is_active", true);

    if (!tenants?.length) {
      return NextResponse.json({ ok: true, message: "アクティブなテナントなし" });
    }

    let collected = 0;
    let skipped = 0;
    let errors = 0;

    for (const tenant of tenants) {
      try {
        const result = await collectForTenant(tenant.id, dateStr, statDate);
        if (result.skipped) skipped++;
        else if (result.error) errors++;
        else collected++;
      } catch (e: any) {
        console.error(`[collect-line-stats] tenant=${tenant.id} error:`, e.message);
        errors++;
      }
    }

    return NextResponse.json({ ok: true, date: statDate, collected, skipped, errors });
  } catch (e: any) {
    console.error("[collect-line-stats] cron error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
