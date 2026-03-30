// AI Auto-Tuning: テナント自動最適化提案
// パフォーマンスを分析し、改善提案を生成・管理する

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

/** パフォーマンス分析結果 */
export interface TenantPerformance {
  tenantId: string;
  totalTasks: number;
  approvedCount: number;
  rejectedCount: number;
  editedCount: number;
  approvalRate: number;
  rejectionRate: number;
  avgConfidence: number;
  avgInputTokens: number;
  avgOutputTokens: number;
  totalTokenCost: number;
  topRejectCategories: Array<{ category: string; count: number }>;
}

/** チューニング提案 */
export interface TuningSuggestion {
  id?: number;
  tenant_id: string | null;
  suggestion_type: string;
  current_config: Record<string, unknown>;
  suggested_config: Record<string, unknown>;
  expected_improvement: Record<string, unknown>;
  evidence: Array<Record<string, unknown>>;
  status: string;
  created_at?: string;
}

/**
 * テナントのAIパフォーマンスを分析
 */
export async function analyzeTenantPerformance(
  tenantId: string,
  days = 30,
): Promise<TenantPerformance> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString();

  // ai_tasksの集計
  const { data: tasks, error: taskError } = await supabaseAdmin
    .from("ai_tasks")
    .select("id, status, workflow_type, input_tokens, output_tokens")
    .eq("tenant_id", tenantId)
    .gte("created_at", sinceStr);

  if (taskError) {
    console.error("[AutoTuning] タスク取得エラー:", taskError);
  }

  const taskList = tasks || [];
  const taskIds = taskList.map((t) => t.id);

  // ai_task_feedbackの集計
  let feedbacks: Array<{
    task_id: string;
    feedback_type: string;
    reject_category?: string;
  }> = [];

  if (taskIds.length > 0) {
    // taskIdsが多い場合はフィルタなしで取得してJSでフィルタ
    const { data: fbData, error: fbError } = await supabaseAdmin
      .from("ai_task_feedback")
      .select("task_id, feedback_type, reject_category")
      .gte("created_at", sinceStr);

    if (fbError) {
      console.error("[AutoTuning] フィードバック取得エラー:", fbError);
    }

    const taskIdSet = new Set(taskIds);
    feedbacks = (fbData || []).filter((f) => taskIdSet.has(f.task_id));
  }

  // 集計
  const approvedCount = feedbacks.filter((f) => f.feedback_type === "approve").length;
  const rejectedCount = feedbacks.filter((f) => f.feedback_type === "reject").length;
  const editedCount = feedbacks.filter((f) => f.feedback_type === "edit").length;
  const totalWithFeedback = approvedCount + rejectedCount + editedCount;

  // 却下カテゴリ集計
  const rejectCategoryMap = new Map<string, number>();
  for (const f of feedbacks) {
    if (f.feedback_type === "reject" && f.reject_category) {
      rejectCategoryMap.set(
        f.reject_category,
        (rejectCategoryMap.get(f.reject_category) || 0) + 1,
      );
    }
  }
  const topRejectCategories = Array.from(rejectCategoryMap.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // トークン集計
  const totalInputTokens = taskList.reduce((sum, t) => sum + (t.input_tokens || 0), 0);
  const totalOutputTokens = taskList.reduce((sum, t) => sum + (t.output_tokens || 0), 0);
  const taskCount = taskList.length || 1; // ゼロ除算防止

  // 信頼度はtrace内にあるが簡易的にoutputTokensベースで推定
  // （実際にはtraceからclassifyResult.confidenceを読むのが正確）
  const avgConfidence = totalWithFeedback > 0
    ? approvedCount / totalWithFeedback
    : 0.5;

  return {
    tenantId,
    totalTasks: taskList.length,
    approvedCount,
    rejectedCount,
    editedCount,
    approvalRate: totalWithFeedback > 0 ? approvedCount / totalWithFeedback : 0,
    rejectionRate: totalWithFeedback > 0 ? rejectedCount / totalWithFeedback : 0,
    avgConfidence,
    avgInputTokens: totalInputTokens / taskCount,
    avgOutputTokens: totalOutputTokens / taskCount,
    totalTokenCost: totalInputTokens + totalOutputTokens,
    topRejectCategories,
  };
}

/**
 * パフォーマンス分析から改善提案を生成
 */
export async function generateTuningSuggestions(
  tenantId: string,
  performance: TenantPerformance,
): Promise<TuningSuggestion[]> {
  const suggestions: TuningSuggestion[] = [];

  // 1. 承認率が低い場合 → confidence threshold 調整提案
  if (performance.approvalRate < 0.7 && performance.totalTasks >= 10) {
    suggestions.push({
      tenant_id: tenantId,
      suggestion_type: "confidence_threshold",
      current_config: {
        approval_rate: performance.approvalRate,
        threshold: "auto",
      },
      suggested_config: {
        confidence_threshold: 0.8,
        description: "信頼度閾値を0.8に引き上げ、低品質な自動返信を減らす",
      },
      expected_improvement: {
        approval_rate_delta: "+15-25%",
        tradeoff: "自動返信率が低下する可能性あり",
      },
      evidence: [
        {
          metric: "current_approval_rate",
          value: performance.approvalRate,
          benchmark: 0.85,
        },
      ],
      status: "pending",
    });
  }

  // 2. トークンコストが高い場合 → model routing 変更提案
  if (performance.avgOutputTokens > 500 && performance.totalTasks >= 5) {
    suggestions.push({
      tenant_id: tenantId,
      suggestion_type: "model_routing",
      current_config: {
        avg_output_tokens: performance.avgOutputTokens,
        avg_input_tokens: performance.avgInputTokens,
        total_cost: performance.totalTokenCost,
      },
      suggested_config: {
        use_haiku_for_simple: true,
        description: "単純な問い合わせにはHaikuモデルを使用してコスト削減",
      },
      expected_improvement: {
        cost_reduction: "30-50%",
        tradeoff: "複雑な問い合わせの品質に影響なし",
      },
      evidence: [
        {
          metric: "avg_output_tokens",
          value: performance.avgOutputTokens,
          threshold: 500,
        },
      ],
      status: "pending",
    });
  }

  // 3. 却下率が高い場合 → prompt 改善提案
  if (performance.rejectionRate > 0.3 && performance.totalTasks >= 10) {
    suggestions.push({
      tenant_id: tenantId,
      suggestion_type: "prompt_improvement",
      current_config: {
        rejection_rate: performance.rejectionRate,
        top_reject_categories: performance.topRejectCategories,
      },
      suggested_config: {
        add_examples_for_categories: performance.topRejectCategories.map((c) => c.category),
        description: "却下が多いカテゴリの学習データを追加",
      },
      expected_improvement: {
        rejection_rate_delta: "-10-20%",
        tradeoff: "学習データ追加の作業が必要",
      },
      evidence: [
        {
          metric: "rejection_rate",
          value: performance.rejectionRate,
          threshold: 0.3,
        },
        {
          top_categories: performance.topRejectCategories,
        },
      ],
      status: "pending",
    });
  }

  // 4. 編集率が高い場合 → トーン調整提案
  if (performance.editedCount > 0) {
    const editRate = performance.editedCount / (performance.totalTasks || 1);
    if (editRate > 0.2 && performance.totalTasks >= 10) {
      suggestions.push({
        tenant_id: tenantId,
        suggestion_type: "tone_adjustment",
        current_config: {
          edit_rate: editRate,
          edited_count: performance.editedCount,
        },
        suggested_config: {
          enable_staff_tone_learning: true,
          description: "スタッフの編集パターンから応答トーンを学習",
        },
        expected_improvement: {
          edit_rate_delta: "-10-15%",
          tradeoff: "初期学習に数週間必要",
        },
        evidence: [
          {
            metric: "edit_rate",
            value: editRate,
            threshold: 0.2,
          },
        ],
        status: "pending",
      });
    }
  }

  // DB保存
  if (suggestions.length > 0) {
    const rows = suggestions.map((s) => ({
      tenant_id: s.tenant_id,
      suggestion_type: s.suggestion_type,
      current_config: s.current_config,
      suggested_config: s.suggested_config,
      expected_improvement: s.expected_improvement,
      evidence: s.evidence,
      status: s.status,
    }));

    const { error } = await supabaseAdmin
      .from("ai_tuning_suggestions")
      .insert(rows);

    if (error) {
      console.error("[AutoTuning] 提案保存エラー:", error);
    }
  }

  return suggestions;
}

/**
 * チューニング提案一覧を取得
 */
export async function listSuggestions(
  tenantId?: string,
  status?: string,
): Promise<TuningSuggestion[]> {
  let query = supabaseAdmin
    .from("ai_tuning_suggestions")
    .select("*")
    .order("created_at", { ascending: false });

  if (tenantId) query = query.eq("tenant_id", tenantId);
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) {
    console.error("[AutoTuning] 一覧取得エラー:", error);
    return [];
  }
  return (data || []) as TuningSuggestion[];
}

/**
 * 提案を適用（status → applied）
 */
export async function applySuggestion(suggestionId: number): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from("ai_tuning_suggestions")
    .update({ status: "applied" })
    .eq("id", suggestionId);

  if (error) {
    console.error("[AutoTuning] 適用エラー:", error);
    return false;
  }
  return true;
}

/**
 * 提案を却下（status → rejected）
 */
export async function rejectSuggestion(suggestionId: number): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from("ai_tuning_suggestions")
    .update({ status: "rejected" })
    .eq("id", suggestionId);

  if (error) {
    console.error("[AutoTuning] 却下エラー:", error);
    return false;
  }
  return true;
}
