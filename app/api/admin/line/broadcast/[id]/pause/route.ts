// app/api/admin/line/broadcast/[id]/pause/route.ts — ブロードキャスト一時停止API
import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized, badRequest, notFound } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow, strictWithTenant } from "@/lib/tenant";
import { logAudit } from "@/lib/audit";

// PATCH /api/admin/line/broadcast/[id]/pause
// scheduled → paused に遷移
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

  // scheduled のみ一時停止可能
  if (broadcast.status !== "scheduled") {
    return badRequest("予約済みの配信のみ一時停止できます");
  }

  // ステータスを paused に更新
  const { error: updateError } = await strictWithTenant(
    supabaseAdmin
      .from("broadcasts")
      .update({
        status: "paused",
        paused_at: new Date().toISOString(),
      })
      .eq("id", id),
    tenantId
  );

  if (updateError) return serverError(updateError.message);

  logAudit(req, "broadcast.update", "broadcast", String(id));
  return NextResponse.json({ ok: true, status: "paused" });
}
