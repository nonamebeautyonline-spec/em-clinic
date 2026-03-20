// app/api/admin/reservation-slots/route.ts — 予約枠 一覧/作成
import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow, strictWithTenant, tenantPayload } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { reservationSlotSchema } from "@/lib/validations/reservation-settings";
import { logAudit } from "@/lib/audit";

/** GET — 予約枠一覧 */
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);

  try {
    const { data, error } = await strictWithTenant(
      supabaseAdmin
        .from("reservation_slots")
        .select("*")
        .order("sort_order")
        .order("created_at"),
      tenantId
    );

    if (error) {
      console.error("[reservation-slots] GET error:", error);
      return serverError("予約枠の取得に失敗しました");
    }

    return NextResponse.json({ ok: true, slots: data || [] });
  } catch (e) {
    console.error("[reservation-slots] GET error:", e);
    return serverError("予約枠の取得に失敗しました");
  }
}

/** POST — 予約枠作成 */
export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);

  try {
    const parsed = await parseBody(req, reservationSlotSchema);
    if ("error" in parsed) return parsed.error;

    const { data, error } = await supabaseAdmin
      .from("reservation_slots")
      .insert({
        ...tenantPayload(tenantId),
        title: parsed.data.title,
        description: parsed.data.description || null,
        duration_minutes: parsed.data.duration_minutes,
        sort_order: parsed.data.sort_order,
        is_active: parsed.data.is_active,
      })
      .select()
      .single();

    if (error) {
      console.error("[reservation-slots] POST error:", error);
      return serverError("予約枠の作成に失敗しました");
    }

    logAudit(req, "reservation_slot.create", "reservation_slot", "unknown");
    return NextResponse.json({ ok: true, slot: data });
  } catch (e) {
    console.error("[reservation-slots] POST error:", e);
    return serverError("予約枠の作成に失敗しました");
  }
}
