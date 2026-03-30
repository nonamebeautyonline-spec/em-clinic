// AI返信 Auto Optimization（Phase 3-4）
// A/Bテスト実験管理: config振り分け → assignment保存 → 結果集計

import { supabaseAdmin } from "@/lib/supabase";
import { strictWithTenant, tenantPayload } from "@/lib/tenant";

export interface ExperimentConfig {
  // 実験で変更可能なパラメータ
  rag_similarity_threshold?: number;
  rag_max_examples?: number;
  rag_max_kb_chunks?: number;
  model_id?: string;
}

export interface Experiment {
  id: number;
  experiment_name: string;
  config: { control: ExperimentConfig; variant: ExperimentConfig };
  traffic_ratio: number;
  status: string;
  started_at: string | null;
  ended_at: string | null;
}

/**
 * 実行中の実験を取得（テナント単位、最大1つ）
 */
export async function getRunningExperiment(
  tenantId: string | null
): Promise<Experiment | null> {
  const { data } = await strictWithTenant(
    supabaseAdmin
      .from("ai_reply_experiments")
      .select("*")
      .eq("status", "running")
      .order("started_at", { ascending: false })
      .limit(1),
    tenantId
  );

  return (data && data.length > 0) ? data[0] as Experiment : null;
}

/**
 * トラフィック比率に基づいてvariantを選択
 */
export function selectVariant(
  experiment: Experiment
): { variantKey: string; config: ExperimentConfig } {
  const isVariant = Math.random() < experiment.traffic_ratio;
  return {
    variantKey: isVariant ? "variant" : "control",
    config: isVariant ? experiment.config.variant : experiment.config.control,
  };
}

/**
 * ドラフトを実験に割り当て
 */
export async function assignDraftToExperiment(params: {
  tenantId: string | null;
  draftId: number;
  experimentId: number;
  variantKey: string;
}): Promise<void> {
  try {
    await supabaseAdmin
      .from("ai_reply_experiment_assignments")
      .insert({
        ...tenantPayload(params.tenantId),
        draft_id: params.draftId,
        experiment_id: params.experimentId,
        variant_key: params.variantKey,
      });
  } catch (err) {
    console.error("[Experiment] 割当保存エラー:", err);
  }
}

/**
 * 実験結果を集計
 */
export async function aggregateExperimentResults(
  experimentId: number,
  tenantId: string | null
): Promise<{
  control: VariantStats;
  variant: VariantStats;
}> {
  // 割当一覧を取得
  const { data: assignments } = await strictWithTenant(
    supabaseAdmin
      .from("ai_reply_experiment_assignments")
      .select("draft_id, variant_key")
      .eq("experiment_id", experimentId),
    tenantId
  );

  if (!assignments || assignments.length === 0) {
    return { control: emptyStats(), variant: emptyStats() };
  }

  const controlDraftIds = assignments.filter(a => a.variant_key === "control").map(a => a.draft_id);
  const variantDraftIds = assignments.filter(a => a.variant_key === "variant").map(a => a.draft_id);

  const [controlStats, variantStats] = await Promise.all([
    calculateVariantStats(controlDraftIds, tenantId),
    calculateVariantStats(variantDraftIds, tenantId),
  ]);

  return { control: controlStats, variant: variantStats };
}

interface VariantStats {
  total: number;
  sent: number;
  rejected: number;
  approvalRate: number;
  avgConfidence: number;
  avgInputTokens: number;
  avgOutputTokens: number;
}

function emptyStats(): VariantStats {
  return { total: 0, sent: 0, rejected: 0, approvalRate: 0, avgConfidence: 0, avgInputTokens: 0, avgOutputTokens: 0 };
}

async function calculateVariantStats(
  draftIds: number[],
  tenantId: string | null
): Promise<VariantStats> {
  if (draftIds.length === 0) return emptyStats();

  const { data } = await strictWithTenant(
    supabaseAdmin
      .from("ai_reply_drafts")
      .select("status, confidence, input_tokens, output_tokens")
      .in("id", draftIds),
    tenantId
  );

  if (!data || data.length === 0) return emptyStats();

  const total = data.length;
  const sent = data.filter(d => d.status === "sent").length;
  const rejected = data.filter(d => d.status === "rejected").length;
  const approvalRate = total > 0 ? (sent / total) * 100 : 0;
  const avgConfidence = data.reduce((s, d) => s + (d.confidence || 0), 0) / total;
  const avgInputTokens = data.reduce((s, d) => s + (d.input_tokens || 0), 0) / total;
  const avgOutputTokens = data.reduce((s, d) => s + (d.output_tokens || 0), 0) / total;

  return {
    total,
    sent,
    rejected,
    approvalRate: Number(approvalRate.toFixed(1)),
    avgConfidence: Number(avgConfidence.toFixed(3)),
    avgInputTokens: Math.round(avgInputTokens),
    avgOutputTokens: Math.round(avgOutputTokens),
  };
}

/**
 * 結果に基づく最適化提案を生成
 */
export function generateSuggestion(
  control: VariantStats,
  variant: VariantStats
): string | null {
  if (control.total < 10 || variant.total < 10) {
    return "サンプル数不足: 各variant最低10件のデータが必要です。";
  }

  const approvalDiff = variant.approvalRate - control.approvalRate;
  const confidenceDiff = variant.avgConfidence - control.avgConfidence;

  if (approvalDiff > 5 && confidenceDiff > 0) {
    return `variant推奨: 承認率が${approvalDiff.toFixed(1)}%高く、信頼度も向上しています。variantの設定を本番適用することを推奨します。`;
  }

  if (approvalDiff < -5) {
    return `control維持推奨: variantは承認率が${Math.abs(approvalDiff).toFixed(1)}%低下しています。現行設定を維持することを推奨します。`;
  }

  return `有意差なし: 承認率の差は${Math.abs(approvalDiff).toFixed(1)}%で、有意な差は見られません。実験を継続するか、別のパラメータで再実験することを推奨します。`;
}
