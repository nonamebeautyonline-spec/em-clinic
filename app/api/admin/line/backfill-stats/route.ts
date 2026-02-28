// app/api/admin/line/backfill-stats/route.ts
// LINE Insight APIから過去データをバックフィルする管理用エンドポイント
// 使い方: GET /api/admin/line/backfill-stats?days=30
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant, tenantPayload } from "@/lib/tenant";
import { getSettingOrEnv } from "@/lib/settings";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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

export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);
  const lineToken = await getSettingOrEnv(
    "line", "channel_access_token",
    "LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN",
    tenantId ?? undefined
  ) || "";

  if (!lineToken) {
    return NextResponse.json({ error: "LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN not configured" }, { status: 500 });
  }

  const days = parseInt(req.nextUrl.searchParams.get("days") || "30", 10);
  const jstOffset = 9 * 60 * 60 * 1000;
  const results: { date: string; status: string; followers?: number }[] = [];

  for (let i = 1; i <= days; i++) {
    const targetDate = new Date(Date.now() + jstOffset - i * 24 * 60 * 60 * 1000);
    const dateStr = targetDate.toISOString().slice(0, 10).replace(/-/g, "");
    const statDate = `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;

    // 既に収集済みならスキップ
    const { data: existing } = await withTenant(
      supabaseAdmin
        .from("line_daily_stats")
        .select("id")
        .eq("stat_date", statDate)
        .maybeSingle(),
      tenantId
    );
    if (existing) {
      results.push({ date: statDate, status: "skipped" });
      continue;
    }

    // LINE Insight API
    const followerStats = await fetchFollowerStats(dateStr, lineToken);
    if (!followerStats) {
      results.push({ date: statDate, status: "not_ready" });
      continue;
    }

    // message_log から送信数
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

    // click_tracking_events からクリック数
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

    const { error } = await supabaseAdmin
      .from("line_daily_stats")
      .insert({
        ...tenantPayload(tenantId),
        stat_date: statDate,
        followers: followerStats.followers,
        targeted_reaches: followerStats.targetedReaches,
        blocks: followerStats.blocks,
        messages_sent: messagesSent || 0,
        total_clicks: totalClicks,
        unique_clicks: uniqueClicks,
      });

    if (error) {
      results.push({ date: statDate, status: `error: ${error.message}` });
    } else {
      results.push({ date: statDate, status: "inserted", followers: followerStats.followers });
    }

    // LINE APIレートリミット対策（100ms待機）
    await new Promise(r => setTimeout(r, 100));
  }

  console.log(`[backfill-stats] completed: ${results.filter(r => r.status === "inserted").length} inserted, ${results.filter(r => r.status === "skipped").length} skipped`);
  return NextResponse.json({ ok: true, results });
}
