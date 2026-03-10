// app/api/admin/reservation-actions/route.ts — 予約アクション設定API（GET/PUT）
import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant, tenantPayload } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import {
  reservationActionSettingsSchema,
  RESERVATION_EVENT_TYPES,
} from "@/lib/validations/reservation-settings";

// デフォルト: 全イベントON、カスタムメッセージなし
const DEFAULT_ACTIONS = RESERVATION_EVENT_TYPES.map((event_type) => ({
  event_type,
  is_enabled: true,
  use_custom_message: false,
  custom_message: null,
}));

/** GET — テナントの予約アクション設定を取得 */
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantId(req);

  try {
    const { data, error } = await withTenant(
      supabaseAdmin
        .from("reservation_action_settings")
        .select("event_type, is_enabled, use_custom_message, custom_message")
        .order("event_type"),
      tenantId
    );

    if (error) {
      console.error("[reservation-actions] GET error:", error);
      return serverError("取得に失敗しました");
    }

    // DB にレコードがないイベントはデフォルト値で補完
    const map = new Map(
      (data || []).map((d: { event_type: string; is_enabled: boolean; use_custom_message: boolean; custom_message: string | null }) => [d.event_type, d])
    );
    const actions = RESERVATION_EVENT_TYPES.map((et) =>
      map.get(et) ?? { event_type: et, is_enabled: true, use_custom_message: false, custom_message: null }
    );

    return NextResponse.json({ ok: true, actions });
  } catch (e) {
    console.error("[reservation-actions] GET error:", e);
    return serverError("取得に失敗しました");
  }
}

/** PUT — 予約アクション設定を一括更新（upsert） */
export async function PUT(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantId(req);

  try {
    const parsed = await parseBody(req, reservationActionSettingsSchema);
    if ("error" in parsed) return parsed.error;

    const now = new Date().toISOString();
    const records = parsed.data.actions.map((a) => ({
      ...tenantPayload(tenantId),
      event_type: a.event_type,
      is_enabled: a.is_enabled,
      use_custom_message: a.use_custom_message,
      custom_message: a.custom_message ?? null,
      updated_at: now,
    }));

    // upsert（tenant_id + event_type がUNIQUE）
    const { error } = await supabaseAdmin
      .from("reservation_action_settings")
      .upsert(records, { onConflict: "tenant_id,event_type" });

    if (error) {
      console.error("[reservation-actions] PUT error:", error);
      return serverError("保存に失敗しました");
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[reservation-actions] PUT error:", e);
    return serverError("保存に失敗しました");
  }
}
