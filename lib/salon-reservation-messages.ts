// lib/salon-reservation-messages.ts — SALON予約フロー用LINE Flex Message生成
//
// 各ステップで表示するFlex Message（カルーセル、Quick Reply等）を生成する。

import type { LineMessage } from "@/lib/line-push";
import type { ReservationFlowState } from "@/lib/salon-reservation-flow";
import { supabaseAdmin } from "@/lib/supabase";
import { strictWithTenant } from "@/lib/tenant";

// ---------------------------------------------------------------------------
// 色定数（Flex Message用）
// ---------------------------------------------------------------------------
const PRIMARY_COLOR = "#4A90D9";
const SECONDARY_COLOR = "#8B5CF6";
const CONFIRM_COLOR = "#22C55E";
const CANCEL_COLOR = "#EF4444";
const TEXT_COLOR = "#333333";
const SUB_TEXT_COLOR = "#888888";

// ---------------------------------------------------------------------------
// 1. メニュー選択カルーセル
// ---------------------------------------------------------------------------

/**
 * テナントのアクティブな施術メニューを取得し、Flex Carouselで返す
 */
export async function buildMenuSelectMessage(tenantId: string): Promise<LineMessage> {
  const { data: menus } = await strictWithTenant(
    supabaseAdmin
      .from("treatment_menus")
      .select("id, name, duration_min, price, description")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    tenantId,
  );

  if (!menus || menus.length === 0) {
    return {
      type: "text",
      text: "現在ご予約可能なメニューがありません。お手数ですがお電話にてお問い合わせください。",
    };
  }

  // Flex Carousel（最大10枚）
  const bubbles = menus.slice(0, 10).map((menu) => ({
    type: "bubble",
    size: "kilo",
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: menu.name,
          weight: "bold",
          size: "md",
          color: TEXT_COLOR,
          wrap: true,
        },
        {
          type: "box",
          layout: "horizontal",
          margin: "md",
          contents: [
            {
              type: "text",
              text: `${menu.duration_min}分`,
              size: "sm",
              color: SUB_TEXT_COLOR,
              flex: 1,
            },
            {
              type: "text",
              text: `¥${(menu.price ?? 0).toLocaleString()}`,
              size: "sm",
              color: PRIMARY_COLOR,
              weight: "bold",
              align: "end",
              flex: 1,
            },
          ],
        },
        ...(menu.description
          ? [
              {
                type: "text" as const,
                text: menu.description,
                size: "xs" as const,
                color: SUB_TEXT_COLOR,
                wrap: true,
                margin: "sm" as const,
                maxLines: 3,
              },
            ]
          : []),
      ],
    },
    footer: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "button",
          action: {
            type: "postback",
            label: "このメニューを選択",
            data: `action=salon_reserve&step=menu&menu_id=${menu.id}&menu_name=${encodeURIComponent(menu.name)}&duration=${menu.duration_min}&price=${menu.price ?? 0}`,
            displayText: `${menu.name}を選択`,
          },
          style: "primary",
          color: PRIMARY_COLOR,
        },
      ],
    },
  }));

  return {
    type: "flex",
    altText: "施術メニューを選択してください",
    contents: {
      type: "carousel",
      contents: bubbles,
    },
  };
}

// ---------------------------------------------------------------------------
// 2. スタイリスト選択カルーセル
// ---------------------------------------------------------------------------

/**
 * テナントのアクティブなスタイリストを取得し、Flex Carouselで返す
 */
export async function buildStylistSelectMessage(tenantId: string): Promise<LineMessage> {
  const { data: stylists } = await strictWithTenant(
    supabaseAdmin
      .from("stylists")
      .select("id, name, display_name, specialties")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    tenantId,
  );

  if (!stylists || stylists.length === 0) {
    return {
      type: "text",
      text: "担当スタイリストの情報が登録されていません。お手数ですがお電話にてお問い合わせください。",
    };
  }

  // 「指名なし」オプションを先頭に追加
  const bubbles = [
    {
      type: "bubble",
      size: "kilo",
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "指名なし",
            weight: "bold",
            size: "md",
            color: TEXT_COLOR,
          },
          {
            type: "text",
            text: "スタイリストの指名をしません",
            size: "xs",
            color: SUB_TEXT_COLOR,
            margin: "sm",
            wrap: true,
          },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "button",
            action: {
              type: "postback",
              label: "指名なしで予約",
              data: `action=salon_reserve&step=stylist&stylist_id=none&stylist_name=${encodeURIComponent("指名なし")}`,
              displayText: "指名なしで予約",
            },
            style: "primary",
            color: SECONDARY_COLOR,
          },
        ],
      },
    },
    ...stylists.slice(0, 9).map((stylist) => {
      const displayName = stylist.display_name || stylist.name;
      const specialties = (stylist.specialties as string[] | null)?.join("・") || "";
      return {
        type: "bubble",
        size: "kilo",
        body: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "text",
              text: displayName,
              weight: "bold",
              size: "md",
              color: TEXT_COLOR,
            },
            ...(specialties
              ? [
                  {
                    type: "text" as const,
                    text: specialties,
                    size: "xs" as const,
                    color: SUB_TEXT_COLOR,
                    margin: "sm" as const,
                    wrap: true,
                  },
                ]
              : []),
          ],
        },
        footer: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "button",
              action: {
                type: "postback",
                label: "このスタイリストを選択",
                data: `action=salon_reserve&step=stylist&stylist_id=${stylist.id}&stylist_name=${encodeURIComponent(displayName)}`,
                displayText: `${displayName}を指名`,
              },
              style: "primary",
              color: PRIMARY_COLOR,
            },
          ],
        },
      };
    }),
  ];

  return {
    type: "flex",
    altText: "スタイリストを選択してください",
    contents: {
      type: "carousel",
      contents: bubbles,
    },
  };
}

// ---------------------------------------------------------------------------
// 3. 日付選択メッセージ（Quick Reply）
// ---------------------------------------------------------------------------

/**
 * 今日〜7日後の日付をQuick Replyボタンで表示
 */
export function buildDateSelectMessage(): LineMessage {
  const now = new Date();
  // JST変換
  const jstOffset = 9 * 60 * 60 * 1000;
  const jstNow = new Date(now.getTime() + jstOffset);

  const items = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(jstNow.getTime() + i * 24 * 60 * 60 * 1000);
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    const dateStr = `${yyyy}-${mm}-${dd}`;
    const dayOfWeek = ["日", "月", "火", "水", "木", "金", "土"][d.getUTCDay()];
    const label = `${Number(mm)}/${Number(dd)}(${dayOfWeek})`;

    items.push({
      type: "action",
      action: {
        type: "postback",
        label,
        data: `action=salon_reserve&step=date&date=${dateStr}`,
        displayText: `${label}を選択`,
      },
    });
  }

  return {
    type: "text",
    text: "ご希望の日付を選択してください 📅",
    // Quick Reply はLineMessage型に含まれないが、LINEのpush APIに直接渡される
    quickReply: { items },
  } as unknown as LineMessage;
}

// ---------------------------------------------------------------------------
// 4. 時間選択メッセージ（空き枠ベース）
// ---------------------------------------------------------------------------

/**
 * スタイリストのシフトと既存予約から空き時間枠を計算し、Quick Replyで表示
 */
export async function buildTimeSelectMessage(
  tenantId: string,
  stylistId: string | undefined,
  date: string,
  durationMin: number,
): Promise<LineMessage> {
  // 日付から曜日を取得（0=日曜）
  const dateObj = new Date(date + "T00:00:00Z");
  const dayOfWeek = dateObj.getUTCDay();

  // シフト取得（指名ありの場合のみ。指名なしは全スタイリストのシフトを統合）
  let shifts: { start_time: string; end_time: string; is_available: boolean }[] = [];

  if (stylistId && stylistId !== "none") {
    // 特定日のシフト → 曜日シフトのフォールバック
    const { data: specificShifts } = await supabaseAdmin
      .from("stylist_shifts")
      .select("start_time, end_time, is_available")
      .eq("stylist_id", stylistId)
      .eq("specific_date", date);

    if (specificShifts && specificShifts.length > 0) {
      shifts = specificShifts;
    } else {
      const { data: weeklyShifts } = await supabaseAdmin
        .from("stylist_shifts")
        .select("start_time, end_time, is_available")
        .eq("stylist_id", stylistId)
        .eq("day_of_week", dayOfWeek)
        .is("specific_date", null);

      shifts = weeklyShifts || [];
    }
  } else {
    // 指名なし: テナントの全アクティブスタイリストのシフトを統合
    const { data: allStylists } = await strictWithTenant(
      supabaseAdmin.from("stylists").select("id").eq("is_active", true),
      tenantId,
    );
    const stylistIds = (allStylists || []).map((s) => s.id);

    if (stylistIds.length > 0) {
      const { data: specificShifts } = await supabaseAdmin
        .from("stylist_shifts")
        .select("start_time, end_time, is_available, stylist_id")
        .in("stylist_id", stylistIds)
        .eq("specific_date", date);

      if (specificShifts && specificShifts.length > 0) {
        shifts = specificShifts;
      } else {
        const { data: weeklyShifts } = await supabaseAdmin
          .from("stylist_shifts")
          .select("start_time, end_time, is_available, stylist_id")
          .in("stylist_id", stylistIds)
          .eq("day_of_week", dayOfWeek)
          .is("specific_date", null);

        shifts = weeklyShifts || [];
      }
    }
  }

  // 利用可能なシフトのみ
  const availableShifts = shifts.filter((s) => s.is_available !== false);

  if (availableShifts.length === 0) {
    return {
      type: "text",
      text: "申し訳ありません。選択された日付は営業時間外または空きがありません。\n別の日付をお選びください。",
    };
  }

  // シフトから時間枠を30分刻みで生成
  const slotSet = new Set<string>();
  for (const shift of availableShifts) {
    const [startH, startM] = shift.start_time.split(":").map(Number);
    const [endH, endM] = shift.end_time.split(":").map(Number);
    const startMin = startH * 60 + startM;
    const endMin = endH * 60 + endM;

    // 施術時間分を考慮して枠を生成（施術が終了時間内に収まる枠のみ）
    for (let t = startMin; t + durationMin <= endMin; t += 30) {
      const hh = String(Math.floor(t / 60)).padStart(2, "0");
      const mm = String(t % 60).padStart(2, "0");
      slotSet.add(`${hh}:${mm}`);
    }
  }

  // 既存予約を取得して空き枠から除外
  if (stylistId && stylistId !== "none") {
    const { data: existingReservations } = await strictWithTenant(
      supabaseAdmin
        .from("reservations")
        .select("reserved_time")
        .eq("reserved_date", date)
        .neq("status", "canceled"),
      tenantId,
    );

    // notesにスタイリスト情報が含まれる予約を除外
    // （stylist_idカラムがないため、notes内のJSON記録で判断）
    if (existingReservations) {
      for (const r of existingReservations) {
        slotSet.delete(r.reserved_time);
      }
    }
  }

  const slots = Array.from(slotSet).sort();

  if (slots.length === 0) {
    return {
      type: "text",
      text: "申し訳ありません。選択された日付はすでに予約が埋まっています。\n別の日付をお選びください。",
    };
  }

  // Quick Replyで時間枠を表示（最大13個 = LINE仕様上限）
  const items = slots.slice(0, 13).map((time) => ({
    type: "action",
    action: {
      type: "postback",
      label: time,
      data: `action=salon_reserve&step=time&time=${time}`,
      displayText: `${time}を選択`,
    },
  }));

  return {
    type: "text",
    text: "ご希望のお時間を選択してください ⏰",
    quickReply: { items },
  } as unknown as LineMessage;
}

// ---------------------------------------------------------------------------
// 5. 予約確認メッセージ
// ---------------------------------------------------------------------------

/**
 * 予約内容の確認Flex Bubble（「予約確定」「キャンセル」ボタン付き）
 */
export function buildConfirmMessage(state: ReservationFlowState): LineMessage {
  const [y, m, d] = (state.selectedDate || "").split("-");
  const dateObj = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  const dayOfWeek = ["日", "月", "火", "水", "木", "金", "土"][dateObj.getUTCDay()];
  const dateLabel = `${Number(m)}月${Number(d)}日(${dayOfWeek})`;

  return {
    type: "flex",
    altText: "予約内容の確認",
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "ご予約内容の確認",
            weight: "bold",
            size: "lg",
            color: TEXT_COLOR,
          },
          { type: "separator", margin: "lg" },
          {
            type: "box",
            layout: "vertical",
            margin: "lg",
            spacing: "sm",
            contents: [
              makeRow("メニュー", state.selectedMenuName || ""),
              makeRow("担当", state.selectedStylistName || ""),
              makeRow("日付", dateLabel),
              makeRow("時間", state.selectedTime || ""),
              ...(state.selectedMenuPrice
                ? [makeRow("料金", `¥${state.selectedMenuPrice.toLocaleString()}`)]
                : []),
              ...(state.selectedMenuDuration
                ? [makeRow("所要時間", `${state.selectedMenuDuration}分`)]
                : []),
            ],
          },
        ],
      },
      footer: {
        type: "box",
        layout: "horizontal",
        spacing: "md",
        contents: [
          {
            type: "button",
            action: {
              type: "postback",
              label: "予約確定",
              data: "action=salon_reserve&step=confirm&confirm=yes",
              displayText: "予約を確定する",
            },
            style: "primary",
            color: CONFIRM_COLOR,
            flex: 2,
          },
          {
            type: "button",
            action: {
              type: "postback",
              label: "キャンセル",
              data: "action=salon_reserve&step=confirm&confirm=no",
              displayText: "予約をキャンセル",
            },
            style: "secondary",
            color: CANCEL_COLOR,
            flex: 1,
          },
        ],
      },
    },
  };
}

// 確認メッセージ用の行ヘルパー
function makeRow(label: string, value: string) {
  return {
    type: "box" as const,
    layout: "horizontal" as const,
    contents: [
      {
        type: "text" as const,
        text: label,
        size: "sm" as const,
        color: SUB_TEXT_COLOR,
        flex: 2,
      },
      {
        type: "text" as const,
        text: value,
        size: "sm" as const,
        color: TEXT_COLOR,
        flex: 3,
        wrap: true,
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// 6. 予約完了メッセージ
// ---------------------------------------------------------------------------

/**
 * 予約完了のFlex Bubble
 */
export function buildCompletedMessage(state: ReservationFlowState, reserveId: string): LineMessage {
  const [y, m, d] = (state.selectedDate || "").split("-");
  const dateObj = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  const dayOfWeek = ["日", "月", "火", "水", "木", "金", "土"][dateObj.getUTCDay()];
  const dateLabel = `${Number(m)}月${Number(d)}日(${dayOfWeek})`;

  return {
    type: "flex",
    altText: "ご予約が確定しました",
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "✅ ご予約が確定しました",
            weight: "bold",
            size: "lg",
            color: CONFIRM_COLOR,
          },
          { type: "separator", margin: "lg" },
          {
            type: "box",
            layout: "vertical",
            margin: "lg",
            spacing: "sm",
            contents: [
              makeRow("予約番号", reserveId),
              makeRow("メニュー", state.selectedMenuName || ""),
              makeRow("担当", state.selectedStylistName || ""),
              makeRow("日付", dateLabel),
              makeRow("時間", state.selectedTime || ""),
            ],
          },
          { type: "separator", margin: "lg" },
          {
            type: "text",
            text: "ご来店をお待ちしております。\nキャンセル・変更はお電話にてご連絡ください。",
            size: "xs",
            color: SUB_TEXT_COLOR,
            margin: "lg",
            wrap: true,
          },
        ],
      },
    },
  };
}

// ---------------------------------------------------------------------------
// 7. フローキャンセルメッセージ
// ---------------------------------------------------------------------------

export function buildCancelledMessage(): LineMessage {
  return {
    type: "text",
    text: "予約をキャンセルしました。\nまたのご利用をお待ちしております。",
  };
}
