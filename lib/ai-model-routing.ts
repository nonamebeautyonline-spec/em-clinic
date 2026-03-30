// AI返信 Case Routing（モデル振り分け）
// 分類結果に基づいてHaiku（高速・低コスト）とSonnet（高精度）を動的に選択

import type { ClassificationResult } from "@/lib/ai-reply-classify";

/** Haiku固定のモデルID */
export const HAIKU_MODEL_ID = "claude-haiku-4-5-20251001" as const;

/** Haiku振り分けの信頼度閾値 */
export const CONFIDENCE_THRESHOLD = 0.8;

/** ルーティング理由コード */
export const ROUTING_REASONS = {
  greeting_any: "greeting_any",
  operational_high_confidence: "operational_high_confidence",
  operational_low_confidence: "operational_low_confidence",
  medical_always_sonnet: "medical_always_sonnet",
  other_escalate: "other_escalate",
  other_high_confidence: "other_high_confidence",
  other_low_confidence: "other_low_confidence",
  classification_failed: "classification_failed",
  routing_disabled: "routing_disabled",
} as const;

export type RoutingReason = (typeof ROUTING_REASONS)[keyof typeof ROUTING_REASONS];

/** ルーティング判定結果 */
export interface RoutingDecision {
  modelId: string;
  routingReason: RoutingReason;
  isHaikuRouted: boolean;
}

/** 統計UI用の日本語ラベル */
export const ROUTING_REASON_LABELS: Record<RoutingReason, string> = {
  greeting_any: "挨拶（Haiku）",
  operational_high_confidence: "運用系・高信頼度（Haiku）",
  operational_low_confidence: "運用系・低信頼度（Sonnet）",
  medical_always_sonnet: "医療系（Sonnet）",
  other_escalate: "エスカレーション（Sonnet）",
  other_high_confidence: "その他・高信頼度（Haiku）",
  other_low_confidence: "その他・低信頼度（Sonnet）",
  classification_failed: "分類失敗（Sonnet）",
  routing_disabled: "ルーティング無効",
};

/**
 * 分類結果に基づいてモデルを決定する
 *
 * ルール:
 * - greeting（任意confidence）→ Haiku
 * - operational（confidence≥0.8）→ Haiku
 * - medical（常に）→ Sonnet
 * - other + escalate_to_staff → Sonnet
 * - other（confidence≥0.8）→ Haiku
 * - 分類失敗 / routing無効 → Sonnet（安全側）
 */
export function resolveModelByRouting(
  classificationResult: ClassificationResult | null,
  sonnetModelId: string,
  caseRoutingEnabled: boolean
): RoutingDecision {
  // ルーティング無効 → 従来通り
  if (!caseRoutingEnabled) {
    return { modelId: sonnetModelId, routingReason: "routing_disabled", isHaikuRouted: false };
  }

  // 分類失敗 → Sonnet（安全側フォールバック）
  if (!classificationResult) {
    return { modelId: sonnetModelId, routingReason: "classification_failed", isHaikuRouted: false };
  }

  const { category, confidence, escalate_to_staff } = classificationResult;

  switch (category) {
    case "greeting":
      return { modelId: HAIKU_MODEL_ID, routingReason: "greeting_any", isHaikuRouted: true };

    case "operational":
      if (confidence >= CONFIDENCE_THRESHOLD) {
        return { modelId: HAIKU_MODEL_ID, routingReason: "operational_high_confidence", isHaikuRouted: true };
      }
      return { modelId: sonnetModelId, routingReason: "operational_low_confidence", isHaikuRouted: false };

    case "medical":
      return { modelId: sonnetModelId, routingReason: "medical_always_sonnet", isHaikuRouted: false };

    case "other":
      if (escalate_to_staff) {
        return { modelId: sonnetModelId, routingReason: "other_escalate", isHaikuRouted: false };
      }
      if (confidence >= CONFIDENCE_THRESHOLD) {
        return { modelId: HAIKU_MODEL_ID, routingReason: "other_high_confidence", isHaikuRouted: true };
      }
      return { modelId: sonnetModelId, routingReason: "other_low_confidence", isHaikuRouted: false };

    default:
      return { modelId: sonnetModelId, routingReason: "classification_failed", isHaikuRouted: false };
  }
}
