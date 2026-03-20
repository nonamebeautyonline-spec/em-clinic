// カルテ同時編集セッション管理API
// POST: 編集セッション開始
// PUT: ハートビート更新
// DELETE: セッション終了
// GET: 指定intakeの編集中ユーザー確認
import { NextRequest, NextResponse } from "next/server";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow, strictWithTenant, tenantPayload } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { karteEditSessionSchema } from "@/lib/validations/admin-operations";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

// 120秒超のハートビートは期限切れとして扱う
const HEARTBEAT_TIMEOUT_SEC = 120;

export async function GET(req: NextRequest) {
  try {
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized)
      return unauthorized();

    const tenantId = resolveTenantIdOrThrow(req);
    const intakeId = req.nextUrl.searchParams.get("intakeId");
    if (!intakeId)
      return badRequest("intakeIdは必須です");

    // 期限切れセッションを除外して取得
    const cutoff = new Date(Date.now() - HEARTBEAT_TIMEOUT_SEC * 1000).toISOString();

    const { data, error } = await strictWithTenant(
      supabaseAdmin
        .from("karte_edit_sessions")
        .select("id, intake_id, editor_name, last_heartbeat, created_at")
        .eq("intake_id", Number(intakeId))
        .gte("last_heartbeat", cutoff),
      tenantId
    );

    if (error)
      return serverError(error.message);

    return NextResponse.json({ ok: true, sessions: data || [] });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return serverError(msg);
  }
}

export async function POST(req: NextRequest) {
  try {
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized)
      return unauthorized();

    const parsed = await parseBody(req, karteEditSessionSchema);
    if ("error" in parsed) return parsed.error;
    const { intakeId, editorName } = parsed.data;

    const tenantId = resolveTenantIdOrThrow(req);

    // 既存セッションがあれば削除して再作成（同一ユーザーの再接続対応）
    await strictWithTenant(
      supabaseAdmin
        .from("karte_edit_sessions")
        .delete()
        .eq("intake_id", Number(intakeId))
        .eq("editor_name", editorName),
      tenantId
    );

    const { data, error } = await strictWithTenant(
      supabaseAdmin
        .from("karte_edit_sessions")
        .insert({
          intake_id: Number(intakeId),
          editor_name: editorName,
          last_heartbeat: new Date().toISOString(),
          ...tenantPayload(tenantId),
        })
        .select("id")
        .single(),
      tenantId
    );

    if (error)
      return serverError(error.message);

    logAudit(req, "karte_session.create", "karte", "unknown");
    return NextResponse.json({ ok: true, sessionId: data.id });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return serverError(msg);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized)
      return unauthorized();

    const body = await req.json();
    const sessionId = body.sessionId;
    if (!sessionId)
      return badRequest("sessionIdは必須です");

    const tenantId = resolveTenantIdOrThrow(req);

    const { error } = await strictWithTenant(
      supabaseAdmin
        .from("karte_edit_sessions")
        .update({ last_heartbeat: new Date().toISOString() })
        .eq("id", Number(sessionId)),
      tenantId
    );

    if (error)
      return serverError(error.message);

    logAudit(req, "karte_session.create", "karte", "unknown");
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return serverError(msg);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized)
      return unauthorized();

    const sessionId = req.nextUrl.searchParams.get("sessionId");
    const intakeId = req.nextUrl.searchParams.get("intakeId");
    const editorName = req.nextUrl.searchParams.get("editorName");

    const tenantId = resolveTenantIdOrThrow(req);

    if (sessionId) {
      // セッションID指定で削除
      await strictWithTenant(
        supabaseAdmin
          .from("karte_edit_sessions")
          .delete()
          .eq("id", Number(sessionId)),
        tenantId
      );
    } else if (intakeId && editorName) {
      // intakeId + editorName で削除（beforeunload用）
      await strictWithTenant(
        supabaseAdmin
          .from("karte_edit_sessions")
          .delete()
          .eq("intake_id", Number(intakeId))
          .eq("editor_name", editorName),
        tenantId
      );
    } else {
      return badRequest("sessionId または intakeId+editorName が必要です");
    }

    logAudit(req, "karte_session.create", "karte", "unknown");
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return serverError(msg);
  }
}
