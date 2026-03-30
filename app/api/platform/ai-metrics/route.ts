// AI Metrics API: workflow別の統計・フィードバック集計
import { NextRequest, NextResponse } from "next/server";
import { verifyPlatformAdmin } from "@/lib/platform-auth";
import { unauthorized, serverError } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * GET: workflow別メトリクス
 * クエリパラメータ:
 *   - workflow_type: 特定workflowに絞り込み（任意）
 *   - days: 集計期間（デフォルト30日）
 */
export async function GET(req: NextRequest) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin) return unauthorized();

  const url = new URL(req.url);
  const workflowType = url.searchParams.get("workflow_type") || undefined;
  const days = Math.min(Number(url.searchParams.get("days") || "30"), 365);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  try {
    // 1. タスク統計（workflow_type別、idも含む）
    let taskQuery = supabaseAdmin
      .from("ai_tasks")
      .select("id, workflow_type, status, input_tokens, output_tokens, handoff_status, created_at")
      .gte("created_at", since);
    if (workflowType) taskQuery = taskQuery.eq("workflow_type", workflowType);
    const { data: tasks, error: taskError } = await taskQuery;
    if (taskError) throw taskError;

    // 2. フィードバック統計
    const fbQuery = supabaseAdmin
      .from("ai_task_feedback")
      .select("task_id, feedback_type, rating, created_at")
      .gte("created_at", since);
    const { data: feedbacks, error: fbError } = await fbQuery;
    if (fbError) throw fbError;

    // task_id → workflow_type マッピング
    const taskWorkflowMap = new Map<string, string>();
    for (const t of tasks || []) {
      taskWorkflowMap.set(t.id, t.workflow_type);
    }

    // workflow別に集計
    const workflowMetrics: Record<string, {
      totalTasks: number;
      completed: number;
      failed: number;
      skipped: number;
      escalated: number;
      totalInputTokens: number;
      totalOutputTokens: number;
      approveCount: number;
      rejectCount: number;
      editCount: number;
      escalateCount: number;
      totalFeedback: number;
      avgRating: number | null;
      approvalRate: number | null;
      handoffAccepted: number;
      handoffResolved: number;
    }> = {};

    const getOrCreate = (wt: string) => {
      if (!workflowMetrics[wt]) {
        workflowMetrics[wt] = {
          totalTasks: 0, completed: 0, failed: 0, skipped: 0, escalated: 0,
          totalInputTokens: 0, totalOutputTokens: 0,
          approveCount: 0, rejectCount: 0, editCount: 0, escalateCount: 0,
          totalFeedback: 0, avgRating: null,
          approvalRate: null, handoffAccepted: 0, handoffResolved: 0,
        };
      }
      return workflowMetrics[wt];
    };

    // タスク集計
    for (const t of tasks || []) {
      const m = getOrCreate(t.workflow_type);
      m.totalTasks++;
      if (t.status === "completed") m.completed++;
      if (t.status === "failed") m.failed++;
      if (t.status === "skipped") m.skipped++;
      if (t.status === "escalated") m.escalated++;
      m.totalInputTokens += t.input_tokens || 0;
      m.totalOutputTokens += t.output_tokens || 0;
      if (t.handoff_status === "accepted") m.handoffAccepted++;
      if (t.handoff_status === "resolved") m.handoffResolved++;
    }

    // フィードバック集計
    const ratings: Record<string, number[]> = {};
    for (const fb of feedbacks || []) {
      const wt = taskWorkflowMap.get(fb.task_id);
      if (!wt) continue;
      if (workflowType && wt !== workflowType) continue;
      const m = getOrCreate(wt);
      m.totalFeedback++;
      if (fb.feedback_type === "approve") m.approveCount++;
      if (fb.feedback_type === "reject") m.rejectCount++;
      if (fb.feedback_type === "edit") m.editCount++;
      if (fb.feedback_type === "escalate") m.escalateCount++;
      if (fb.rating != null) {
        if (!ratings[wt]) ratings[wt] = [];
        ratings[wt].push(fb.rating);
      }
    }

    // 計算
    for (const [wt, m] of Object.entries(workflowMetrics)) {
      if (m.totalFeedback > 0) {
        m.approvalRate = Math.round((m.approveCount / m.totalFeedback) * 100);
      }
      if (ratings[wt] && ratings[wt].length > 0) {
        m.avgRating = Math.round((ratings[wt].reduce((a, b) => a + b, 0) / ratings[wt].length) * 10) / 10;
      }
    }

    // 日別トレンド（直近days日分、全体）
    const dailyMap: Record<string, { total: number; completed: number; failed: number; tokens: number }> = {};
    for (const t of tasks || []) {
      const day = t.created_at.slice(0, 10);
      if (!dailyMap[day]) dailyMap[day] = { total: 0, completed: 0, failed: 0, tokens: 0 };
      dailyMap[day].total++;
      if (t.status === "completed") dailyMap[day].completed++;
      if (t.status === "failed") dailyMap[day].failed++;
      dailyMap[day].tokens += (t.input_tokens || 0) + (t.output_tokens || 0);
    }

    // 日付順にソート
    const dailyTrend = Object.entries(dailyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, stats]) => ({ date, ...stats }));

    return NextResponse.json({
      ok: true,
      period: { since, days },
      workflowMetrics,
      dailyTrend,
      summary: {
        totalTasks: (tasks || []).length,
        totalFeedback: (feedbacks || []).length,
        totalTokens: (tasks || []).reduce((s, t) => s + (t.input_tokens || 0) + (t.output_tokens || 0), 0),
      },
    });
  } catch (err) {
    console.error("[AI Metrics] エラー:", err);
    return serverError("メトリクスの取得に失敗しました");
  }
}
