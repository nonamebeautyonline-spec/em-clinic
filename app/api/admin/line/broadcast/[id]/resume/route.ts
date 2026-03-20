// app/api/admin/line/broadcast/[id]/resume/route.ts — ブロードキャスト再開API
import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized, badRequest, notFound } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow, strictWithTenant } from "@/lib/tenant";
import { logAudit } from "@/lib/audit";

// PATCH /api/admin/line/broadcast/[id]/resume
// paused → scheduled に遷移
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const { id } = await params;
  const tenantId = resolveTenantIdOrThrow(req);

  // 対象ブロードキャストを取得
  const { data: broadcast, error: fetchError } = await strictWithTenant(
    supabaseAdmin
      .from("broadcasts")
      .select("id, status")
      .eq("id", id)
      .maybeSingle(),
    tenantId
  );

  if (fetchError) return serverError(fetchError.message);
  if (!broadcast) return notFound("配信が見つかりません");

  // paused のみ再開可能
  if (broadcast.status !== "paused") {
    return badRequest("一時停止中の配信のみ再開できます");
  }

  // ステータスを scheduled に戻す
  const { error: updateError } = await strictWithTenant(
    supabaseAdmin
      .from("broadcasts")
      .update({
        status: "scheduled",
        paused_at: null,
      })
      .eq("id", id),
    tenantId
  );

  if (updateError) return serverError(updateError.message);

  logAudit(req, "broadcast.update", "broadcast", String(id));
  return NextResponse.json({ ok: true, status: "scheduled" });
}
