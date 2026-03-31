// lib/salon-reservation-handler.ts — SALON LINE予約フローハンドラ
//
// LINEメッセージ・Postbackイベントから予約フローを制御する。
// - 「予約」「予約する」メッセージでフロー開始
// - Postbackデータで各ステップを進行
// - 予約確定時にreservationsテーブルにINSERT

import type { LineMessage } from "@/lib/line-push";
import { supabaseAdmin } from "@/lib/supabase";
import { strictWithTenant, tenantPayload } from "@/lib/tenant";
import {
  getFlowState,
  setFlowState,
  clearFlowState,
  type ReservationFlowState,
} from "@/lib/salon-reservation-flow";
import {
  buildMenuSelectMessage,
  buildStylistSelectMessage,
  buildDateSelectMessage,
  buildTimeSelectMessage,
  buildConfirmMessage,
  buildCompletedMessage,
  buildCancelledMessage,
} from "@/lib/salon-reservation-messages";

// ---------------------------------------------------------------------------
// テナントの業種判定
// ---------------------------------------------------------------------------

/** テナントがSALON業種かどうかを判定する */
async function isSalonTenant(tenantId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("tenants")
    .select("industry")
    .eq("id", tenantId)
    .maybeSingle();
  return data?.industry === "salon";
}

// ---------------------------------------------------------------------------
// メインハンドラ（テキストメッセージ用）
// ---------------------------------------------------------------------------

/**
 * SALON予約フローのテキストメッセージハンドラ
 *
 * @returns 予約フロー対応のメッセージ配列、対象外の場合はnull
 */
export async function handleSalonReservationMessage(
  lineUid: string,
  messageText: string,
  tenantId: string,
  patientId: string,
): Promise<LineMessage[] | null> {
  // 既存フローがあるか確認
  const flow = getFlowState(lineUid);

  // 「予約」「予約する」で新規フロー開始
  if (!flow && /^予約(する)?$/.test(messageText.trim())) {
    // テナントがSALONか確認
    const isSalon = await isSalonTenant(tenantId);
    if (!isSalon) return null;

    console.log(`[salon-reserve] 予約フロー開始: lineUid=${lineUid}, tenantId=${tenantId}`);

    // 新規フロー作成 → メニュー選択ステップ
    const newState: ReservationFlowState = {
      step: "menu_select",
      tenantId,
      patientId,
      lineUid,
    };
    setFlowState(lineUid, newState);

    const menuMsg = await buildMenuSelectMessage(tenantId);
    return [
      { type: "text", text: "ご予約を承ります。\n施術メニューをお選びください。" },
      menuMsg,
    ];
  }

  // フロー進行中にテキストが来た場合（Postbackではない場合のフォールバック）
  if (flow) {
    // 「キャンセル」「やめる」でフロー中止
    if (/^(キャンセル|やめる|中止)$/.test(messageText.trim())) {
      clearFlowState(lineUid);
      return [buildCancelledMessage()];
    }

    // フロー中のテキストメッセージは無視して案内を返す
    return [
      {
        type: "text",
        text: "予約フローの途中です。\n上のボタンから選択してください。\n中止する場合は「キャンセル」と送信してください。",
      },
    ];
  }

  return null;
}

// ---------------------------------------------------------------------------
// Postbackハンドラ
// ---------------------------------------------------------------------------

/**
 * SALON予約フローのPostbackハンドラ
 *
 * @returns 予約フロー対応のメッセージ配列、対象外の場合はnull
 */
export async function handleSalonReservationPostback(
  lineUid: string,
  postbackData: string,
  tenantId: string,
  patientId: string,
): Promise<LineMessage[] | null> {
  // salon_reserve アクションか判定
  if (!postbackData.includes("action=salon_reserve")) return null;

  const params = parseQueryString(postbackData);
  const step = params.step;
  const flow = getFlowState(lineUid);

  // フローが存在しない場合（TTL切れなど）
  if (!flow && step !== "menu") {
    return [
      {
        type: "text",
        text: "予約フローの有効期限が切れました。\n「予約」と送信して最初からやり直してください。",
      },
    ];
  }

  try {
    switch (step) {
      case "menu": {
        // メニュー選択
        const menuId = params.menu_id;
        const menuName = decodeURIComponent(params.menu_name || "");
        const duration = Number(params.duration) || 60;
        const price = Number(params.price) || 0;

        const state: ReservationFlowState = {
          step: "stylist_select",
          tenantId,
          patientId,
          lineUid,
          selectedMenuId: menuId,
          selectedMenuName: menuName,
          selectedMenuDuration: duration,
          selectedMenuPrice: price,
        };
        setFlowState(lineUid, state);

        console.log(`[salon-reserve] メニュー選択: ${menuName} (${lineUid})`);
        const stylistMsg = await buildStylistSelectMessage(tenantId);
        return [
          { type: "text", text: `${menuName}を選択しました。\n次に担当スタイリストをお選びください。` },
          stylistMsg,
        ];
      }

      case "stylist": {
        if (!flow) return null;
        // スタイリスト選択
        const stylistId = params.stylist_id;
        const stylistName = decodeURIComponent(params.stylist_name || "");

        const state: ReservationFlowState = {
          ...flow,
          step: "date_select",
          selectedStylistId: stylistId,
          selectedStylistName: stylistName,
        };
        setFlowState(lineUid, state);

        console.log(`[salon-reserve] スタイリスト選択: ${stylistName} (${lineUid})`);
        const dateMsg = buildDateSelectMessage();
        return [
          { type: "text", text: `${stylistName}を選択しました。\nご希望の日付をお選びください。` },
          dateMsg,
        ];
      }

      case "date": {
        if (!flow) return null;
        // 日付選択
        const date = params.date;

        const state: ReservationFlowState = {
          ...flow,
          step: "time_select",
          selectedDate: date,
        };
        setFlowState(lineUid, state);

        console.log(`[salon-reserve] 日付選択: ${date} (${lineUid})`);
        const timeMsg = await buildTimeSelectMessage(
          tenantId,
          flow.selectedStylistId,
          date,
          flow.selectedMenuDuration || 60,
        );
        return [timeMsg];
      }

      case "time": {
        if (!flow) return null;
        // 時間選択
        const time = params.time;

        const state: ReservationFlowState = {
          ...flow,
          step: "confirm",
          selectedTime: time,
        };
        setFlowState(lineUid, state);

        console.log(`[salon-reserve] 時間選択: ${time} (${lineUid})`);
        const confirmMsg = buildConfirmMessage(state);
        return [confirmMsg];
      }

      case "confirm": {
        if (!flow) return null;
        const confirm = params.confirm;

        if (confirm === "no") {
          // キャンセル
          clearFlowState(lineUid);
          console.log(`[salon-reserve] 予約キャンセル (${lineUid})`);
          return [buildCancelledMessage()];
        }

        if (confirm === "yes") {
          // 予約確定
          console.log(`[salon-reserve] 予約確定処理開始 (${lineUid})`);
          const result = await createSalonReservation(flow);

          clearFlowState(lineUid);

          if (result.ok) {
            console.log(`[salon-reserve] 予約確定: ${result.reserveId} (${lineUid})`);
            return [buildCompletedMessage(flow, result.reserveId!)];
          } else {
            console.error(`[salon-reserve] 予約確定失敗: ${result.error} (${lineUid})`);
            return [
              {
                type: "text",
                text: "申し訳ありません。予約の確定に失敗しました。\nお手数ですがお電話にてお問い合わせください。",
              },
            ];
          }
        }

        return null;
      }

      default:
        return null;
    }
  } catch (err) {
    console.error("[salon-reserve] フロー処理エラー:", err);
    clearFlowState(lineUid);
    return [
      {
        type: "text",
        text: "予約処理中にエラーが発生しました。\nお手数ですがもう一度「予約」と送信してください。",
      },
    ];
  }
}

// ---------------------------------------------------------------------------
// 予約確定処理
// ---------------------------------------------------------------------------

async function createSalonReservation(
  state: ReservationFlowState,
): Promise<{ ok: boolean; reserveId?: string; error?: string }> {
  const reserveId = `salon-${Date.now()}`;

  try {
    // 患者名を取得
    const { data: patient } = await strictWithTenant(
      supabaseAdmin
        .from("patients")
        .select("name, line_display_name")
        .eq("patient_id", state.patientId)
        .maybeSingle(),
      state.tenantId,
    );

    const patientName = patient?.name || patient?.line_display_name || "";

    // スタイリスト情報をnotesにJSON形式で記録
    const notes = JSON.stringify({
      source: "line_salon_reserve",
      menu_id: state.selectedMenuId,
      menu_name: state.selectedMenuName,
      menu_duration: state.selectedMenuDuration,
      menu_price: state.selectedMenuPrice,
      stylist_id: state.selectedStylistId,
      stylist_name: state.selectedStylistName,
    });

    // reservationsテーブルにINSERT
    const { error: insertError } = await supabaseAdmin
      .from("reservations")
      .insert({
        ...tenantPayload(state.tenantId),
        reserve_id: reserveId,
        patient_id: state.patientId,
        patient_name: patientName,
        reserved_date: state.selectedDate,
        reserved_time: state.selectedTime,
        status: "confirmed",
        notes,
      });

    if (insertError) {
      console.error("[salon-reserve] INSERT失敗:", insertError.message);
      return { ok: false, error: insertError.message };
    }

    return { ok: true, reserveId };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "unknown error";
    console.error("[salon-reserve] 予約作成例外:", errMsg);
    return { ok: false, error: errMsg };
  }
}

// ---------------------------------------------------------------------------
// ユーティリティ
// ---------------------------------------------------------------------------

/** "a=b&c=d" → { a: "b", c: "d" } */
function parseQueryString(data: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of String(data || "").split("&")) {
    if (!part) continue;
    const [k, v] = part.split("=");
    if (!k) continue;
    out[decodeURIComponent(k)] = decodeURIComponent(v || "");
  }
  return out;
}
