// AI Governance API: 変更管理 + バージョン管理
import { NextRequest, NextResponse } from "next/server";
import { verifyPlatformAdmin } from "@/lib/platform-auth";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { logAudit } from "@/lib/audit";
import {
  listChangeRequests,
  createChangeRequest,
  approveChangeRequest,
  rejectChangeRequest,
  applyChangeRequest,
} from "@/lib/ai-change-approval";
import {
  getConfigVersions,
  rollbackConfig,
} from "@/lib/ai-config-versioning";

/**
 * GET: 変更リクエスト一覧 or バージョン履歴
 */
export async function GET(req: NextRequest) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin) return unauthorized();

  const url = new URL(req.url);
  const view = url.searchParams.get("view") || "changes";
  const configType = url.searchParams.get("config_type") || undefined;
  const status = url.searchParams.get("status") || undefined;
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10), 200);

  try {
    if (view === "versions") {
      if (!configType) {
        return badRequest("config_type は必須です");
      }
      const versions = await getConfigVersions(null, configType, limit);
      return NextResponse.json({ ok: true, versions });
    }

    // デフォルト: 変更リクエスト一覧
    const changes = await listChangeRequests(status, limit);
    return NextResponse.json({ ok: true, changes });
  } catch (err) {
    console.error("[AI Governance] GET エラー:", err);
    return serverError("データの取得に失敗しました");
  }
}

/**
 * POST: 変更リクエスト操作
 */
export async function POST(req: NextRequest) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin) return unauthorized();

  try {
    const body = await req.json();
    const { action } = body;

    if (!action) {
      return badRequest("action は必須です");
    }

    switch (action) {
      case "create": {
        const { config_type, description, diff } = body;
        if (!config_type || !description || !diff) {
          return badRequest("config_type, description, diff は必須です");
        }
        const cr = await createChangeRequest(
          null,
          config_type,
          description,
          diff,
          admin.name || admin.email
        );
        await logAudit(req, "ai_change_request_create", "ai_config_change_requests", String(cr.id));
        return NextResponse.json({ ok: true, change_request: cr });
      }

      case "approve": {
        const { request_id } = body;
        if (!request_id) return badRequest("request_id は必須です");
        const cr = await approveChangeRequest(request_id, admin.name || admin.email);
        await logAudit(req, "ai_change_request_approve", "ai_config_change_requests", String(cr.id));
        return NextResponse.json({ ok: true, change_request: cr });
      }

      case "reject": {
        const { request_id } = body;
        if (!request_id) return badRequest("request_id は必須です");
        const cr = await rejectChangeRequest(request_id, admin.name || admin.email);
        await logAudit(req, "ai_change_request_reject", "ai_config_change_requests", String(cr.id));
        return NextResponse.json({ ok: true, change_request: cr });
      }

      case "apply": {
        const { request_id } = body;
        if (!request_id) return badRequest("request_id は必須です");
        const cr = await applyChangeRequest(request_id);
        await logAudit(req, "ai_change_request_apply", "ai_config_change_requests", String(cr.id));
        return NextResponse.json({ ok: true, change_request: cr });
      }

      case "rollback": {
        const { config_type, target_version } = body;
        if (!config_type || target_version == null) {
          return badRequest("config_type, target_version は必須です");
        }
        const version = await rollbackConfig(
          null,
          config_type,
          target_version,
          admin.name || admin.email
        );
        await logAudit(req, "ai_config_rollback", "ai_config_versions", String(version.id));
        return NextResponse.json({ ok: true, version });
      }

      default:
        return badRequest(`不明なaction: ${action}`);
    }
  } catch (err) {
    console.error("[AI Governance] POST エラー:", err);
    const message = err instanceof Error ? err.message : "処理に失敗しました";
    return serverError(message);
  }
}
