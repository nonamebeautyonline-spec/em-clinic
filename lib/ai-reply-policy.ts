// AI返信 Policy Engine（Phase 2-3）
// 分類結果に基づいてルールベースの自動判定を行い、
// auto_reply_ok / approval_required / escalate_to_staff / block を決定

import { supabaseAdmin } from "@/lib/supabase";
import { strictWithTenant, tenantPayload } from "@/lib/tenant";
import type { ClassificationResult } from "@/lib/ai-reply-classify";

export type PolicyDecision = "auto_reply_ok" | "approval_required" | "escalate_to_staff" | "block";

export interface PolicyRule {
  id: number;
  rule_name: string;
  rule_type: string;
  priority: number;
  conditions: PolicyConditions;
  action: PolicyAction;
  is_active: boolean;
}

interface PolicyConditions {
  category?: string | string[];
  key_topics_contains?: string[];
  confidence_below?: number;
  escalate_to_staff?: boolean;
}

interface PolicyAction {
  decision: PolicyDecision;
  message?: string;
  force_mode?: string;
}

export interface PolicyEvalResult {
  decision: PolicyDecision;
  ruleHits: Array<{ rule_id: number; rule_name: string; rule_type: string }>;
  escalationReason: string | null;
}

/**
 * ポリシー評価: 分類結果に対してルールを優先度順に適用
 */
export async function evaluatePolicy(
  classification: ClassificationResult,
  tenantId: string | null
): Promise<PolicyEvalResult> {
  // デフォルト結果（ルールなし or マッチなし → 現行のモード設定に委任）
  const defaultResult: PolicyEvalResult = {
    decision: "auto_reply_ok",
    ruleHits: [],
    escalationReason: null,
  };

  try {
    // アクティブなルールを優先度順に取得
    const { data: rules, error } = await strictWithTenant(
      supabaseAdmin
        .from("ai_reply_policy_rules")
        .select("id, rule_name, rule_type, priority, conditions, action, is_active")
        .eq("is_active", true)
        .order("priority", { ascending: true }),
      tenantId
    );

    if (error || !rules || rules.length === 0) {
      return defaultResult;
    }

    const ruleHits: PolicyEvalResult["ruleHits"] = [];
    let finalDecision: PolicyDecision = "auto_reply_ok";
    let escalationReason: string | null = null;

    for (const rule of rules as PolicyRule[]) {
      if (matchesConditions(rule.conditions, classification)) {
        ruleHits.push({
          rule_id: rule.id,
          rule_name: rule.rule_name,
          rule_type: rule.rule_type,
        });

        const actionDecision = rule.action.decision;
        // 最も制限的なdecisionを採用（block > escalate > approval_required > auto_reply_ok）
        if (getDecisionPriority(actionDecision) > getDecisionPriority(finalDecision)) {
          finalDecision = actionDecision;
          if (actionDecision === "escalate_to_staff" || actionDecision === "block") {
            escalationReason = rule.action.message || rule.rule_name;
          }
        }
      }
    }

    return { decision: finalDecision, ruleHits, escalationReason };
  } catch (err) {
    console.error("[PolicyEngine] 評価エラー:", err);
    return defaultResult;
  }
}

/**
 * ルール条件マッチング
 */
function matchesConditions(
  conditions: PolicyConditions,
  classification: ClassificationResult
): boolean {
  // カテゴリマッチ
  if (conditions.category) {
    const cats = Array.isArray(conditions.category) ? conditions.category : [conditions.category];
    if (!cats.includes(classification.category)) return false;
  }

  // キートピック含有チェック
  if (conditions.key_topics_contains && conditions.key_topics_contains.length > 0) {
    const topics = classification.key_topics.map(t => t.toLowerCase());
    const required = conditions.key_topics_contains.map(t => t.toLowerCase());
    const hasMatch = required.some(req => topics.some(t => t.includes(req)));
    if (!hasMatch) return false;
  }

  // 信頼度閾値
  if (conditions.confidence_below != null) {
    if (classification.confidence >= conditions.confidence_below) return false;
  }

  // エスカレーションフラグ
  if (conditions.escalate_to_staff === true) {
    if (!classification.escalate_to_staff) return false;
  }

  return true;
}

/**
 * decisionの制限度順位（高い = より制限的）
 */
function getDecisionPriority(decision: PolicyDecision): number {
  switch (decision) {
    case "block": return 4;
    case "escalate_to_staff": return 3;
    case "approval_required": return 2;
    case "auto_reply_ok": return 1;
    default: return 0;
  }
}

/**
 * ポリシーログ保存
 */
export async function savePolicyLog(params: {
  tenantId: string | null;
  draftId: number;
  patientId: string;
  evalResult: PolicyEvalResult;
}): Promise<void> {
  try {
    await supabaseAdmin
      .from("ai_reply_policy_logs")
      .insert({
        ...tenantPayload(params.tenantId),
        draft_id: params.draftId,
        patient_id: params.patientId,
        matched_rules: params.evalResult.ruleHits,
        final_decision: params.evalResult.decision,
      });
  } catch (err) {
    console.error("[PolicyEngine] ログ保存エラー:", err);
  }
}
