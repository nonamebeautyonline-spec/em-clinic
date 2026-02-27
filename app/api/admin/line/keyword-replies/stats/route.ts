// app/api/admin/line/keyword-replies/stats/route.ts — キーワード応答の効果分析
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant } from "@/lib/tenant";

/* ---------- GET: キーワードごとの統計データ ---------- */
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = resolveTenantId(req);
  const { searchParams } = new URL(req.url);

  // 期間フィルタ（オプション: days パラメータで直近N日間を指定）
  const days = parseInt(searchParams.get("days") || "30");
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceISO = since.toISOString();

  try {
    // 1. キーワードルール一覧（trigger_count, last_triggered_at を含む）
    const { data: rules, error: rulesErr } = await withTenant(
      supabaseAdmin
        .from("keyword_auto_replies")
        .select("id, name, keyword, match_type, is_enabled, trigger_count, last_triggered_at")
        .order("priority", { ascending: false })
        .order("id", { ascending: true }),
      tenantId
    );

    if (rulesErr) {
      return NextResponse.json({ error: rulesErr.message }, { status: 500 });
    }

    // 2. message_log から keyword_reply_id ごとの集計（指定期間）
    //    keyword_reply_id カラムが存在する場合のみ有効
    const { data: logStats, error: logErr } = await withTenant(
      supabaseAdmin
        .from("message_log")
        .select("keyword_reply_id, sent_at")
        .eq("event_type", "auto_reply")
        .not("keyword_reply_id", "is", null)
        .gte("sent_at", sinceISO),
      tenantId
    );

    if (logErr) {
      console.error("[keyword-stats] message_log クエリエラー:", logErr.message);
    }

    // キーワードルールIDごとのトリガー回数（指定期間内）
    const periodCounts: Record<number, number> = {};
    // 日別トリガー推移
    const dailyTriggers: Record<string, Record<number, number>> = {};

    if (logStats) {
      for (const row of logStats) {
        const ruleId = row.keyword_reply_id as number;
        periodCounts[ruleId] = (periodCounts[ruleId] || 0) + 1;

        // 日別集計
        const date = new Date(row.sent_at).toISOString().slice(0, 10);
        if (!dailyTriggers[date]) dailyTriggers[date] = {};
        dailyTriggers[date][ruleId] = (dailyTriggers[date][ruleId] || 0) + 1;
      }
    }

    // 3. ルールごとの統計データを構築
    const ruleStats = (rules || []).map((rule) => ({
      id: rule.id,
      name: rule.name,
      keyword: rule.keyword,
      match_type: rule.match_type,
      is_enabled: rule.is_enabled,
      // 累計トリガー回数（keyword_auto_replies.trigger_count）
      total_trigger_count: rule.trigger_count || 0,
      // 指定期間内のトリガー回数（message_log ベース）
      period_trigger_count: periodCounts[rule.id] || 0,
      // 最終トリガー日時
      last_triggered_at: rule.last_triggered_at || null,
    }));

    // 4. 日別推移を配列形式に変換
    const dailyData = Object.entries(dailyTriggers)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, counts]) => ({
        date,
        triggers: counts,
        total: Object.values(counts).reduce((sum, c) => sum + c, 0),
      }));

    return NextResponse.json({
      rules: ruleStats,
      daily: dailyData,
      period_days: days,
    });
  } catch (e) {
    console.error("[keyword-stats] エラー:", e);
    return NextResponse.json({ error: "統計データの取得に失敗しました" }, { status: 500 });
  }
}
