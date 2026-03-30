// app/api/admin/line/ai-supervisor/route.ts — AI Supervisor Dashboard用API
import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow, strictWithTenant } from "@/lib/tenant";
import {
  ESTIMATED_COST_PER_INPUT_TOKEN,
  ESTIMATED_COST_PER_OUTPUT_TOKEN,
} from "@/lib/ai-cost-constants";

/**
 * GET: AI Supervisorダッシュボード用集計データ取得
 */
export async function GET(req: NextRequest) {
  // 認証チェック
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) {
    return unauthorized();
  }

  const tenantId = resolveTenantIdOrThrow(req);

  // 過去30日分の期間
  const periodStart = new Date();
  periodStart.setDate(periodStart.getDate() - 30);
  const periodStartStr = periodStart.toISOString().slice(0, 10);

  try {
    const { data: drafts, error } = await strictWithTenant(
      supabaseAdmin
        .from("ai_reply_drafts")
        .select("id, status, model_used, input_tokens, output_tokens, created_at, sent_at, modified_reply")
        .gte("created_at", `${periodStartStr}T00:00:00Z`)
        .order("created_at", { ascending: true }),
      tenantId
    );

    if (error) {
      console.error("[ai-supervisor] GET error:", error);
      return serverError("データ取得に失敗しました");
    }

    const rows = drafts || [];

    // --- 1. 日次集計 ---
    const dailyMap = new Map<string, {
      total: number;
      sent: number;
      rejected: number;
      cost: number;
      modified: number;
    }>();

    for (const r of rows) {
      const date = r.created_at.slice(0, 10);
      if (!dailyMap.has(date)) {
        dailyMap.set(date, { total: 0, sent: 0, rejected: 0, cost: 0, modified: 0 });
      }
      const day = dailyMap.get(date)!;
      day.total++;
      if (r.status === "sent") day.sent++;
      if (r.status === "rejected") day.rejected++;
      if (r.modified_reply) day.modified++;
      day.cost +=
        (r.input_tokens || 0) * ESTIMATED_COST_PER_INPUT_TOKEN +
        (r.output_tokens || 0) * ESTIMATED_COST_PER_OUTPUT_TOKEN;
    }

    // --- 2. 日次配列（ソート済み） ---
    const dailyArray = Array.from(dailyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, d]) => ({
        date,
        total: d.total,
        approvalRate: d.total > 0 ? d.sent / d.total : 0,
        cost: Number(d.cost.toFixed(4)),
      }));

    // --- 3. 7日移動平均 ---
    const approvalRateTrend: { date: string; rate: number; movingAvg7d: number | null }[] = [];
    const costTrend: { date: string; cost: number; movingAvg7d: number | null }[] = [];

    for (let i = 0; i < dailyArray.length; i++) {
      const d = dailyArray[i];
      const rate = d.approvalRate;

      // 7日移動平均計算
      let rateAvg: number | null = null;
      let costAvg: number | null = null;

      if (i >= 6) {
        const window = dailyArray.slice(i - 6, i + 1);
        rateAvg = Number(
          (window.reduce((sum, w) => sum + w.approvalRate, 0) / 7).toFixed(4)
        );
        costAvg = Number(
          (window.reduce((sum, w) => sum + w.cost, 0) / 7).toFixed(4)
        );
      }

      approvalRateTrend.push({ date: d.date, rate, movingAvg7d: rateAvg });
      costTrend.push({ date: d.date, cost: d.cost, movingAvg7d: costAvg });
    }

    // --- 4. 今日のKPI ---
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayData = dailyMap.get(todayStr);
    const todayKpi = todayData
      ? {
          total: todayData.total,
          approvalRate: todayData.total > 0 ? todayData.sent / todayData.total : 0,
          cost: Number(todayData.cost.toFixed(4)),
        }
      : { total: 0, approvalRate: 0, cost: 0 };

    // --- 5. アラート判定 ---
    const alerts: { type: string; level: "warning" | "critical"; message: string }[] = [];

    // 承認率アラート
    if (approvalRateTrend.length > 0) {
      const latest = approvalRateTrend[approvalRateTrend.length - 1];
      if (latest.movingAvg7d !== null) {
        if (latest.rate < 0.5) {
          alerts.push({
            type: "approval_rate",
            level: "critical",
            message: `承認率が${(latest.rate * 100).toFixed(1)}%に低下（移動平均: ${(latest.movingAvg7d * 100).toFixed(1)}%）`,
          });
        } else if (latest.rate < latest.movingAvg7d * 0.8) {
          alerts.push({
            type: "approval_rate",
            level: "warning",
            message: `承認率が移動平均の80%を下回っています（${(latest.rate * 100).toFixed(1)}% < ${(latest.movingAvg7d * 0.8 * 100).toFixed(1)}%）`,
          });
        }
      }
    }

    // コストアラート（前週平均比較）
    if (costTrend.length >= 8) {
      const latestCost = costTrend[costTrend.length - 1];
      // 前週7日間（最新日を除く直近7日）のコスト平均
      const prevWeek = costTrend.slice(-8, -1);
      const prevWeekAvgCost = prevWeek.reduce((sum, c) => sum + c.cost, 0) / prevWeek.length;
      if (prevWeekAvgCost > 0 && latestCost.cost > prevWeekAvgCost * 2) {
        alerts.push({
          type: "cost",
          level: "warning",
          message: `本日のコスト($${latestCost.cost.toFixed(4)})が前週平均($${prevWeekAvgCost.toFixed(4)})の2倍超`,
        });
      }
    }

    // --- 6. モデル別比較 ---
    const modelMap = new Map<string, {
      sent: number;
      total: number;
      totalCost: number;
    }>();

    for (const r of rows) {
      const model = r.model_used || "unknown";
      if (!modelMap.has(model)) {
        modelMap.set(model, { sent: 0, total: 0, totalCost: 0 });
      }
      const entry = modelMap.get(model)!;
      entry.total++;
      if (r.status === "sent") entry.sent++;
      entry.totalCost +=
        (r.input_tokens || 0) * ESTIMATED_COST_PER_INPUT_TOKEN +
        (r.output_tokens || 0) * ESTIMATED_COST_PER_OUTPUT_TOKEN;
    }

    const modelComparison = Array.from(modelMap.entries()).map(([model, m]) => ({
      model,
      approvalRate: m.total > 0 ? Number((m.sent / m.total).toFixed(4)) : 0,
      avgCost: m.total > 0 ? Number((m.totalCost / m.total).toFixed(6)) : 0,
      count: m.total,
    }));

    return NextResponse.json({
      todayKpi,
      approvalRateTrend,
      costTrend,
      alerts,
      modelComparison,
    });
  } catch (err) {
    console.error("[ai-supervisor] GET unexpected error:", err);
    return serverError("予期しないエラーが発生しました");
  }
}
