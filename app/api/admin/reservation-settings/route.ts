// app/api/admin/reservation-settings/route.ts — 予約設定API（GET/PUT）
import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow, strictWithTenant, tenantPayload } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { reservationSettingsSchema } from "@/lib/validations/reservation-settings";

// デフォルト設定（テーブルにレコードがない場合）
const DEFAULT_SETTINGS = {
  change_deadline_hours: 0,
  cancel_deadline_hours: 0,
  booking_start_days_before: 60,
  booking_deadline_hours_before: 0,
  booking_open_day: 5,
};

/** GET /api/admin/reservation-settings — テナントの予約設定を取得 */
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);

  try {
    const { data, error } = await strictWithTenant(
      supabaseAdmin.from("reservation_settings").select("*"),
      tenantId
    ).maybeSingle();

    if (error && error.code !== "PGRST116") {
      console.error("[reservation-settings] GET error:", error);
      return serverError("設定の取得に失敗しました");
    }

    return NextResponse.json({
      ok: true,
      settings: data ?? DEFAULT_SETTINGS,
    });
  } catch (e) {
    console.error("[reservation-settings] GET error:", e);
    return serverError("設定の取得に失敗しました");
  }
}

/** PUT /api/admin/reservation-settings — 予約設定を更新（upsert） */
export async function PUT(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);

  try {
    const parsed = await parseBody(req, reservationSettingsSchema);
    if ("error" in parsed) return parsed.error;

    const now = new Date().toISOString();
    const record = {
      ...tenantPayload(tenantId),
      change_deadline_hours: parsed.data.change_deadline_hours,
      cancel_deadline_hours: parsed.data.cancel_deadline_hours,
      booking_start_days_before: parsed.data.booking_start_days_before,
      booking_deadline_hours_before: parsed.data.booking_deadline_hours_before,
      booking_open_day: parsed.data.booking_open_day,
      updated_at: now,
    };

    // upsert（tenant_id がUNIQUEなので onConflict で安全）
    const { data, error } = await supabaseAdmin
      .from("reservation_settings")
      .upsert(record, { onConflict: "tenant_id" })
      .select()
      .single();

    if (error) {
      console.error("[reservation-settings] PUT error:", error);
      return serverError("設定の保存に失敗しました");
    }

    return NextResponse.json({ ok: true, settings: data });
  } catch (e) {
    console.error("[reservation-settings] PUT error:", e);
    return serverError("設定の保存に失敗しました");
  }
}
