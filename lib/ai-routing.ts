// AI キュールーティング
// workflow_type と handoff_summary からキュー名・優先度を決定する

import { supabaseAdmin } from "@/lib/supabase";

// キュー定義
export const QUEUE_DEFINITIONS = {
  support: {
    name: "support",
    label: "サポート",
    description: "一般的なサポート問い合わせ",
    defaultPriority: 50,
  },
  sales: {
    name: "sales",
    label: "セールス",
    description: "契約・導入相談",
    defaultPriority: 50,
  },
  onboarding: {
    name: "onboarding",
    label: "オンボーディング",
    description: "新規テナントの初期設定支援",
    defaultPriority: 60,
  },
  incident: {
    name: "incident",
    label: "インシデント",
    description: "障害・緊急対応",
    defaultPriority: 90,
  },
} as const;

export type QueueName = keyof typeof QUEUE_DEFINITIONS;

// workflow_type → キュー名のマッピング
const WORKFLOW_QUEUE_MAP: Record<string, QueueName> = {
  "support-intake": "support",
  "sales-intake": "sales",
  "onboarding-intake": "onboarding",
  "line-reply": "support",
};

// urgency → 優先度のマッピング
const URGENCY_PRIORITY_MAP: Record<string, number> = {
  critical: 90,
  high: 70,
  medium: 50,
  low: 30,
};

/**
 * ワークフロー種別とハンドオフサマリーからキュー名・優先度を決定
 */
export function determineQueue(
  workflowType: string,
  handoffSummary?: { targetId?: string; urgency?: string; context?: Record<string, unknown> },
): { queueName: string; priority: number } {
  // incident_suspected の場合はインシデントキュー
  const context = handoffSummary?.context ?? {};
  if (context.incident_suspected || workflowType.includes("incident")) {
    return { queueName: "incident", priority: 90 };
  }

  // workflow_type からキュー決定
  const queueName = WORKFLOW_QUEUE_MAP[workflowType] ?? "support";
  const queueDef = QUEUE_DEFINITIONS[queueName as QueueName];
  let priority: number = queueDef?.defaultPriority ?? 50;

  // urgency による優先度上書き
  if (handoffSummary?.urgency) {
    const urgencyPriority = URGENCY_PRIORITY_MAP[handoffSummary.urgency];
    if (urgencyPriority !== undefined) {
      priority = urgencyPriority;
    }
  }

  return { queueName, priority };
}

/**
 * 優先度からラベルを返す
 */
export function getPriorityLabel(priority: number): string {
  if (priority >= 90) return "critical";
  if (priority >= 70) return "high";
  if (priority >= 50) return "medium";
  return "low";
}

/**
 * キューごとの統計情報を取得
 */
export async function getQueueStats(queueName?: string): Promise<
  Array<{
    queueName: string;
    pending: number;
    assigned: number;
    completed: number;
  }>
> {
  try {
    let query = supabaseAdmin
      .from("ai_tasks")
      .select("queue_name, status")
      .not("queue_name", "is", null);

    if (queueName) {
      query = query.eq("queue_name", queueName);
    }

    const { data, error } = await query.limit(100000);
    if (error) {
      console.error("[ai-routing] キュー統計取得エラー:", error);
      return [];
    }

    // キュー別に集計
    const statsMap = new Map<string, { pending: number; assigned: number; completed: number }>();
    for (const row of data ?? []) {
      const qn = row.queue_name as string;
      if (!statsMap.has(qn)) {
        statsMap.set(qn, { pending: 0, assigned: 0, completed: 0 });
      }
      const stat = statsMap.get(qn)!;
      const status = row.status as string;
      if (status === "pending" || status === "running" || status === "escalated") {
        // assignee_id があれば assigned、なければ pending（ここでは status で判定）
        stat.pending++;
      } else if (status === "completed") {
        stat.completed++;
      }
    }

    // assignee_id 有無で pending/assigned を区別する別クエリ
    const { data: assignedData } = await supabaseAdmin
      .from("ai_tasks")
      .select("queue_name")
      .not("queue_name", "is", null)
      .not("assignee_id", "is", null)
      .in("status", ["pending", "running", "escalated"])
      .limit(100000);

    const assignedCounts = new Map<string, number>();
    for (const row of assignedData ?? []) {
      const qn = row.queue_name as string;
      assignedCounts.set(qn, (assignedCounts.get(qn) ?? 0) + 1);
    }

    // assigned数をpendingから引いて正しく分配
    const result: Array<{ queueName: string; pending: number; assigned: number; completed: number }> = [];
    for (const [qn, stat] of statsMap) {
      const assigned = assignedCounts.get(qn) ?? 0;
      result.push({
        queueName: qn,
        pending: Math.max(0, stat.pending - assigned),
        assigned,
        completed: stat.completed,
      });
    }

    return result;
  } catch (err) {
    console.error("[ai-routing] キュー統計取得エラー:", err);
    return [];
  }
}
