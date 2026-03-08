// app/api/admin/karte-confirm/route.ts — カルテ確定API
import { NextRequest, NextResponse } from "next/server";
import { notFound, serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth, getAdminUserId } from "@/lib/admin-auth";
import { resolveTenantId, withTenant } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { karteConfirmSchema } from "@/lib/validations/admin-operations";
import { recordKarteChange } from "@/lib/karte-history";

export const dynamic = "force-dynamic";

/** カルテを確定状態にする（draft → confirmed） */
export async function POST(req: NextRequest) {
  try {
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) return unauthorized();

    const parsed = await parseBody(req, karteConfirmSchema);
    if ("error" in parsed) return parsed.error;
    const { intakeId } = parsed.data;

    const tenantId = resolveTenantId(req);
    const adminUserId = getAdminUserId();

    // 現在のカルテを取得
    const { data: intake } = await withTenant(
      supabaseAdmin
        .from("intake")
        .select("id, note, karte_status")
        .eq("id", intakeId),
      tenantId,
    ).single();

    if (!intake) {
      return notFound("カルテが見つかりません");
    }

    const currentStatus = intake.karte_status ?? "draft";
    if (currentStatus === "confirmed") {
      return NextResponse.json({ ok: true, message: "既に確定済みです" });
    }

    // 確定
    const { error: updateErr } = await withTenant(
      supabaseAdmin
        .from("intake")
        .update({
          karte_status: "confirmed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", intakeId),
      tenantId,
    );

    if (updateErr) {
      return serverError(updateErr.message);
    }

    // 履歴記録
    await recordKarteChange({
      intakeId,
      noteBefore: intake.note ?? null,
      noteAfter: intake.note ?? null,
      karteStatusBefore: currentStatus,
      karteStatusAfter: "confirmed",
      changeReason: "カルテ確定",
      changedBy: adminUserId || "unknown",
      changedById: adminUserId,
      tenantId,
    });

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return serverError(msg);
  }
}
