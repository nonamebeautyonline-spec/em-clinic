// app/api/admin/reservation-actions/route.ts — 予約アクション設定API（GET/PUT）
// 複数アクション積み重ね対応（テキスト送信/テンプレート/タグ/マーク/メニュー）
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

type ActionItem = {
  id: string;
  action_type: string;
  sort_order: number;
  config: Record<string, unknown>;
};

type ActionSettingRow = {
  id: string;
  event_type: string;
  is_enabled: boolean;
  repeat_on_subsequent: boolean;
  reservation_action_items: ActionItem[];
};

/** GET — テナントの予約アクション設定を取得（アイテム含む） */
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantId(req);

  try {
    const { data, error } = await withTenant(
      supabaseAdmin
        .from("reservation_action_settings")
        .select("id, event_type, is_enabled, repeat_on_subsequent, reservation_action_items(id, action_type, sort_order, config)")
        .order("event_type"),
      tenantId
    );

    if (error) {
      console.error("[reservation-actions] GET error:", error);
      return serverError("取得に失敗しました");
    }

    // DB にレコードがないイベントはデフォルト値で補完
    const map = new Map(
      ((data as ActionSettingRow[]) || []).map((d) => [d.event_type, {
        event_type: d.event_type,
        is_enabled: d.is_enabled,
        repeat_on_subsequent: d.repeat_on_subsequent ?? true,
        items: (d.reservation_action_items || []).sort((a, b) => a.sort_order - b.sort_order),
      }])
    );

    const actions = RESERVATION_EVENT_TYPES.map((et) =>
      map.get(et) ?? { event_type: et, is_enabled: true, repeat_on_subsequent: true, items: [] }
    );

    return NextResponse.json({ ok: true, actions });
  } catch (e) {
    console.error("[reservation-actions] GET error:", e);
    return serverError("取得に失敗しました");
  }
}

/** PUT — 予約アクション設定を一括更新（settings upsert + items delete/insert） */
export async function PUT(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantId(req);

  try {
    const parsed = await parseBody(req, reservationActionSettingsSchema);
    if ("error" in parsed) return parsed.error;

    const now = new Date().toISOString();

    for (const action of parsed.data.actions) {
      // 1. settings upsert
      const settingRecord = {
        ...tenantPayload(tenantId),
        event_type: action.event_type,
        is_enabled: action.is_enabled,
        repeat_on_subsequent: action.repeat_on_subsequent ?? true,
        updated_at: now,
      };

      const { data: upserted, error: upsertError } = await supabaseAdmin
        .from("reservation_action_settings")
        .upsert(settingRecord, { onConflict: "tenant_id,event_type" })
        .select("id")
        .single();

      if (upsertError || !upserted) {
        console.error("[reservation-actions] upsert error:", upsertError);
        return serverError("設定の保存に失敗しました");
      }

      const settingId = upserted.id;

      // 2. 既存アイテムを削除
      await supabaseAdmin
        .from("reservation_action_items")
        .delete()
        .eq("action_setting_id", settingId);

      // 3. 新規アイテムを挿入
      if (action.items && action.items.length > 0) {
        const items = action.items.map((item, idx) => ({
          action_setting_id: settingId,
          action_type: item.action_type,
          sort_order: item.sort_order ?? idx,
          config: item.config || {},
        }));

        const { error: insertError } = await supabaseAdmin
          .from("reservation_action_items")
          .insert(items);

        if (insertError) {
          console.error("[reservation-actions] items insert error:", insertError);
          return serverError("アクションアイテムの保存に失敗しました");
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[reservation-actions] PUT error:", e);
    return serverError("保存に失敗しました");
  }
}
