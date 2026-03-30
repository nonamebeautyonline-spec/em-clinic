// AI ソース重み管理
// 6ソース（faq, rule, approved_reply, memory, state, live_data）の重みを管理

import { supabaseAdmin } from "@/lib/supabase";

/** ソースタイプ一覧 */
export const SOURCE_TYPES = [
  "faq",
  "rule",
  "approved_reply",
  "memory",
  "state",
  "live_data",
] as const;

export type SourceType = (typeof SOURCE_TYPES)[number];

/** 全ソースのデフォルト重み（1.0） */
export const DEFAULT_WEIGHTS: Record<SourceType, number> = {
  faq: 1.0,
  rule: 1.0,
  approved_reply: 1.0,
  memory: 1.0,
  state: 1.0,
  live_data: 1.0,
};

/** ソースタイプの日本語ラベル */
export const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  faq: "FAQ",
  rule: "ルール",
  approved_reply: "承認済み返信",
  memory: "患者メモリ",
  state: "状態",
  live_data: "リアルタイムデータ",
};

/**
 * テナント・workflow別のソース重みを取得
 * DBに未設定の場合はデフォルト（1.0）を返す
 */
export async function getSourceWeights(
  tenantId: string,
  workflowType: string,
): Promise<Record<string, number>> {
  const { data, error } = await supabaseAdmin
    .from("ai_source_weights")
    .select("source_type, weight, is_active")
    .eq("tenant_id", tenantId)
    .eq("workflow_type", workflowType);

  if (error) {
    console.error("[SourceWeights] 取得エラー:", error);
    return { ...DEFAULT_WEIGHTS };
  }

  // デフォルト重みをベースにDB値で上書き
  const weights: Record<string, number> = { ...DEFAULT_WEIGHTS };
  for (const row of data || []) {
    // is_activeがfalseの場合は重み0
    weights[row.source_type] = row.is_active ? Number(row.weight) : 0;
  }

  return weights;
}

/**
 * ソース重みを設定（upsert）
 */
export async function setSourceWeight(
  tenantId: string,
  workflowType: string,
  sourceType: string,
  weight: number,
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("ai_source_weights")
    .upsert(
      {
        tenant_id: tenantId,
        workflow_type: workflowType,
        source_type: sourceType,
        weight,
        is_active: weight > 0,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "tenant_id,workflow_type,source_type" },
    );

  if (error) {
    console.error("[SourceWeights] 設定エラー:", error);
    throw new Error("ソース重みの設定に失敗しました");
  }
}

/**
 * 全ソース重みを一括取得（管理画面用）
 */
export async function listAllSourceWeights(
  tenantId?: string,
): Promise<Array<{
  id: number;
  tenant_id: string;
  workflow_type: string;
  source_type: string;
  weight: number;
  is_active: boolean;
  updated_at: string;
}>> {
  let query = supabaseAdmin
    .from("ai_source_weights")
    .select("*")
    .order("workflow_type")
    .order("source_type");

  if (tenantId) {
    query = query.eq("tenant_id", tenantId);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[SourceWeights] 一覧取得エラー:", error);
    return [];
  }
  return data || [];
}

/**
 * ソース結果にウェイトを適用
 * 各ソースのスコア（relevance等）にweightを乗算する
 */
export function applySourceWeights(
  sources: Record<string, Array<{ score?: number; relevance?: number; [key: string]: unknown }>>,
  weights: Record<string, number>,
): Record<string, Array<{ score?: number; relevance?: number; [key: string]: unknown }>> {
  const result: Record<string, Array<{ score?: number; relevance?: number; [key: string]: unknown }>> = {};

  for (const [sourceType, items] of Object.entries(sources)) {
    const weight = weights[sourceType] ?? 1.0;

    // 重み0のソースは除外
    if (weight === 0) {
      result[sourceType] = [];
      continue;
    }

    result[sourceType] = items.map((item) => {
      const weighted = { ...item };
      if (typeof weighted.score === "number") {
        weighted.score = weighted.score * weight;
      }
      if (typeof weighted.relevance === "number") {
        weighted.relevance = weighted.relevance * weight;
      }
      return weighted;
    });
  }

  return result;
}
