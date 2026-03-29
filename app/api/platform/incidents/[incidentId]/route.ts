// app/api/platform/incidents/[incidentId]/route.ts
// インシデント個別操作API（更新・削除）

import { NextRequest, NextResponse } from "next/server";
import { badRequest, forbidden, notFound, serverError } from "@/lib/api-error";
import { verifyPlatformAdmin } from "@/lib/platform-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { logAudit } from "@/lib/audit";

interface RouteContext {
  params: Promise<{ incidentId: string }>;
}

const VALID_SEVERITIES = ["critical", "major", "minor"];
const VALID_STATUSES = ["investigating", "identified", "monitoring", "resolved"];

/**
 * GET: インシデント詳細取得
 */
export async function GET(req: NextRequest, ctx: RouteContext) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin) return forbidden("権限がありません");

  const { incidentId } = await ctx.params;

  const { data, error } = await supabaseAdmin
    .from("incidents")
    .select("*")
    .eq("id", incidentId)
    .single();

  if (error || !data) {
    return notFound("インシデントが見つかりません");
  }

  return NextResponse.json({ ok: true, incident: data });
}

/**
 * PUT: インシデント更新（ステータス・重大度・説明の変更）
 */
export async function PUT(req: NextRequest, ctx: RouteContext) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin) return forbidden("権限がありません");

  const { incidentId } = await ctx.params;

  let body: {
    title?: string;
    description?: string;
    severity?: string;
    status?: string;
  };

  try {
    body = await req.json();
  } catch {
    return badRequest("リクエストボディが不正です");
  }

  // バリデーション
  if (body.severity && !VALID_SEVERITIES.includes(body.severity)) {
    return badRequest(`severityは ${VALID_SEVERITIES.join(", ")} のいずれかです`);
  }
  if (body.status && !VALID_STATUSES.includes(body.status)) {
    return badRequest(`statusは ${VALID_STATUSES.join(", ")} のいずれかです`);
  }

  try {
    // 既存レコード確認
    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from("incidents")
      .select("*")
      .eq("id", incidentId)
      .single();

    if (fetchErr || !existing) {
      return notFound("インシデントが見つかりません");
    }

    // 更新データ構築
    const updates: Record<string, unknown> = {};
    if (body.title !== undefined) updates.title = body.title.trim();
    if (body.description !== undefined) updates.description = body.description;
    if (body.severity !== undefined) updates.severity = body.severity;
    if (body.status !== undefined) {
      updates.status = body.status;
      // resolved時にresolved_atを設定
      if (body.status === "resolved" && !existing.resolved_at) {
        updates.resolved_at = new Date().toISOString();
      }
      // resolvedから他に戻す場合はresolved_atをクリア
      if (body.status !== "resolved" && existing.resolved_at) {
        updates.resolved_at = null;
      }
    }

    if (Object.keys(updates).length === 0) {
      return badRequest("更新するフィールドがありません");
    }

    updates.updated_at = new Date().toISOString();

    const { data, error: updateErr } = await supabaseAdmin
      .from("incidents")
      .update(updates)
      .eq("id", incidentId)
      .select()
      .single();

    if (updateErr) {
      console.error("[incidents/[id]] PUT error:", updateErr);
      return serverError("インシデントの更新に失敗しました");
    }

    logAudit(req, "platform.incident.update", "incident", incidentId, {
      changes: updates,
      previousStatus: existing.status,
    });

    return NextResponse.json({ ok: true, incident: data });
  } catch (err) {
    console.error("[incidents/[id]] PUT unexpected error:", err);
    return serverError("予期しないエラーが発生しました");
  }
}

/**
 * DELETE: インシデント削除
 */
export async function DELETE(req: NextRequest, ctx: RouteContext) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin) return forbidden("権限がありません");

  const { incidentId } = await ctx.params;

  try {
    const { error } = await supabaseAdmin
      .from("incidents")
      .delete()
      .eq("id", incidentId);

    if (error) {
      console.error("[incidents/[id]] DELETE error:", error);
      return serverError("インシデントの削除に失敗しました");
    }

    logAudit(req, "platform.incident.delete", "incident", incidentId, {});

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[incidents/[id]] DELETE unexpected error:", err);
    return serverError("予期しないエラーが発生しました");
  }
}
