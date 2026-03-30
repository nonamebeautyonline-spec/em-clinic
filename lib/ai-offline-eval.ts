// Offline Eval Runner（Phase 3）
// A/B設定比較: eval run作成 → サンプルタスク選定 → 結果保存 → 集計

import { supabaseAdmin } from "@/lib/supabase";
import { tenantPayload } from "@/lib/tenant";

// ---------- 型定義 ----------

export interface EvalRun {
  id: number;
  tenant_id: string | null;
  eval_name: string;
  config_a: Record<string, unknown>;
  config_b: Record<string, unknown>;
  status: "running" | "completed" | "failed";
  total_cases: number;
  completed_cases: number;
  results_summary: Record<string, unknown>;
  created_at: string;
  completed_at: string | null;
}

export interface EvalResult {
  id: number;
  eval_run_id: number;
  original_task_id: string;
  config_key: "a" | "b";
  output: Record<string, unknown> | null;
  scores: Record<string, unknown>;
  created_at: string;
}

export interface EvalSummary {
  config_a: EvalConfigStats;
  config_b: EvalConfigStats;
  winner: "a" | "b" | "tie";
  improvement_pct: number;
}

export interface EvalConfigStats {
  count: number;
  avg_score: number;
  avg_latency: number;
  avg_token_count: number;
}

// ---------- Eval Run 作成 ----------

/**
 * eval run作成 + サンプルタスク選定
 */
export async function createEvalRun(
  tenantId: string | null,
  evalName: string,
  configA: Record<string, unknown>,
  configB: Record<string, unknown>,
  sampleSize: number = 50
): Promise<EvalRun> {
  // サンプルタスクを取得（完了済みタスクから最新をsampleSize件）
  let taskQuery = supabaseAdmin
    .from("ai_tasks")
    .select("id")
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(sampleSize);

  if (tenantId) {
    taskQuery = taskQuery.eq("tenant_id", tenantId);
  }

  const { data: tasks } = await taskQuery;
  const totalCases = tasks?.length || 0;

  // eval run 保存
  const { data, error } = await supabaseAdmin
    .from("ai_eval_runs")
    .insert({
      ...tenantPayload(tenantId),
      eval_name: evalName,
      config_a: configA,
      config_b: configB,
      status: "running",
      total_cases: totalCases,
      completed_cases: 0,
      results_summary: {},
    })
    .select()
    .single();

  if (error) {
    console.error("[OfflineEval] 作成エラー:", error);
    throw new Error(`Eval run作成に失敗しました: ${error.message}`);
  }

  return data as EvalRun;
}

// ---------- Eval Run 一覧 ----------

/**
 * eval run一覧を取得
 */
export async function getEvalRuns(
  tenantId: string | null,
  limit: number = 20
): Promise<EvalRun[]> {
  let query = supabaseAdmin
    .from("ai_eval_runs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (tenantId) {
    query = query.eq("tenant_id", tenantId);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[OfflineEval] 一覧取得エラー:", error);
    return [];
  }

  return (data || []) as EvalRun[];
}

// ---------- Eval Run 詳細 ----------

/**
 * eval run詳細（結果含む）
 */
export async function getEvalRunDetail(
  evalRunId: number
): Promise<{ run: EvalRun; results: EvalResult[] } | null> {
  const { data: run, error: runError } = await supabaseAdmin
    .from("ai_eval_runs")
    .select("*")
    .eq("id", evalRunId)
    .single();

  if (runError || !run) return null;

  const { data: results } = await supabaseAdmin
    .from("ai_eval_results")
    .select("*")
    .eq("eval_run_id", evalRunId)
    .order("created_at", { ascending: true });

  return {
    run: run as EvalRun,
    results: (results || []) as EvalResult[],
  };
}

// ---------- 個別結果保存 ----------

/**
 * 個別eval結果を保存
 */
export async function processEvalCase(
  evalRunId: number,
  taskId: string,
  configKey: "a" | "b",
  output: Record<string, unknown>,
  scores: Record<string, unknown>
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("ai_eval_results")
    .insert({
      eval_run_id: evalRunId,
      original_task_id: taskId,
      config_key: configKey,
      output,
      scores,
    });

  if (error) {
    console.error("[OfflineEval] 結果保存エラー:", error);
    throw new Error(`結果保存に失敗しました: ${error.message}`);
  }

  // completed_casesをインクリメント（直接更新）
  const { data: currentRun } = await supabaseAdmin
    .from("ai_eval_runs")
    .select("completed_cases")
    .eq("id", evalRunId)
    .single();
  if (currentRun) {
    await supabaseAdmin
      .from("ai_eval_runs")
      .update({ completed_cases: (currentRun.completed_cases || 0) + 1 })
      .eq("id", evalRunId);
  }
}

// ---------- Eval 完了処理 ----------

/**
 * eval完了処理（results_summary集計、status→completed）
 */
export async function completeEvalRun(
  evalRunId: number
): Promise<EvalRun> {
  const summary = await summarizeEvalResults(evalRunId);

  const { data, error } = await supabaseAdmin
    .from("ai_eval_runs")
    .update({
      status: "completed",
      results_summary: summary,
      completed_at: new Date().toISOString(),
    })
    .eq("id", evalRunId)
    .select()
    .single();

  if (error) {
    console.error("[OfflineEval] 完了処理エラー:", error);
    throw new Error(`完了処理に失敗しました: ${error.message}`);
  }

  return data as EvalRun;
}

// ---------- A/B比較サマリー ----------

/**
 * A/B比較サマリーを生成
 */
export async function summarizeEvalResults(
  evalRunId: number
): Promise<EvalSummary> {
  const { data: results } = await supabaseAdmin
    .from("ai_eval_results")
    .select("config_key, scores")
    .eq("eval_run_id", evalRunId);

  const rows = results || [];
  const aResults = rows.filter(r => r.config_key === "a");
  const bResults = rows.filter(r => r.config_key === "b");

  const statsA = calculateConfigStats(aResults);
  const statsB = calculateConfigStats(bResults);

  // 勝者判定（avg_scoreベース）
  let winner: "a" | "b" | "tie" = "tie";
  let improvementPct = 0;

  if (statsA.avg_score > 0 || statsB.avg_score > 0) {
    if (statsB.avg_score > statsA.avg_score * 1.05) {
      winner = "b";
      improvementPct = statsA.avg_score > 0
        ? ((statsB.avg_score - statsA.avg_score) / statsA.avg_score) * 100
        : 100;
    } else if (statsA.avg_score > statsB.avg_score * 1.05) {
      winner = "a";
      improvementPct = statsB.avg_score > 0
        ? ((statsA.avg_score - statsB.avg_score) / statsB.avg_score) * 100
        : 100;
    }
  }

  return {
    config_a: statsA,
    config_b: statsB,
    winner,
    improvement_pct: Number(improvementPct.toFixed(1)),
  };
}

// ---------- 内部ヘルパー ----------

function calculateConfigStats(
  results: Array<{ scores: Record<string, unknown> }>
): EvalConfigStats {
  if (results.length === 0) {
    return { count: 0, avg_score: 0, avg_latency: 0, avg_token_count: 0 };
  }

  const count = results.length;
  let totalScore = 0;
  let totalLatency = 0;
  let totalTokens = 0;

  for (const r of results) {
    const scores = r.scores as Record<string, number>;
    totalScore += scores.overall_score || scores.score || 0;
    totalLatency += scores.latency_ms || 0;
    totalTokens += scores.token_count || 0;
  }

  return {
    count,
    avg_score: Number((totalScore / count).toFixed(3)),
    avg_latency: Math.round(totalLatency / count),
    avg_token_count: Math.round(totalTokens / count),
  };
}
