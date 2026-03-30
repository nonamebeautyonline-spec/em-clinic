// AI Supervisor: Failure Review API
// 却下・修正タスク一覧 + 原因分類
import { NextRequest, NextResponse } from "next/server";
import { verifyPlatformAdmin } from "@/lib/platform-auth";
import { badRequest, unauthorized, serverError } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { logAudit } from "@/lib/audit";

/**
 * GET: 却下・修正フィードバック付きタスク一覧
 * クエリ: workflow_type?, failure_category?, limit?, offset?
 */
export async function GET(req: NextRequest) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin) return unauthorized();

  const url = new URL(req.url);
  const workflowType = url.searchParams.get("workflow_type") || undefined;
  const failureCategory = url.searchParams.get("failure_category") || undefined;
  const limit = Math.min(Number(url.searchParams.get("limit") || "50"), 200);
  const offset = Number(url.searchParams.get("offset") || "0");

  try {
    // 却下・修正フィードバックを取得
    let fbQuery = supabaseAdmin
      .from("ai_task_feedback")
      .select("id, task_id, feedback_type, rating, comment, reject_category, failure_category, improvement_note, created_at", { count: "exact" })
      .in("feedback_type", ["reject", "edit"])
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (failureCategory) fbQuery = fbQuery.eq("failure_category", failureCategory);

    const { data: feedbacks, error: fbErr, count } = await fbQuery;
    if (fbErr) throw fbErr;

    // 対応するタスク情報を取得
    const taskIds = [...new Set((feedbacks || []).map(f => f.task_id))];
    let tasks: Array<Record<string, unknown>> = [];
    if (taskIds.length > 0) {
      // 50件ずつバッチ取得
      for (let i = 0; i < taskIds.length; i += 50) {
        const batch = taskIds.slice(i, i + 50);
        const { data } = await supabaseAdmin
          .from("ai_tasks")
          .select("id, workflow_type, status, output, handoff_summary, trace, created_at")
          .in("id", batch);
        if (data) tasks.push(...data);
      }
    }

    // workflowTypeフィルタ
    const taskMap = new Map(tasks.map(t => [t.id as string, t]));
    let results = (feedbacks || []).map(fb => ({
      feedback: fb,
      task: taskMap.get(fb.task_id) || null,
    }));

    if (workflowType) {
      results = results.filter(r =>
        r.task && (r.task.workflow_type as string) === workflowType
      );
    }

    // failure_category の集計
    const categoryCounts: Record<string, number> = {};
    for (const fb of feedbacks || []) {
      const cat = fb.failure_category || "unclassified";
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    }

    return NextResponse.json({
      ok: true,
      items: results,
      total: count || 0,
      categoryCounts,
    });
  } catch (err) {
    console.error("[Failure Review] エラー:", err);
    return serverError("Failure Review データの取得に失敗しました");
  }
}

/**
 * PATCH: フィードバックに原因分類・改善メモを追加
 * ボディ: { feedback_id, failure_category, improvement_note }
 */
export async function PATCH(req: NextRequest) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin) return unauthorized();

  let body;
  try { body = await req.json(); } catch { return badRequest("JSONの解析に失敗"); }

  const { feedback_id, failure_category, improvement_note } = body;
  if (!feedback_id) return badRequest("feedback_id が必要です");

  try {
    const updateData: Record<string, unknown> = {};
    if (failure_category !== undefined) updateData.failure_category = failure_category;
    if (improvement_note !== undefined) updateData.improvement_note = improvement_note;

    if (Object.keys(updateData).length === 0) {
      return badRequest("更新するフィールドがありません");
    }

    const { error } = await supabaseAdmin
      .from("ai_task_feedback")
      .update(updateData)
      .eq("id", feedback_id);

    if (error) throw error;

    logAudit(req, "ai_failure_review.classify", "ai_task_feedback", String(feedback_id));

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Failure Review] 更新エラー:", err);
    return serverError("分類の更新に失敗しました");
  }
}
