// AI Safe Actions API: 提案一覧 + 承認/実行/却下
import { NextRequest, NextResponse } from "next/server";
import { verifyPlatformAdmin } from "@/lib/platform-auth";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { logAudit } from "@/lib/audit";
import {
  listActionProposals,
  proposeAction,
  approveAction,
  executeAction,
  rejectAction,
  validateActionParams,
  type SafeActionType,
} from "@/lib/ai-safe-actions";

/**
 * GET: 提案一覧
 * クエリ: status?, task_id?, limit?
 */
export async function GET(req: NextRequest) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin) return unauthorized();

  try {
    const url = new URL(req.url);
    const status = url.searchParams.get("status") || undefined;
    const taskId = url.searchParams.get("task_id") || undefined;
    const limit = url.searchParams.get("limit")
      ? parseInt(url.searchParams.get("limit")!, 10)
      : undefined;

    const proposals = await listActionProposals({ taskId, status, limit });

    return NextResponse.json({ ok: true, proposals });
  } catch (err) {
    console.error("[SafeActions API] GET エラー:", err);
    return serverError("提案一覧の取得に失敗しました");
  }
}

/**
 * POST: アクション操作
 * body.action: "propose" | "approve" | "execute" | "reject"
 */
export async function POST(req: NextRequest) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin) return unauthorized();

  try {
    const body = await req.json();
    const { action } = body;

    switch (action) {
      // ============================================================
      // 提案作成
      // ============================================================
      case "propose": {
        const { tenantId, taskId, actionType, actionParams } = body;
        if (!tenantId || !taskId || !actionType || !actionParams) {
          return badRequest("tenantId, taskId, actionType, actionParams は必須です");
        }

        // バリデーション
        const validation = validateActionParams(actionType as SafeActionType, actionParams);
        if (!validation.valid) {
          return badRequest(`パラメータ不正: ${validation.errors.join(", ")}`);
        }

        const proposalId = await proposeAction(tenantId, taskId, actionType, actionParams);

        await logAudit(req, "ai_safe_action_propose", "ai_safe_action_proposal", String(proposalId), {
          actionType,
          taskId,
        });

        return NextResponse.json({ ok: true, proposalId });
      }

      // ============================================================
      // 承認
      // ============================================================
      case "approve": {
        const { proposalId } = body;
        if (!proposalId) return badRequest("proposalId は必須です");

        const success = await approveAction(proposalId, admin.email || "platform_admin");

        if (success) {
          await logAudit(req, "ai_safe_action_approve", "ai_safe_action_proposal", String(proposalId));
        }

        return NextResponse.json({ ok: true, approved: success });
      }

      // ============================================================
      // 実行
      // ============================================================
      case "execute": {
        const { proposalId } = body;
        if (!proposalId) return badRequest("proposalId は必須です");

        const result = await executeAction(proposalId);

        if (result.success) {
          await logAudit(req, "ai_safe_action_execute", "ai_safe_action_proposal", String(proposalId), {
            result: result.result,
          });
        }

        return NextResponse.json({ ok: true, ...result });
      }

      // ============================================================
      // 却下
      // ============================================================
      case "reject": {
        const { proposalId } = body;
        if (!proposalId) return badRequest("proposalId は必須です");

        const success = await rejectAction(proposalId);

        if (success) {
          await logAudit(req, "ai_safe_action_reject", "ai_safe_action_proposal", String(proposalId));
        }

        return NextResponse.json({ ok: true, rejected: success });
      }

      default:
        return badRequest(`不明なaction: ${action}。propose, approve, execute, reject のいずれかを指定してください`);
    }
  } catch (err) {
    console.error("[SafeActions API] POST エラー:", err);
    return serverError("アクション処理に失敗しました");
  }
}
