/**
 * AI タスク品質スコア（QA Score）算出
 *
 * ai_task_feedback のデータからタスク単位・workflow 単位の
 * QA スコアを計算する。Supabase 直接アクセスなし（純ロジック）。
 */

// ---------------------------------------------------------------------------
// 型定義
// ---------------------------------------------------------------------------

/** フィードバック入力 */
export interface QAScoreInput {
  feedbackType: "approve" | "reject" | "edit" | "escalate";
  rating?: number; // 1-5
  confidence?: number; // 0-1 (classifyResult.confidence)
  failureCategory?: string;
}

/** Workflow 単位の集計結果 */
export interface WorkflowQAMetrics {
  avgScore: number;
  totalFeedback: number;
  approveRate: number;
  rejectRate: number;
  editRate: number;
  escalateRate: number;
  noEvidenceCount: number;
  topFailureCategories: { category: string; count: number }[];
}

/** QA 暫定分類ラベル */
export type QALabel =
  | "wrong_tone"
  | "wrong_routing"
  | "hallucination"
  | "outdated"
  | "no_evidence"
  | "other";

// ---------------------------------------------------------------------------
// フィードバックタイプごとの基礎スコア
// ---------------------------------------------------------------------------

const BASE_SCORES: Record<QAScoreInput["feedbackType"], number> = {
  approve: 100,
  edit: 40,
  escalate: 20,
  reject: 0,
};

// ---------------------------------------------------------------------------
// タスク単位スコア算出（0-100）
// ---------------------------------------------------------------------------

/**
 * 複数フィードバックから平均 QA スコアを返す。
 * - approve: +100, edit: +40, escalate: +20, reject: 0
 * - confidence 加味: score * (0.5 + confidence * 0.5)
 * - rating 加味: score * (rating / 5)
 * - 複数フィードバック時は平均
 */
export function calculateTaskQAScore(feedbacks: QAScoreInput[]): number {
  if (feedbacks.length === 0) return 0;

  let total = 0;
  for (const fb of feedbacks) {
    let score = BASE_SCORES[fb.feedbackType];

    // confidence 加味（未指定時は 1.0 扱い）
    const conf = fb.confidence ?? 1;
    score *= 0.5 + conf * 0.5;

    // rating 加味（未指定時は 5 扱い）
    const rat = fb.rating ?? 5;
    score *= rat / 5;

    total += score;
  }

  return Math.round((total / feedbacks.length) * 100) / 100;
}

// ---------------------------------------------------------------------------
// Workflow 単位の集計
// ---------------------------------------------------------------------------

export function aggregateWorkflowQA(
  feedbacks: Array<QAScoreInput & { taskId: string }>,
): WorkflowQAMetrics {
  const total = feedbacks.length;
  if (total === 0) {
    return {
      avgScore: 0,
      totalFeedback: 0,
      approveRate: 0,
      rejectRate: 0,
      editRate: 0,
      escalateRate: 0,
      noEvidenceCount: 0,
      topFailureCategories: [],
    };
  }

  // タスク別にグルーピングしてスコア算出 → 全タスク平均
  const byTask = new Map<string, QAScoreInput[]>();
  for (const fb of feedbacks) {
    const arr = byTask.get(fb.taskId) ?? [];
    arr.push(fb);
    byTask.set(fb.taskId, arr);
  }

  let scoreSum = 0;
  for (const taskFbs of byTask.values()) {
    scoreSum += calculateTaskQAScore(taskFbs);
  }
  const avgScore = Math.round((scoreSum / byTask.size) * 100) / 100;

  // 各タイプのカウント
  const counts = { approve: 0, reject: 0, edit: 0, escalate: 0 };
  const failureCounts = new Map<string, number>();
  let noEvidenceCount = 0;

  for (const fb of feedbacks) {
    counts[fb.feedbackType]++;
    if (fb.failureCategory) {
      if (fb.failureCategory === "no_evidence") noEvidenceCount++;
      failureCounts.set(
        fb.failureCategory,
        (failureCounts.get(fb.failureCategory) ?? 0) + 1,
      );
    }
  }

  // 失敗カテゴリ上位
  const topFailureCategories = [...failureCounts.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    avgScore,
    totalFeedback: total,
    approveRate: Math.round((counts.approve / total) * 10000) / 100,
    rejectRate: Math.round((counts.reject / total) * 10000) / 100,
    editRate: Math.round((counts.edit / total) * 10000) / 100,
    escalateRate: Math.round((counts.escalate / total) * 10000) / 100,
    noEvidenceCount,
    topFailureCategories,
  };
}

// ---------------------------------------------------------------------------
// QA 暫定分類
// ---------------------------------------------------------------------------

/**
 * フィードバックコメント・却下カテゴリ・トレース警告から QA ラベルを推定する。
 */
export function inferQALabel(
  feedbackComment: string | undefined,
  rejectCategory: string | undefined,
  traceWarnings: string[],
): QALabel {
  // traceWarnings に "evidence" を含む → no_evidence
  if (traceWarnings.some((w) => w.includes("evidence"))) {
    return "no_evidence";
  }

  // コメントと却下カテゴリを結合して検索対象にする
  const text = [feedbackComment ?? "", rejectCategory ?? ""]
    .join(" ")
    .toLowerCase();

  if (
    text.includes("事実と異なる") ||
    text.includes("幻覚") ||
    text.includes("間違い") ||
    text.includes("hallucination")
  ) {
    return "hallucination";
  }

  if (
    text.includes("トーン") ||
    text.includes("口調") ||
    text.includes("言い方")
  ) {
    return "wrong_tone";
  }

  if (
    text.includes("部署") ||
    text.includes("担当") ||
    text.includes("routing")
  ) {
    return "wrong_routing";
  }

  if (
    text.includes("古い") ||
    text.includes("更新") ||
    text.includes("最新")
  ) {
    return "outdated";
  }

  return "other";
}
