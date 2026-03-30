// AI WFM（Workforce Management）指標算出
// ai_tasksテーブルから集計してキュー・担当者・バックログ等の指標を算出

import { supabaseAdmin } from "@/lib/supabase";

// ============================================================
// 型定義
// ============================================================

/** キュー別統計 */
export interface QueueStat {
  queueName: string;
  pendingCount: number;
  assignedCount: number;
  completedCount: number;
  oldestPendingMin: number | null; // 最古の未処理タスクの滞留時間（分）
}

/** 担当者別統計 */
export interface AssigneeStat {
  assigneeId: string;
  pendingCount: number;
  completedCount: number;
  avgCompletionMin: number | null;
}

/** ピーク時間帯 */
export interface PeakHour {
  hour: number; // 0-23
  taskCount: number;
}

/** バックログエイジング */
export interface BacklogAge {
  ageRangeName: string; // "0-1h", "1-4h", "4-24h", "24h+"
  count: number;
}

/** SLA breach予測 */
export interface SLAPrediction {
  taskId: string;
  queueName: string;
  currentAgeMin: number;
  predictedBreachMin: number; // SLA閾値までの残り時間
  risk: "low" | "medium" | "high";
}

/** WFM指標全体 */
export interface WFMMetrics {
  queueStats: QueueStat[];
  assigneeStats: AssigneeStat[];
  peakHours: PeakHour[];
  backlogAging: BacklogAge[];
  slaPredictions: SLAPrediction[];
}

// ============================================================
// SLA閾値定義（分）
// ============================================================

const SLA_THRESHOLDS: Record<string, number> = {
  urgent: 30,
  support: 120,
  staff: 480,
  default: 240,
};

// ============================================================
// バックログエイジング分類（純ロジック、エクスポート）
// ============================================================

/**
 * 滞留時間（分）からエイジングカテゴリを返す
 */
export function classifyAge(ageMin: number): string {
  if (ageMin < 60) return "0-1h";
  if (ageMin < 240) return "1-4h";
  if (ageMin < 1440) return "4-24h";
  return "24h+";
}

/**
 * 未処理タスク一覧からバックログエイジング分布を算出
 */
export function calculateBacklogAging(
  tasks: Array<{ createdAt: string }>
): BacklogAge[] {
  const now = Date.now();
  const buckets: Record<string, number> = {
    "0-1h": 0,
    "1-4h": 0,
    "4-24h": 0,
    "24h+": 0,
  };

  for (const task of tasks) {
    const ageMin = (now - new Date(task.createdAt).getTime()) / 60000;
    const bucket = classifyAge(ageMin);
    buckets[bucket] = (buckets[bucket] || 0) + 1;
  }

  return Object.entries(buckets).map(([ageRangeName, count]) => ({
    ageRangeName,
    count,
  }));
}

// ============================================================
// WFM指標算出メイン
// ============================================================

/**
 * WFM指標を算出（ai_tasksから集計）
 * @param days 対象期間（デフォルト7日）
 */
export async function calculateWFMMetrics(days = 7): Promise<WFMMetrics> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  // タスクデータ取得
  const { data: tasks, error } = await supabaseAdmin
    .from("ai_tasks")
    .select("id, status, queue_name, assignee_id, created_at, completed_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(10000);

  if (error) {
    console.error("[WFM] タスク取得エラー:", error);
    return emptyMetrics();
  }

  if (!tasks || tasks.length === 0) {
    return emptyMetrics();
  }

  const now = Date.now();

  // ============================================================
  // 1. キュー別統計
  // ============================================================
  const queueMap = new Map<string, { pending: number; assigned: number; completed: number; oldestPendingMs: number | null }>();

  for (const t of tasks) {
    const q = t.queue_name || "default";
    if (!queueMap.has(q)) {
      queueMap.set(q, { pending: 0, assigned: 0, completed: 0, oldestPendingMs: null });
    }
    const stat = queueMap.get(q)!;

    if (t.status === "pending") {
      stat.pending++;
      const age = now - new Date(t.created_at).getTime();
      if (stat.oldestPendingMs === null || age > stat.oldestPendingMs) {
        stat.oldestPendingMs = age;
      }
    } else if (t.status === "running") {
      stat.assigned++;
    } else if (t.status === "completed") {
      stat.completed++;
    }
  }

  const queueStats: QueueStat[] = Array.from(queueMap.entries()).map(([queueName, s]) => ({
    queueName,
    pendingCount: s.pending,
    assignedCount: s.assigned,
    completedCount: s.completed,
    oldestPendingMin: s.oldestPendingMs !== null ? Math.round(s.oldestPendingMs / 60000) : null,
  }));

  // ============================================================
  // 2. 担当者別統計
  // ============================================================
  const assigneeMap = new Map<string, { pending: number; completed: number; completionTimes: number[] }>();

  for (const t of tasks) {
    const a = t.assignee_id || "unassigned";
    if (!assigneeMap.has(a)) {
      assigneeMap.set(a, { pending: 0, completed: 0, completionTimes: [] });
    }
    const stat = assigneeMap.get(a)!;

    if (t.status === "pending" || t.status === "running") {
      stat.pending++;
    } else if (t.status === "completed" && t.completed_at) {
      stat.completed++;
      const dur = (new Date(t.completed_at).getTime() - new Date(t.created_at).getTime()) / 60000;
      stat.completionTimes.push(dur);
    }
  }

  const assigneeStats: AssigneeStat[] = Array.from(assigneeMap.entries()).map(([assigneeId, s]) => ({
    assigneeId,
    pendingCount: s.pending,
    completedCount: s.completed,
    avgCompletionMin: s.completionTimes.length > 0
      ? Math.round(s.completionTimes.reduce((a, b) => a + b, 0) / s.completionTimes.length)
      : null,
  }));

  // ============================================================
  // 3. ピーク時間帯
  // ============================================================
  const hourCounts = new Array(24).fill(0);
  for (const t of tasks) {
    const hour = new Date(t.created_at).getHours();
    hourCounts[hour]++;
  }

  const peakHours: PeakHour[] = hourCounts
    .map((taskCount, hour) => ({ hour, taskCount }))
    .filter((h) => h.taskCount > 0)
    .sort((a, b) => b.taskCount - a.taskCount);

  // ============================================================
  // 4. バックログエイジング
  // ============================================================
  const pendingTasks = tasks
    .filter((t) => t.status === "pending" || t.status === "running")
    .map((t) => ({ createdAt: t.created_at }));

  const backlogAging = calculateBacklogAging(pendingTasks);

  // ============================================================
  // 5. SLA breach予測
  // ============================================================
  const slaPredictions: SLAPrediction[] = [];
  const pendingForSLA = tasks.filter((t) => t.status === "pending" || t.status === "running");

  for (const t of pendingForSLA) {
    const q = t.queue_name || "default";
    const slaMin = SLA_THRESHOLDS[q] || SLA_THRESHOLDS.default;
    const currentAgeMin = Math.round((now - new Date(t.created_at).getTime()) / 60000);
    const remainingMin = slaMin - currentAgeMin;

    let risk: "low" | "medium" | "high";
    if (remainingMin <= 0) {
      risk = "high"; // 既にSLA超過
    } else if (remainingMin <= slaMin * 0.3) {
      risk = "medium"; // 残り30%以下
    } else {
      risk = "low";
    }

    // high/medium のみ報告
    if (risk !== "low") {
      slaPredictions.push({
        taskId: t.id,
        queueName: q,
        currentAgeMin,
        predictedBreachMin: Math.max(0, remainingMin),
        risk,
      });
    }
  }

  // risk=high優先でソート
  slaPredictions.sort((a, b) => {
    const riskOrder = { high: 0, medium: 1, low: 2 };
    return riskOrder[a.risk] - riskOrder[b.risk] || a.predictedBreachMin - b.predictedBreachMin;
  });

  return {
    queueStats,
    assigneeStats,
    peakHours,
    backlogAging,
    slaPredictions: slaPredictions.slice(0, 20), // 上位20件
  };
}

// ============================================================
// ヘルパー
// ============================================================

function emptyMetrics(): WFMMetrics {
  return {
    queueStats: [],
    assigneeStats: [],
    peakHours: [],
    backlogAging: [
      { ageRangeName: "0-1h", count: 0 },
      { ageRangeName: "1-4h", count: 0 },
      { ageRangeName: "4-24h", count: 0 },
      { ageRangeName: "24h+", count: 0 },
    ],
    slaPredictions: [],
  };
}
