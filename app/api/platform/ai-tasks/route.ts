// AI Tasks API: 一覧取得 + 手動作成
import { NextRequest, NextResponse } from "next/server";
import { verifyPlatformAdmin } from "@/lib/platform-auth";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { logAudit } from "@/lib/audit";
import { aiTaskListQuerySchema, aiTaskCreateSchema } from "@/lib/validations/ai-tasks";
import { runWorkflow } from "@/lib/ai-workflows/runner";
import { getWorkflowOrThrow, listWorkflows } from "@/lib/ai-workflows/registry";
// レジストリ初期化（import時に全workflow登録）
import "@/lib/ai-workflows";

/**
 * GET: タスク一覧
 */
export async function GET(req: NextRequest) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin) return unauthorized();

  const url = new URL(req.url);
  const params = Object.fromEntries(url.searchParams.entries());
  const parsed = aiTaskListQuerySchema.safeParse(params);
  if (!parsed.success) return badRequest("パラメータが不正です");
  const { workflow_type, status, tenant_id, subject_type, subject_id, limit, offset } = parsed.data;

  try {
    let query = supabaseAdmin
      .from("ai_tasks")
      .select("id, tenant_id, workflow_type, status, subject_id, subject_type, handoff_status, handoff_summary, model_name, input_tokens, output_tokens, created_at, completed_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (workflow_type) query = query.eq("workflow_type", workflow_type);
    if (status) query = query.eq("status", status);
    if (tenant_id) query = query.eq("tenant_id", tenant_id);
    if (subject_type) query = query.eq("subject_type", subject_type);
    if (subject_id) query = query.eq("subject_id", subject_id);

    const { data, error, count } = await query;
    if (error) {
      console.error("[AI Tasks] 一覧取得エラー:", error);
      return serverError("タスク一覧の取得に失敗しました");
    }

    // 登録済みworkflow一覧（フィルタUI用）
    const workflows = listWorkflows().map(w => ({
      id: w.id,
      label: w.label,
      description: w.description,
    }));

    return NextResponse.json({
      ok: true,
      tasks: data || [],
      total: count || 0,
      workflows,
    });
  } catch (err) {
    console.error("[AI Tasks] エラー:", err);
    return serverError("タスク一覧の取得に失敗しました");
  }
}

/**
 * POST: タスク手動作成（support-intake, sales-intake用）
 */
export async function POST(req: NextRequest) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin) return unauthorized();

  let body;
  try {
    body = await req.json();
  } catch {
    return badRequest("JSONの解析に失敗しました");
  }

  const parsed = aiTaskCreateSchema.safeParse(body);
  if (!parsed.success) return badRequest("入力が不正です");
  const { workflow_type, input, tenant_id, subject_id, subject_type } = parsed.data;

  try {
    const config = getWorkflowOrThrow(workflow_type);

    const { taskRun, taskId } = await runWorkflow(
      config,
      input,
      tenant_id || null,
      { subjectId: subject_id, subjectType: subject_type },
    );

    logAudit(req, "ai_task.create", "ai_tasks", taskId ?? "");

    return NextResponse.json({
      ok: true,
      taskId,
      status: taskRun.status,
      output: taskRun.output,
      handoffSummary: taskRun.handoffSummary,
    });
  } catch (err) {
    console.error("[AI Tasks] 作成エラー:", err);
    return serverError(err instanceof Error ? err.message : "タスク作成に失敗しました");
  }
}
