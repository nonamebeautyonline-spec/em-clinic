// AI Tasks API: タスク詳細取得
import { NextRequest, NextResponse } from "next/server";
import { verifyPlatformAdmin } from "@/lib/platform-auth";
import { serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * GET: タスク詳細（trace + feedback 含む）
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin) return unauthorized();

  const { taskId } = await params;

  try {
    // タスク本体
    const { data: task, error: taskError } = await supabaseAdmin
      .from("ai_tasks")
      .select("*")
      .eq("id", taskId)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ ok: false, error: "タスクが見つかりません" }, { status: 404 });
    }

    // フィードバック一覧
    const { data: feedback } = await supabaseAdmin
      .from("ai_task_feedback")
      .select("*")
      .eq("task_id", taskId)
      .order("created_at", { ascending: false });

    return NextResponse.json({
      ok: true,
      task,
      feedback: feedback || [],
    });
  } catch (err) {
    console.error("[AI Tasks] 詳細取得エラー:", err);
    return serverError("タスク詳細の取得に失敗しました");
  }
}
