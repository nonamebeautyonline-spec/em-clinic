// app/api/admin/reservation-slots/[id]/route.ts — 予約枠 更新/削除
import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized, badRequest } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow, strictWithTenant } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { reservationSlotSchema } from "@/lib/validations/reservation-settings";

type Params = { params: Promise<{ id: string }> };

/** PUT — 予約枠更新 */
export async function PUT(req: NextRequest, { params }: Params) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const { id } = await params;
  if (!id) return badRequest("idは必須です");

  const tenantId = resolveTenantIdOrThrow(req);

  try {
    const parsed = await parseBody(req, reservationSlotSchema.partial());
    if ("error" in parsed) return parsed.error;

    const { data, error } = await strictWithTenant(
      supabaseAdmin
        .from("reservation_slots")
        .update({
          ...parsed.data,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id),
      tenantId
    ).select().single();

    if (error) {
      console.error("[reservation-slots] PUT error:", error);
      return serverError("予約枠の更新に失敗しました");
    }

    return NextResponse.json({ ok: true, slot: data });
  } catch (e) {
    console.error("[reservation-slots] PUT error:", e);
    return serverError("予約枠の更新に失敗しました");
  }
}

/** DELETE — 予約枠削除（論理削除: is_active=false） */
export async function DELETE(req: NextRequest, { params }: Params) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const { id } = await params;
  if (!id) return badRequest("idは必須です");

  const tenantId = resolveTenantIdOrThrow(req);

  try {
    const { error } = await strictWithTenant(
      supabaseAdmin
        .from("reservation_slots")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("id", id),
      tenantId
    );

    if (error) {
      console.error("[reservation-slots] DELETE error:", error);
      return serverError("予約枠の削除に失敗しました");
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[reservation-slots] DELETE error:", e);
    return serverError("予約枠の削除に失敗しました");
  }
}
