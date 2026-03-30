// AI Playground API: テスト入力 → 全パイプラインdry-run実行 → 結果確認
import { NextRequest, NextResponse } from "next/server";
import { verifyPlatformAdmin } from "@/lib/platform-auth";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { logAudit } from "@/lib/audit";
import { getWorkflow, listWorkflows } from "@/lib/ai-workflows/registry";
import { runWorkflow } from "@/lib/ai-workflows/runner";

/**
 * GET: 利用可能なworkflow一覧
 */
export async function GET(req: NextRequest) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin) return unauthorized();

  const workflows = listWorkflows().map((w) => ({
    id: w.id,
    version: w.version,
    label: w.label,
    description: w.description,
  }));

  return NextResponse.json({ ok: true, workflows });
}

/**
 * POST: Playground実行（全パイプラインを通す）
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

  const { workflow_type, input, tenant_id } = body || {};

  if (!workflow_type || typeof workflow_type !== "string") {
    return badRequest("workflow_type は必須です");
  }
  if (!input || typeof input !== "object") {
    return badRequest("input は必須です（JSONオブジェクト）");
  }

  // workflow 取得
  const config = getWorkflow(workflow_type);
  if (!config) {
    return badRequest(`Workflow "${workflow_type}" が見つかりません`);
  }

  try {
    const startTime = Date.now();
    const result = await runWorkflow(
      config,
      input,
      tenant_id || null,
    );
    const elapsedMs = Date.now() - startTime;

    logAudit(
      req,
      "ai_playground.execute",
      "ai_tasks",
      result.taskId || "playground",
      { workflow_type, tenant_id, elapsed_ms: elapsedMs },
    );

    return NextResponse.json({
      ok: true,
      taskId: result.taskId,
      status: result.taskRun.status,
      output: result.taskRun.output,
      handoffSummary: result.taskRun.handoffSummary,
      trace: result.taskRun.trace,
      evidence: result.taskRun.outputEvidence,
      tokens: {
        input: result.taskRun.inputTokens,
        output: result.taskRun.outputTokens,
      },
      elapsedMs,
    });
  } catch (err) {
    console.error("[AI Playground] 実行エラー:", err);
    return serverError("Playground実行に失敗しました");
  }
}
