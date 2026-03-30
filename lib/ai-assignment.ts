// AI タスクアサイン管理
// タスクの担当者割当・解除・負荷確認

import { supabaseAdmin } from "@/lib/supabase";

/**
 * タスクを特定の担当者にアサイン
 */
export async function assignTask(
  taskId: string,
  assigneeId: string,
  assignedBy: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabaseAdmin
      .from("ai_tasks")
      .update({
        assignee_id: assigneeId,
        assigned_at: new Date().toISOString(),
        assigned_by: assignedBy,
      })
      .eq("id", taskId);

    if (error) {
      console.error("[ai-assignment] アサインエラー:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("[ai-assignment] アサインエラー:", err);
    return { success: false, error: err instanceof Error ? err.message : "不明なエラー" };
  }
}

/**
 * タスクのアサインを解除
 */
export async function unassignTask(
  taskId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabaseAdmin
      .from("ai_tasks")
      .update({
        assignee_id: null,
        assigned_at: null,
        assigned_by: null,
      })
      .eq("id", taskId);

    if (error) {
      console.error("[ai-assignment] アサイン解除エラー:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("[ai-assignment] アサイン解除エラー:", err);
    return { success: false, error: err instanceof Error ? err.message : "不明なエラー" };
  }
}

/**
 * 各担当者の未完了タスク件数を取得
 */
export async function getAssigneeWorkload(
  assigneeIds: string[],
): Promise<Map<string, number>> {
  const workloadMap = new Map<string, number>();

  // 初期値を0で設定
  for (const id of assigneeIds) {
    workloadMap.set(id, 0);
  }

  if (assigneeIds.length === 0) return workloadMap;

  try {
    // 未完了ステータスのタスクを取得
    const { data, error } = await supabaseAdmin
      .from("ai_tasks")
      .select("assignee_id")
      .not("assignee_id", "is", null)
      .in("status", ["pending", "running", "escalated"])
      .limit(100000);

    if (error) {
      console.error("[ai-assignment] ワークロード取得エラー:", error);
      return workloadMap;
    }

    // assigneeIdsのSetでフィルタリング
    const targetSet = new Set(assigneeIds);
    for (const row of data ?? []) {
      const aid = row.assignee_id as string;
      if (targetSet.has(aid)) {
        workloadMap.set(aid, (workloadMap.get(aid) ?? 0) + 1);
      }
    }

    return workloadMap;
  } catch (err) {
    console.error("[ai-assignment] ワークロード取得エラー:", err);
    return workloadMap;
  }
}

/**
 * 自動アサイン（最も負荷の低い担当者に割当）
 * 注: ai_queue_members テーブルは未実装のため、現在はキューに積むだけ
 */
export async function autoAssign(
  taskId: string,
  queueName: string,
): Promise<{ success: boolean; assigneeId?: string; error?: string }> {
  try {
    // キュー名を設定（担当者テーブルが未実装のため、キューに積むのみ）
    const { error } = await supabaseAdmin
      .from("ai_tasks")
      .update({
        queue_name: queueName,
      })
      .eq("id", taskId);

    if (error) {
      console.error("[ai-assignment] 自動アサインエラー:", error);
      return { success: false, error: error.message };
    }

    // TODO: ai_queue_members テーブル実装後、最低負荷の担当者を自動選択
    return { success: true };
  } catch (err) {
    console.error("[ai-assignment] 自動アサインエラー:", err);
    return { success: false, error: err instanceof Error ? err.message : "不明なエラー" };
  }
}

/**
 * タスクの優先度を更新
 */
export async function updateTaskPriority(
  taskId: string,
  priority: number,
): Promise<{ success: boolean; error?: string }> {
  try {
    const clampedPriority = Math.max(0, Math.min(100, priority));
    const { error } = await supabaseAdmin
      .from("ai_tasks")
      .update({ priority: clampedPriority })
      .eq("id", taskId);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "不明なエラー" };
  }
}
