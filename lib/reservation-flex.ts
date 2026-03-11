// lib/reservation-flex.ts
// 予約操作時のLINE Flexメッセージビルダー + 送信関数
// 配色・文言は管理画面から設定可能（tenant_settings経由）

import { pushMessage } from "@/lib/line-push";
import { supabaseAdmin } from "@/lib/supabase";
import { getFlexConfig } from "@/lib/flex-message/config";
import { DEFAULT_FLEX_CONFIG, getColorsForTab } from "@/lib/flex-message/types";
import { tenantPayload } from "@/lib/tenant";

// デフォルト色（DB未設定時のフォールバック）
const GRAY_LIGHT = "#999999"; // 取り消し線テキスト

// "2026-02-15" + "14:00:00" → "2/15(土) 14:00〜14:15"
function formatDateTime(dateStr: string, timeStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  const weekday = weekdays[dt.getUTCDay()];

  const hhmm = timeStr.slice(0, 5);
  const [hh, mm] = hhmm.split(":").map(Number);
  const endTotal = hh * 60 + mm + 15;
  const endHH = Math.floor(endTotal / 60);
  const endMM = endTotal % 60;
  const endTime = `${endHH}:${String(endMM).padStart(2, "0")}`;

  return `${m}/${d}(${weekday}) ${hhmm}〜${endTime}`;
}

/** 予約確定 Flex */
export async function buildReservationCreatedFlex(dateStr: string, timeStr: string, tenantId?: string) {
  const formatted = formatDateTime(dateStr, timeStr);
  let cfg = DEFAULT_FLEX_CONFIG;
  try { cfg = await getFlexConfig(tenantId); } catch {}
  const colors = getColorsForTab(cfg, "reservation");
  const { reservation } = cfg;

  return {
    type: "flex" as const,
    altText: `【予約確定】${formatted} のご予約を承りました`,
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        contents: [
          { type: "text", text: reservation.createdHeader, weight: "bold", size: "lg", color: colors.headerText },
        ],
        backgroundColor: colors.headerBg,
        paddingAll: "16px",
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "box",
            layout: "vertical",
            contents: [
              { type: "text", text: "予約日時", size: "sm", color: colors.bodyText },
              { type: "text", text: formatted, size: "xl", weight: "bold", margin: "sm", color: colors.accentColor },
            ],
          },
          { type: "separator", margin: "md" },
          {
            type: "text",
            text: reservation.createdPhoneNotice,
            size: "sm",
            color: colors.bodyText,
            wrap: true,
            margin: "md",
          },
          {
            type: "text",
            text: reservation.createdNote,
            size: "sm",
            color: colors.bodyText,
            wrap: true,
            margin: "sm",
          },
        ],
        paddingAll: "16px",
      },
    },
  };
}

/** 予約変更 Flex（旧日時→新日時） */
export async function buildReservationChangedFlex(
  oldDateStr: string,
  oldTimeStr: string,
  newDateStr: string,
  newTimeStr: string,
  tenantId?: string,
) {
  const oldFormatted = formatDateTime(oldDateStr, oldTimeStr);
  const newFormatted = formatDateTime(newDateStr, newTimeStr);
  let cfg = DEFAULT_FLEX_CONFIG;
  try { cfg = await getFlexConfig(tenantId); } catch {}
  const colors = getColorsForTab(cfg, "reservation");
  const { reservation } = cfg;

  return {
    type: "flex" as const,
    altText: `【予約変更】新しい日時: ${newFormatted}`,
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        contents: [
          { type: "text", text: reservation.changedHeader, weight: "bold", size: "lg", color: colors.headerText },
        ],
        backgroundColor: colors.headerBg,
        paddingAll: "16px",
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: oldFormatted,
                size: "md",
                color: GRAY_LIGHT,
              },
              {
                type: "text",
                text: `→ ${newFormatted}`,
                size: "lg",
                weight: "bold",
                color: colors.accentColor,
                margin: "sm",
              },
            ],
            margin: "none",
          },
          { type: "separator", margin: "md" },
          {
            type: "text",
            text: reservation.changedPhoneNotice,
            size: "sm",
            color: colors.bodyText,
            wrap: true,
            margin: "md",
          },
        ],
        paddingAll: "16px",
      },
    },
  };
}

/** 予約キャンセル Flex */
export async function buildReservationCanceledFlex(dateStr: string, timeStr: string, tenantId?: string) {
  const formatted = formatDateTime(dateStr, timeStr);
  let cfg = DEFAULT_FLEX_CONFIG;
  try { cfg = await getFlexConfig(tenantId); } catch {}
  const colors = getColorsForTab(cfg, "reservation");
  const { reservation } = cfg;

  return {
    type: "flex" as const,
    altText: `【予約キャンセル】${formatted} の予約をキャンセルしました`,
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        contents: [
          { type: "text", text: reservation.canceledHeader, weight: "bold", size: "lg", color: colors.headerText },
        ],
        backgroundColor: colors.headerBg,
        paddingAll: "16px",
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "box",
            layout: "vertical",
            contents: [
              { type: "text", text: "キャンセルされた予約", size: "sm", color: colors.bodyText },
              {
                type: "text",
                text: formatted,
                size: "lg",
                weight: "bold",
                margin: "sm",
                decoration: "line-through",
                color: GRAY_LIGHT,
              },
            ],
          },
          { type: "separator", margin: "md" },
          {
            type: "text",
            text: reservation.canceledNote,
            size: "sm",
            color: colors.bodyText,
            wrap: true,
            margin: "md",
          },
        ],
        paddingAll: "16px",
      },
    },
  };
}

/** 前日リマインド Flex（簡潔版） */
export async function buildReminderFlex(dateStr: string, timeStr: string, tenantId?: string) {
  const formatted = formatDateTime(dateStr, timeStr);
  let cfg = DEFAULT_FLEX_CONFIG;
  try { cfg = await getFlexConfig(tenantId); } catch {}
  const colors = getColorsForTab(cfg, "reservation");

  return {
    type: "flex" as const,
    altText: `【明日のご予約】${formatted}`,
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        contents: [
          { type: "text", text: "明日のご予約", weight: "bold", size: "lg", color: colors.headerText },
        ],
        backgroundColor: colors.headerBg,
        paddingAll: "16px",
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "box",
            layout: "vertical",
            contents: [
              { type: "text", text: "予約日時", size: "sm", color: colors.bodyText },
              { type: "text", text: formatted, size: "xl", weight: "bold", margin: "sm", color: colors.accentColor },
            ],
          },
          { type: "separator", margin: "md" },
          {
            type: "text",
            text: "明日のご予約がございます。\n変更・キャンセルをご希望の場合は、マイページよりお手続きをお願いいたします。",
            size: "sm",
            color: colors.bodyText,
            wrap: true,
            margin: "md",
          },
        ],
        paddingAll: "16px",
      },
    },
  };
}

// ============================================
// アクション設定チェック + 実行
// ============================================

import { linkRichMenuToUser } from "@/lib/line-richmenu";

type ActionItem = {
  action_type: string;
  sort_order: number;
  config: Record<string, unknown>;
};

type ActionSettingWithItems = {
  is_enabled: boolean;
  items: ActionItem[];
};

// キャッシュ（テナント×イベント別）
let actionSettingsCache: Map<string, { data: ActionSettingWithItems; cachedAt: number }> = new Map();
const ACTION_CACHE_TTL_MS = 60000; // 1分

type ReservationEventType = "reservation_created" | "reservation_changed" | "reservation_canceled";

/** 指定イベントのアクション設定を取得（デフォルト: 有効、アイテムなし=デフォルトFlex） */
export async function getActionSetting(
  eventType: ReservationEventType,
  tenantId?: string,
): Promise<ActionSettingWithItems> {
  const cacheKey = `${tenantId || "__default__"}:${eventType}`;
  const cached = actionSettingsCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < ACTION_CACHE_TTL_MS) {
    return cached.data;
  }

  const defaultSetting: ActionSettingWithItems = { is_enabled: true, items: [] };

  try {
    const query = supabaseAdmin
      .from("reservation_action_settings")
      .select("is_enabled, reservation_action_items(action_type, sort_order, config)")
      .eq("event_type", eventType);

    if (tenantId) {
      query.eq("tenant_id", tenantId);
    }

    const { data, error } = await query.maybeSingle();

    if (error && error.code !== "PGRST116") {
      console.error("[getActionSetting] error:", error);
      return defaultSetting;
    }

    if (!data) {
      actionSettingsCache.set(cacheKey, { data: defaultSetting, cachedAt: Date.now() });
      return defaultSetting;
    }

    const setting: ActionSettingWithItems = {
      is_enabled: data.is_enabled,
      items: ((data as Record<string, unknown>).reservation_action_items as ActionItem[] || [])
        .sort((a, b) => a.sort_order - b.sort_order),
    };

    actionSettingsCache.set(cacheKey, { data: setting, cachedAt: Date.now() });
    return setting;
  } catch {
    return defaultSetting;
  }
}

/** 予約イベントのアクションを全て実行（fire-and-forget向け） */
export async function executeReservationActions(params: {
  eventType: ReservationEventType;
  patientId: string;
  lineUid: string;
  date: string;
  time: string;
  tenantId?: string;
  /** 変更時の旧日時 */
  oldDate?: string;
  oldTime?: string;
}): Promise<void> {
  const { eventType, patientId, lineUid, date, time, tenantId, oldDate, oldTime } = params;

  const setting = await getActionSetting(eventType, tenantId);
  if (!setting.is_enabled) return;

  // アイテムなし = デフォルトFlexを送信（後方互換）
  if (setting.items.length === 0) {
    await sendDefaultFlex(eventType, patientId, lineUid, date, time, tenantId, oldDate, oldTime);
    return;
  }

  // アイテムを順次実行
  for (const item of setting.items) {
    try {
      await executeActionItem(item, patientId, lineUid, date, time, tenantId, oldDate, oldTime);
    } catch (err) {
      console.error(`[executeReservationActions] ${item.action_type} error:`, err);
    }
  }
}

/** デフォルトFlexメッセージ送信（アイテム未設定時の後方互換） */
async function sendDefaultFlex(
  eventType: ReservationEventType,
  patientId: string,
  lineUid: string,
  date: string,
  time: string,
  tenantId?: string,
  oldDate?: string,
  oldTime?: string,
): Promise<void> {
  let flex;
  switch (eventType) {
    case "reservation_created":
      flex = await buildReservationCreatedFlex(date, time, tenantId);
      break;
    case "reservation_changed":
      flex = await buildReservationChangedFlex(oldDate || date, oldTime || time, date, time, tenantId);
      break;
    case "reservation_canceled":
      flex = await buildReservationCanceledFlex(date, time, tenantId);
      break;
  }
  await sendReservationNotification({ patientId, lineUid, flex, messageType: eventType, tenantId });
}

/** 個別アクションアイテムを実行 */
async function executeActionItem(
  item: ActionItem,
  patientId: string,
  lineUid: string,
  date: string,
  time: string,
  tenantId?: string,
  oldDate?: string,
  oldTime?: string,
): Promise<void> {
  switch (item.action_type) {
    case "text_send": {
      const msg = (item.config.message as string) || "";
      if (!msg) return;
      const text = msg
        .replace(/\{date\}/g, `${date} ${time}`)
        .replace(/\{name\}/g, "");
      await pushMessage(lineUid, [{ type: "text", text: text.trim() }], tenantId);
      // message_log記録
      await supabaseAdmin.from("message_log").insert({
        ...(tenantId ? { tenant_id: tenantId } : {}),
        patient_id: patientId,
        line_uid: lineUid,
        direction: "outgoing",
        event_type: "message",
        message_type: "reservation_action",
        content: text.trim(),
        status: "sent",
      });
      break;
    }
    case "template_send": {
      // デフォルトFlexを送信
      await sendDefaultFlex(
        "reservation_created", patientId, lineUid, date, time, tenantId, oldDate, oldTime
      );
      break;
    }
    case "tag_add": {
      const tagId = item.config.tag_id as number;
      if (!tagId) return;
      await supabaseAdmin
        .from("patient_tags")
        .upsert({
          patient_id: patientId,
          tag_id: tagId,
          assigned_by: "reservation_action",
          ...(tenantId ? { tenant_id: tenantId } : {}),
        }, { onConflict: "patient_id,tag_id" });
      console.log(`[action] tag_add: patient=${patientId}, tag=${tagId}`);
      break;
    }
    case "tag_remove": {
      const removeTagId = item.config.tag_id as number;
      if (!removeTagId) return;
      await supabaseAdmin
        .from("patient_tags")
        .delete()
        .eq("patient_id", patientId)
        .eq("tag_id", removeTagId);
      console.log(`[action] tag_remove: patient=${patientId}, tag=${removeTagId}`);
      break;
    }
    case "mark_change": {
      const mark = (item.config.mark as string) || "none";
      await supabaseAdmin
        .from("patient_marks")
        .upsert({
          patient_id: patientId,
          mark,
          updated_by: "reservation_action",
          ...(tenantId ? { tenant_id: tenantId } : {}),
        }, { onConflict: "patient_id" });
      console.log(`[action] mark_change: patient=${patientId}, mark=${mark}`);
      break;
    }
    case "menu_change": {
      const richMenuId = item.config.rich_menu_id as number;
      if (!richMenuId) return;
      // DB から LINE上のメニューIDを取得
      const { data: menuData } = await supabaseAdmin
        .from("rich_menus")
        .select("line_rich_menu_id")
        .eq("id", richMenuId)
        .maybeSingle();
      if (menuData?.line_rich_menu_id) {
        await linkRichMenuToUser(lineUid, menuData.line_rich_menu_id, tenantId);
        console.log(`[action] menu_change: patient=${patientId}, menu=${richMenuId}`);
      }
      break;
    }
  }
}

/** LINE送信 + message_log 記録 */
export async function sendReservationNotification(params: {
  patientId: string;
  lineUid: string;
  flex: { type: "flex"; altText: string; contents: Record<string, unknown> };
  messageType: "reservation_created" | "reservation_changed" | "reservation_canceled";
  tenantId?: string;
}): Promise<void> {
  const { patientId, lineUid, flex, messageType, tenantId } = params;
  const tid = tenantId ?? null;

  try {
    const res = await pushMessage(lineUid, [flex], tenantId ?? undefined);
    const status = res?.ok ? "sent" : "failed";

    await supabaseAdmin.from("message_log").insert({
      ...tenantPayload(tid),
      patient_id: patientId,
      line_uid: lineUid,
      direction: "outgoing",
      event_type: "message",
      message_type: messageType,
      content: `[${flex.altText}]`,
      flex_json: flex.contents,
      status,
    });

    console.log(`[reservation-flex] ${messageType}: patient=${patientId}, status=${status}`);
  } catch (err) {
    console.error(`[reservation-flex] ${messageType} error:`, err);
    try {
      await supabaseAdmin.from("message_log").insert({
        ...tenantPayload(tid),
        patient_id: patientId,
        line_uid: lineUid,
        direction: "outgoing",
        event_type: "message",
        message_type: messageType,
        content: `[${flex.altText}]`,
        flex_json: flex.contents,
        status: "failed",
        error_message: String(err),
      });
    } catch {
      // ログ記録失敗は握りつぶす
    }
  }
}
