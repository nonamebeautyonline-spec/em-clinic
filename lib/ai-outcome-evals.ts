/**
 * AI Outcome 指標の定義と集計
 *
 * ai_tasks と ai_task_feedback のデータから Outcome 指標を算出し、
 * 期間比較を行う。Supabase 直接アクセスなし（純ロジック）。
 */

// ---------------------------------------------------------------------------
// 型定義
// ---------------------------------------------------------------------------

/** Outcome 指標 */
export interface OutcomeMetrics {
  approvalRate: number; // 承認率 (%)
  rejectionRate: number; // 却下率 (%)
  editRate: number; // 修正率 (%)
  escalationRate: number; // エスカレーション率 (%)
  resolutionRate: number; // 解決率 (handoff_status=resolved / total) (%)
  humanInterventionRate: number; // 人手介入率 (edit+escalate+reject / total) (%)
  avgCompletionTimeSec: number | null; // 平均完了時間（秒）
  avgInputTokens: number; // 平均入力トークン数
  avgOutputTokens: number; // 平均出力トークン数
  avgConfidence: number | null; // 平均信頼度
}

/** 期間比較結果 */
export interface OutcomeComparison {
  current: OutcomeMetrics;
  previous: OutcomeMetrics;
  changes: Record<
    keyof OutcomeMetrics,
    { delta: number; improved: boolean } | null
  >;
}

// ---------------------------------------------------------------------------
// タスク・フィードバック入力型
// ---------------------------------------------------------------------------

interface TaskInput {
  id: string;
  status: string;
  handoff_status: string;
  input_tokens: number;
  output_tokens: number;
  created_at: string;
  completed_at: string | null;
  trace: { classifyResult?: { confidence?: number } } | null;
}

interface FeedbackInput {
  task_id: string;
  feedback_type: string;
}

// ---------------------------------------------------------------------------
// パーセント計算ユーティリティ
// ---------------------------------------------------------------------------

function pct(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return Math.round((numerator / denominator) * 10000) / 100;
}

// ---------------------------------------------------------------------------
// Outcome 指標算出
// ---------------------------------------------------------------------------

/**
 * ai_tasks と ai_task_feedback のデータから Outcome 指標を算出する。
 */
export function calculateOutcomeMetrics(
  tasks: TaskInput[],
  feedbacks: FeedbackInput[],
): OutcomeMetrics {
  const totalTasks = tasks.length;

  if (totalTasks === 0) {
    return {
      approvalRate: 0,
      rejectionRate: 0,
      editRate: 0,
      escalationRate: 0,
      resolutionRate: 0,
      humanInterventionRate: 0,
      avgCompletionTimeSec: null,
      avgInputTokens: 0,
      avgOutputTokens: 0,
      avgConfidence: null,
    };
  }

  // フィードバック集計（タスク単位で最新を採用するため task_id でグルーピング）
  const fbByType = { approve: 0, reject: 0, edit: 0, escalate: 0 };
  const totalFeedback = feedbacks.length;

  for (const fb of feedbacks) {
    const t = fb.feedback_type as keyof typeof fbByType;
    if (t in fbByType) {
      fbByType[t]++;
    }
  }

  // 解決率: handoff_status === "resolved" のタスク数 / 全タスク数
  const resolvedCount = tasks.filter(
    (t) => t.handoff_status === "resolved",
  ).length;

  // 人手介入率: (edit + escalate + reject) / 全フィードバック数
  const humanIntervention =
    fbByType.edit + fbByType.escalate + fbByType.reject;

  // 平均完了時間（秒）
  const completedTasks = tasks.filter((t) => t.completed_at !== null);
  let avgCompletionTimeSec: number | null = null;
  if (completedTasks.length > 0) {
    const totalSec = completedTasks.reduce((acc, t) => {
      const created = new Date(t.created_at).getTime();
      const completed = new Date(t.completed_at!).getTime();
      return acc + (completed - created) / 1000;
    }, 0);
    avgCompletionTimeSec =
      Math.round((totalSec / completedTasks.length) * 100) / 100;
  }

  // 平均トークン数
  const avgInputTokens =
    Math.round(
      (tasks.reduce((acc, t) => acc + t.input_tokens, 0) / totalTasks) * 100,
    ) / 100;
  const avgOutputTokens =
    Math.round(
      (tasks.reduce((acc, t) => acc + t.output_tokens, 0) / totalTasks) * 100,
    ) / 100;

  // 平均信頼度
  const confidences = tasks
    .map((t) => t.trace?.classifyResult?.confidence)
    .filter((c): c is number => c !== undefined && c !== null);
  const avgConfidence =
    confidences.length > 0
      ? Math.round(
          (confidences.reduce((a, b) => a + b, 0) / confidences.length) * 1000,
        ) / 1000
      : null;

  // フィードバックベースの率（フィードバック総数が分母）
  const fbDenom = totalFeedback || 1; // 0除算回避（率は0になる）

  return {
    approvalRate: pct(fbByType.approve, fbDenom),
    rejectionRate: pct(fbByType.reject, fbDenom),
    editRate: pct(fbByType.edit, fbDenom),
    escalationRate: pct(fbByType.escalate, fbDenom),
    resolutionRate: pct(resolvedCount, totalTasks),
    humanInterventionRate: pct(humanIntervention, fbDenom),
    avgCompletionTimeSec,
    avgInputTokens,
    avgOutputTokens,
    avgConfidence,
  };
}

// ---------------------------------------------------------------------------
// 期間比較
// ---------------------------------------------------------------------------

/**
 * 前期と今期の OutcomeMetrics を比較し、各指標の変化量と改善方向を返す。
 */
export function compareOutcomes(
  current: OutcomeMetrics,
  previous: OutcomeMetrics,
): OutcomeComparison {
  // 各指標の「改善方向」定義（true=値が上がると良い、false=値が下がると良い）
  const higherIsBetter: Record<keyof OutcomeMetrics, boolean> = {
    approvalRate: true,
    rejectionRate: false,
    editRate: false,
    escalationRate: false,
    resolutionRate: true,
    humanInterventionRate: false,
    avgCompletionTimeSec: false, // 短い方が良い
    avgInputTokens: false, // 少ない方がコスト効率良い
    avgOutputTokens: false,
    avgConfidence: true,
  };

  const keys = Object.keys(higherIsBetter) as Array<keyof OutcomeMetrics>;
  const changes = {} as Record<
    keyof OutcomeMetrics,
    { delta: number; improved: boolean } | null
  >;

  for (const key of keys) {
    const cur = current[key];
    const prev = previous[key];

    // どちらかが null なら比較不可
    if (cur === null || prev === null) {
      changes[key] = null;
      continue;
    }

    const delta = Math.round((cur - prev) * 100) / 100;
    const improved = higherIsBetter[key] ? delta > 0 : delta < 0;

    changes[key] = { delta, improved };
  }

  return { current, previous, changes };
}
