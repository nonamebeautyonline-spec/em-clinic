// AI Queues API — キュー別タスク一覧・アサイン管理
import { NextRequest, NextResponse } from "next/server";
import { verifyPlatformAdmin } from "@/lib/platform-auth";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { logAudit } from "@/lib/audit";
import { supabaseAdmin } from "@/lib/supabase";
import { getQueueStats } from "@/lib/ai-routing";
import { assignTask } from "@/lib/ai-assignment";

/**
 * GET: キュー別タスク一覧と統計
 * クエリ: queue_name, status, assignee_id, priority_min, limit, offset
 */
export async function GET(req: NextRequest) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin) return unauthorized();

  try {
    const url = new URL(req.url);
    const queueName = url.searchParams.get("queue_name");
    const status = url.searchParams.get("status");
    const assigneeId = url.searchParams.get("assignee_id");
    const priorityMin = url.searchParams.get("priority_min");
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10), 200);
    const offset = parseInt(url.searchParams.get("offset") || "0", 10);

    // タスク一覧クエリ
    let query = supabaseAdmin
      .from("ai_tasks")
      .select("id, workflow_type, status, priority, queue_name, assignee_id, assigned_at, assigned_by, escalation_level, missing_info, input, output, handoff_summary, created_at, completed_at", { count: "exact" })
      .not("queue_name", "is", null)
      .order("priority", { ascending: false })
      .order("created_at", { ascending: true });

    if (queueName) {
      query = query.eq("queue_name", queueName);
    }
    if (status) {
      query = query.eq("status", status);
    }
    if (assigneeId) {
      query = query.eq("assignee_id", assigneeId);
    }
    if (priorityMin) {
      query = query.gte("priority", parseInt(priorityMin, 10));
    }

    query = query.range(offset, offset + limit - 1);

    const { data: tasks, error, count } = await query;
    if (error) {
      console.error("[ai-queues] タスク取得エラー:", error);
      return serverError("タスク取得に失敗しました");
    }

    // キュー統計
    const stats = await getQueueStats(queueName ?? undefined);

    // 最古の滞留タスクの作成日時を取得
    const oldestPendingQuery = supabaseAdmin
      .from("ai_tasks")
      .select("queue_name, created_at")
      .not("queue_name", "is", null)
      .in("status", ["pending", "running", "escalated"])
      .is("assignee_id", null)
      .order("created_at", { ascending: true })
      .limit(10);

    const { data: oldestPending } = await oldestPendingQuery;
    const oldestByQueue: Record<string, string> = {};
    for (const row of oldestPending ?? []) {
      const qn = row.queue_name as string;
      if (!oldestByQueue[qn]) {
        oldestByQueue[qn] = row.created_at as string;
      }
    }

    return NextResponse.json({
      tasks: tasks ?? [],
      total: count ?? 0,
      stats,
      oldestPending: oldestByQueue,
    });
  } catch (err) {
    console.error("[ai-queues] GET エラー:", err);
    return serverError("キュー情報の取得に失敗しました");
  }
}

/**
 * POST: タスクアサイン
 * ボディ: { task_id, assignee_id }
 */
export async function POST(req: NextRequest) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin) return unauthorized();

  try {
    const body = await req.json();
    const { task_id, assignee_id } = body;

    if (!task_id || !assignee_id) {
      return badRequest("task_id と assignee_id は必須です");
    }

    const result = await assignTask(task_id, assignee_id, admin.email || "platform_admin");

    if (!result.success) {
      return serverError(result.error || "アサインに失敗しました");
    }

    // 監査ログ記録
    logAudit(req, "ai_task.assign", "ai_tasks", task_id, { assignee_id });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[ai-queues] POST エラー:", err);
    return serverError("アサインに失敗しました");
  }
}
