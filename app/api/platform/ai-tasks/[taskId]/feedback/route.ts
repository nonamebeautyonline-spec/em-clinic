// AI Tasks API: フィードバック記録
import { NextRequest, NextResponse } from "next/server";
import { verifyPlatformAdmin } from "@/lib/platform-auth";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { logAudit } from "@/lib/audit";
import { aiTaskFeedbackSchema } from "@/lib/validations/ai-tasks";

/**
 * POST: フィードバック追加
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin) return unauthorized();

  const { taskId } = await params;

  let body;
  try {
    body = await req.json();
  } catch {
    return badRequest("JSONの解析に失敗しました");
  }

  const parsed = aiTaskFeedbackSchema.safeParse(body);
  if (!parsed.success) return badRequest("入力が不正です");

  try {
    // タスク存在確認
    const { data: task, error: taskError } = await supabaseAdmin
      .from("ai_tasks")
      .select("id, tenant_id")
      .eq("id", taskId)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ ok: false, error: "タスクが見つかりません" }, { status: 404 });
    }

    // フィードバック保存
    const { error: fbError } = await supabaseAdmin
      .from("ai_task_feedback")
      .insert({
        tenant_id: task.tenant_id,
        task_id: taskId,
        feedback_type: parsed.data.feedback_type,
        rating: parsed.data.rating || null,
        comment: parsed.data.comment || null,
        reject_category: parsed.data.reject_category || null,
        corrected_output: parsed.data.corrected_output || null,
        reviewed_by: admin.userId,
      });

    if (fbError) {
      console.error("[AI Tasks] フィードバック保存エラー:", fbError);
      return serverError("フィードバックの保存に失敗しました");
    }

    // handoff_status更新
    if (parsed.data.feedback_type === "approve") {
      await supabaseAdmin
        .from("ai_tasks")
        .update({ handoff_status: "accepted", updated_at: new Date().toISOString() })
        .eq("id", taskId);
    } else if (parsed.data.feedback_type === "reject") {
      await supabaseAdmin
        .from("ai_tasks")
        .update({ handoff_status: "resolved", updated_at: new Date().toISOString() })
        .eq("id", taskId);
    }

    logAudit(req, "ai_task_feedback.create", "ai_task_feedback", taskId);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[AI Tasks] フィードバックエラー:", err);
    return serverError("フィードバックの保存に失敗しました");
  }
}
