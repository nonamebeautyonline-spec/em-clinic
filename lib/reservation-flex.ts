// lib/reservation-flex.ts
// 予約操作時のLINE Flexメッセージビルダー + 送信関数
// 配色: LPベースのショッキングピンク & 白

import { pushMessage } from "@/lib/line-push";
import { supabaseAdmin } from "@/lib/supabase";

// LP/マイページ テーマカラー
const PINK = "#ec4899";       // pink-400 ヘッダー背景・強調色
const PINK_DARK = "#be185d";  // pink-700 日時テキスト
const WHITE = "#ffffff";      // ヘッダーテキスト
const GRAY = "#666666";       // 補足テキスト
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
export function buildReservationCreatedFlex(dateStr: string, timeStr: string) {
  const formatted = formatDateTime(dateStr, timeStr);
  return {
    type: "flex" as const,
    altText: `【予約確定】${formatted} のご予約を承りました`,
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        contents: [
          { type: "text", text: "予約が確定しました", weight: "bold", size: "lg", color: WHITE },
        ],
        backgroundColor: PINK,
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
              { type: "text", text: "予約日時", size: "sm", color: GRAY },
              { type: "text", text: formatted, size: "xl", weight: "bold", margin: "sm", color: PINK_DARK },
            ],
          },
          { type: "separator", margin: "md" },
          {
            type: "text",
            text: "診療は予約時間枠の間に「090-」から始まる番号よりお電話いたします。",
            size: "sm",
            color: GRAY,
            wrap: true,
            margin: "md",
          },
          {
            type: "text",
            text: "変更・キャンセルはマイページからお手続きください。",
            size: "sm",
            color: GRAY,
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
export function buildReservationChangedFlex(
  oldDateStr: string,
  oldTimeStr: string,
  newDateStr: string,
  newTimeStr: string,
) {
  const oldFormatted = formatDateTime(oldDateStr, oldTimeStr);
  const newFormatted = formatDateTime(newDateStr, newTimeStr);
  return {
    type: "flex" as const,
    altText: `【予約変更】新しい日時: ${newFormatted}`,
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        contents: [
          { type: "text", text: "予約日時が変更されました", weight: "bold", size: "lg", color: WHITE },
        ],
        backgroundColor: PINK,
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
                color: PINK_DARK,
                margin: "sm",
              },
            ],
            margin: "none",
          },
          { type: "separator", margin: "md" },
          {
            type: "text",
            text: "診療は予約時間枠の間に「090-」から始まる番号よりお電話いたします。",
            size: "sm",
            color: GRAY,
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
export function buildReservationCanceledFlex(dateStr: string, timeStr: string) {
  const formatted = formatDateTime(dateStr, timeStr);
  return {
    type: "flex" as const,
    altText: `【予約キャンセル】${formatted} の予約をキャンセルしました`,
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        contents: [
          { type: "text", text: "予約がキャンセルされました", weight: "bold", size: "lg", color: WHITE },
        ],
        backgroundColor: PINK,
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
              { type: "text", text: "キャンセルされた予約", size: "sm", color: GRAY },
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
            text: "再度ご予約を希望される場合は、マイページから新しい日時をお選びください。",
            size: "sm",
            color: GRAY,
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
