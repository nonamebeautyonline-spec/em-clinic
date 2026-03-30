// AI Supervisor API: KPI集計 + 異常検知 + SLA監視 + QA分類
import { NextRequest, NextResponse } from "next/server";
import { verifyPlatformAdmin } from "@/lib/platform-auth";
import { unauthorized, serverError } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { calculateOutcomeMetrics } from "@/lib/ai-outcome-evals";
import { runAnomalyDetection, checkSLABreaches } from "@/lib/ai-anomaly-detection";
import { aggregateWorkflowQA, inferQALabel } from "@/lib/ai-qa-score";
import type { QALabel } from "@/lib/ai-qa-score";

/**
 * GET: Supervisor ダッシュボード用データ
 * クエリ: workflow_type?, days?(デフォルト30)
 */
export async function GET(req: NextRequest) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin) return unauthorized();

  const url = new URL(req.url);
  const workflowType = url.searchParams.get("workflow_type") || undefined;
  const days = Math.min(Number(url.searchParams.get("days") || "30"), 365);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  try {
    // 1. タスク取得
    let taskQuery = supabaseAdmin
      .from("ai_tasks")
      .select("id, workflow_type, status, handoff_status, input_tokens, output_tokens, created_at, completed_at, trace")
      .gte("created_at", since);
    if (workflowType) taskQuery = taskQuery.eq("workflow_type", workflowType);
    const { data: tasks, error: taskErr } = await taskQuery;
    if (taskErr) throw taskErr;

    // 2. フィードバック取得
    const { data: feedbacks, error: fbErr } = await supabaseAdmin
      .from("ai_task_feedback")
      .select("id, task_id, feedback_type, rating, comment, reject_category, failure_category, created_at")
      .gte("created_at", since);
    if (fbErr) throw fbErr;

    // task_id → workflow_type マッピング
    const taskMap = new Map<string, string>();
    for (const t of tasks || []) taskMap.set(t.id, t.workflow_type);

    // 3. Outcome Metrics（全体 + workflow別）
    const allOutcome = calculateOutcomeMetrics(tasks || [], feedbacks || []);

    const workflowTypes = [...new Set((tasks || []).map(t => t.workflow_type))];
    const workflowOutcomes: Record<string, ReturnType<typeof calculateOutcomeMetrics>> = {};
    for (const wt of workflowTypes) {
      const wTasks = (tasks || []).filter(t => t.workflow_type === wt);
      const taskIds = new Set(wTasks.map(t => t.id));
      const wFeedbacks = (feedbacks || []).filter(f => taskIds.has(f.task_id));
      workflowOutcomes[wt] = calculateOutcomeMetrics(wTasks, wFeedbacks);
    }

    // 4. 異常検知（日別指標を構築）
    const dailyMap: Record<string, { total: number; completed: number; failed: number; escalated: number; tokens: number }> = {};
    for (const t of tasks || []) {
      const day = t.created_at.slice(0, 10);
      if (!dailyMap[day]) dailyMap[day] = { total: 0, completed: 0, failed: 0, escalated: 0, tokens: 0 };
      dailyMap[day].total++;
      if (t.status === "completed") dailyMap[day].completed++;
      if (t.status === "failed") dailyMap[day].failed++;
      if (t.status === "escalated") dailyMap[day].escalated++;
      dailyMap[day].tokens += (t.input_tokens || 0) + (t.output_tokens || 0);
    }

    const dates = Object.keys(dailyMap).sort();
    const anomalyMetrics: Record<string, Array<{ date: string; value: number }>> = {
      completed_rate: dates.map(d => ({
        date: d,
        value: dailyMap[d].total > 0 ? dailyMap[d].completed / dailyMap[d].total * 100 : 0,
      })),
      failed_rate: dates.map(d => ({
        date: d,
        value: dailyMap[d].total > 0 ? dailyMap[d].failed / dailyMap[d].total * 100 : 0,
      })),
      escalated_rate: dates.map(d => ({
        date: d,
        value: dailyMap[d].total > 0 ? dailyMap[d].escalated / dailyMap[d].total * 100 : 0,
      })),
      token_cost: dates.map(d => ({ date: d, value: dailyMap[d].tokens })),
    };

    const anomalies = runAnomalyDetection(anomalyMetrics);

    // 5. SLA違反チェック
    const slaBreaches = checkSLABreaches(tasks || []);

    // 6. QA分類集計
    const qaLabels: Record<QALabel, number> = {
      wrong_tone: 0, wrong_routing: 0, hallucination: 0, outdated: 0, no_evidence: 0, other: 0,
    };
    const rejectAndEditFeedbacks = (feedbacks || []).filter(
      f => f.feedback_type === "reject" || f.feedback_type === "edit"
    );
    for (const fb of rejectAndEditFeedbacks) {
      // traceからwarningsを取得
      const taskId = fb.task_id;
      const task = (tasks || []).find(t => t.id === taskId);
      const warnings = (task?.trace as { warnings?: string[] })?.warnings || [];
      const label = inferQALabel(fb.comment, fb.reject_category, warnings);
      qaLabels[label]++;
    }

    // 7. Workflow別QAメトリクス
    const workflowQA: Record<string, ReturnType<typeof aggregateWorkflowQA>> = {};
    for (const wt of workflowTypes) {
      const taskIds = new Set((tasks || []).filter(t => t.workflow_type === wt).map(t => t.id));
      const wFeedbacks = (feedbacks || [])
        .filter(f => taskIds.has(f.task_id))
        .map(f => ({
          taskId: f.task_id,
          feedbackType: f.feedback_type as "approve" | "reject" | "edit" | "escalate",
          rating: f.rating ?? undefined,
          failureCategory: f.failure_category ?? undefined,
        }));
      if (wFeedbacks.length > 0) {
        workflowQA[wt] = aggregateWorkflowQA(wFeedbacks);
      }
    }

    // 8. 未確認アラート
    const { data: unackedAlerts } = await supabaseAdmin
      .from("ai_supervisor_alerts")
      .select("*")
      .is("acknowledged_at", null)
      .order("created_at", { ascending: false })
      .limit(20);

    return NextResponse.json({
      ok: true,
      period: { since, days },
      outcomeMetrics: allOutcome,
      workflowOutcomes,
      anomalies,
      slaBreaches: slaBreaches.slice(0, 50),
      qaLabels,
      workflowQA,
      unackedAlerts: unackedAlerts || [],
      summary: {
        totalTasks: (tasks || []).length,
        totalFeedback: (feedbacks || []).length,
        anomalyCount: anomalies.length,
        slaBreachCount: slaBreaches.length,
      },
    });
  } catch (err) {
    console.error("[AI Supervisor] エラー:", err);
    return serverError("Supervisorデータの取得に失敗しました");
  }
}
