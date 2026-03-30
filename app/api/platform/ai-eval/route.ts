// AI Offline Eval API: eval run 管理
import { NextRequest, NextResponse } from "next/server";
import { verifyPlatformAdmin } from "@/lib/platform-auth";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { logAudit } from "@/lib/audit";
import {
  createEvalRun,
  getEvalRuns,
  getEvalRunDetail,
} from "@/lib/ai-offline-eval";

/**
 * GET: eval run一覧 or 詳細
 */
export async function GET(req: NextRequest) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin) return unauthorized();

  const url = new URL(req.url);
  const evalRunId = url.searchParams.get("eval_run_id");
  const tenantId = url.searchParams.get("tenant_id") || null;
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "20", 10), 100);

  try {
    if (evalRunId) {
      // 詳細取得
      const detail = await getEvalRunDetail(parseInt(evalRunId, 10));
      if (!detail) {
        return badRequest("指定されたeval runが見つかりません");
      }
      return NextResponse.json({ ok: true, ...detail });
    }

    // 一覧取得
    const runs = await getEvalRuns(tenantId, limit);
    return NextResponse.json({ ok: true, runs });
  } catch (err) {
    console.error("[AI Eval] GET エラー:", err);
    return serverError("Eval情報の取得に失敗しました");
  }
}

/**
 * POST: eval run作成
 */
export async function POST(req: NextRequest) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin) return unauthorized();

  try {
    const body = await req.json();
    const { eval_name, config_a, config_b, sample_size, tenant_id } = body;

    if (!eval_name || !config_a || !config_b) {
      return badRequest("eval_name, config_a, config_b は必須です");
    }

    const run = await createEvalRun(
      tenant_id || null,
      eval_name,
      config_a,
      config_b,
      sample_size || 50
    );

    await logAudit(req, "ai_eval_run_create", "ai_eval_runs", String(run.id));

    return NextResponse.json({ ok: true, run });
  } catch (err) {
    console.error("[AI Eval] POST エラー:", err);
    const message = err instanceof Error ? err.message : "Eval run作成に失敗しました";
    return serverError(message);
  }
}
