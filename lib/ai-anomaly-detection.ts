/**
 * AI 異常検知（Anomaly Detection）
 *
 * 7日移動平均との差分で指標の異常を検知する。
 * SLA 違反チェック機能も含む。Supabase 直接アクセスなし（純ロジック）。
 */

// ---------------------------------------------------------------------------
// 型定義
// ---------------------------------------------------------------------------

/** 日次メトリクス */
export interface DailyMetric {
  date: string; // YYYY-MM-DD
  value: number;
}

/** 異常検知結果 */
export interface AnomalyResult {
  isAnomaly: boolean;
  metricName: string;
  currentValue: number;
  baselineValue: number; // 7日平均
  deviation: number; // 偏差率 (%)
  severity: "warning" | "critical";
}

/** SLA 違反結果 */
export interface SLABreachResult {
  taskId: string;
  workflowType: string;
  status: string;
  handoffStatus: string;
  createdAt: string;
  staleDurationMin: number;
  severity: "warning" | "critical";
}

/** 異常検知の閾値設定 */
interface AnomalyThresholds {
  warningPct?: number; // デフォルト 30%
  criticalPct?: number; // デフォルト 50%
}

/** SLA 違反の閾値設定 */
interface SLAThresholds {
  warningMin?: number; // デフォルト 60分
  criticalMin?: number; // デフォルト 240分
}

// ---------------------------------------------------------------------------
// 7日移動平均の計算
// ---------------------------------------------------------------------------

/**
 * 日付昇順ソート済み配列から直近 N 日分の平均を返す。
 * latest は除外して過去 windowSize 日分を使う。
 */
function computeMovingAverage(
  sorted: DailyMetric[],
  windowSize: number,
): number | null {
  // 最新日を除いた過去データ
  if (sorted.length < 2) return null;

  const past = sorted.slice(0, -1).slice(-windowSize);
  if (past.length === 0) return null;

  const sum = past.reduce((acc, m) => acc + m.value, 0);
  return sum / past.length;
}

// ---------------------------------------------------------------------------
// 単一指標の異常検知
// ---------------------------------------------------------------------------

/**
 * 直近 1 日と過去 7 日平均を比較し、閾値を超えたら異常と判定する。
 * - 偏差率 = |current - baseline| / baseline * 100
 * - baseline が 0 の場合は current > 0 なら warning
 * - データが不足（2日未満）の場合は null を返す
 */
export function detectAnomaly(
  metricName: string,
  dailyValues: DailyMetric[],
  thresholds?: AnomalyThresholds,
): AnomalyResult | null {
  if (dailyValues.length < 2) return null;

  const warningPct = thresholds?.warningPct ?? 30;
  const criticalPct = thresholds?.criticalPct ?? 50;

  // 日付昇順ソート
  const sorted = [...dailyValues].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  const current = sorted[sorted.length - 1].value;
  const baseline = computeMovingAverage(sorted, 7);

  if (baseline === null) return null;

  // baseline が 0 の特殊ケース
  if (baseline === 0) {
    if (current > 0) {
      return {
        isAnomaly: true,
        metricName,
        currentValue: current,
        baselineValue: 0,
        deviation: 100,
        severity: "warning",
      };
    }
    // current も 0 → 異常なし
    return null;
  }

  const deviation =
    Math.round((Math.abs(current - baseline) / baseline) * 10000) / 100;

  if (deviation >= criticalPct) {
    return {
      isAnomaly: true,
      metricName,
      currentValue: current,
      baselineValue: Math.round(baseline * 100) / 100,
      deviation,
      severity: "critical",
    };
  }

  if (deviation >= warningPct) {
    return {
      isAnomaly: true,
      metricName,
      currentValue: current,
      baselineValue: Math.round(baseline * 100) / 100,
      deviation,
      severity: "warning",
    };
  }

  return null;
}

// ---------------------------------------------------------------------------
// 複数指標を一括チェック
// ---------------------------------------------------------------------------

/**
 * Record<指標名, 日次データ配列> を受け取り、異常が検出された指標のみ返す。
 */
export function runAnomalyDetection(
  metrics: Record<string, DailyMetric[]>,
  thresholds?: AnomalyThresholds,
): AnomalyResult[] {
  const results: AnomalyResult[] = [];

  for (const [name, values] of Object.entries(metrics)) {
    const result = detectAnomaly(name, values, thresholds);
    if (result) {
      results.push(result);
    }
  }

  // critical を先に表示
  results.sort((a, b) => {
    if (a.severity === "critical" && b.severity !== "critical") return -1;
    if (a.severity !== "critical" && b.severity === "critical") return 1;
    return b.deviation - a.deviation;
  });

  return results;
}

// ---------------------------------------------------------------------------
// SLA 違反チェック
// ---------------------------------------------------------------------------

/**
 * 未完了かつ handoff_status が "pending" のタスクが閾値を超えて滞留していないか検査。
 * - デフォルト: warning=60分, critical=240分
 */
export function checkSLABreaches(
  tasks: Array<{
    id: string;
    workflow_type: string;
    status: string;
    handoff_status: string;
    created_at: string;
  }>,
  thresholds?: SLAThresholds,
): SLABreachResult[] {
  const warningMin = thresholds?.warningMin ?? 60;
  const criticalMin = thresholds?.criticalMin ?? 240;
  const now = Date.now();

  const results: SLABreachResult[] = [];

  for (const task of tasks) {
    // 完了済み・スキップ済みは対象外
    if (task.status === "completed" || task.status === "skipped") continue;
    // handoff_status が pending 以外は対象外
    if (task.handoff_status !== "pending") continue;

    const createdAt = new Date(task.created_at).getTime();
    const staleDurationMin = Math.round((now - createdAt) / 60000);

    if (staleDurationMin < warningMin) continue;

    const severity: "warning" | "critical" =
      staleDurationMin >= criticalMin ? "critical" : "warning";

    results.push({
      taskId: task.id,
      workflowType: task.workflow_type,
      status: task.status,
      handoffStatus: task.handoff_status,
      createdAt: task.created_at,
      staleDurationMin,
      severity,
    });
  }

  // critical → warning、滞留時間降順
  results.sort((a, b) => {
    if (a.severity === "critical" && b.severity !== "critical") return -1;
    if (a.severity !== "critical" && b.severity === "critical") return 1;
    return b.staleDurationMin - a.staleDurationMin;
  });

  return results;
}
