// lib/reservation-flex.ts
// 予約操作時のLINE Flexメッセージビルダー + 送信関数
// 配色・文言は管理画面から設定可能（tenant_settings経由）

import { pushMessage } from "@/lib/line-push";
import { supabaseAdmin } from "@/lib/supabase";
import { getFlexConfig } from "@/lib/flex-message/config";
import { DEFAULT_FLEX_CONFIG } from "@/lib/flex-message/types";

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
export async function buildReservationCreatedFlex(dateStr: string, timeStr: string) {
  const formatted = formatDateTime(dateStr, timeStr);
  let cfg = DEFAULT_FLEX_CONFIG;
  try { cfg = await getFlexConfig(); } catch {}
  const { colors, reservation } = cfg;

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
) {
  const oldFormatted = formatDateTime(oldDateStr, oldTimeStr);
  const newFormatted = formatDateTime(newDateStr, newTimeStr);
  let cfg = DEFAULT_FLEX_CONFIG;
  try { cfg = await getFlexConfig(); } catch {}
  const { colors, reservation } = cfg;

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
export async function buildReservationCanceledFlex(dateStr: string, timeStr: string) {
  const formatted = formatDateTime(dateStr, timeStr);
  let cfg = DEFAULT_FLEX_CONFIG;
  try { cfg = await getFlexConfig(); } catch {}
  const { colors, reservation } = cfg;

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

/** LINE送信 + message_log 記録 */
export async function sendReservationNotification(params: {
  patientId: string;
  lineUid: string;
  flex: { type: "flex"; altText: string; contents: any };
  messageType: "reservation_created" | "reservation_changed" | "reservation_canceled";
}): Promise<void> {
  const { patientId, lineUid, flex, messageType } = params;

  try {
    const res = await pushMessage(lineUid, [flex]);
    const status = res?.ok ? "sent" : "failed";

    await supabaseAdmin.from("message_log").insert({
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
