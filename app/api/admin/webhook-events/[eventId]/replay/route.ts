// app/api/admin/webhook-events/[eventId]/replay/route.ts — Webhookリプレイ API
import { NextRequest, NextResponse } from "next/server";
import { unauthorized, serverError } from "@/lib/api-error";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow } from "@/lib/tenant";
import { replayWebhookEvent } from "@/lib/webhook-replay";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/** 失敗したWebhookイベントをリプレイ */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
) {
  try {
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) return unauthorized();

    const tenantId = resolveTenantIdOrThrow(req);
    const { eventId } = await params;
    const eventIdNum = parseInt(eventId, 10);

    if (isNaN(eventIdNum)) {
      return NextResponse.json({ error: "無効なイベントIDです" }, { status: 400 });
    }

    const result = await replayWebhookEvent(eventIdNum, tenantId);

    if (result.success) {
      logAudit(req, "webhook_event.replay", "webhook_event", String(eventId));
      return NextResponse.json({ ok: true, message: "リプレイ成功" });
    } else {
      return NextResponse.json({ ok: false, error: result.error }, { status: 422 });
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return serverError(msg);
  }
}
