// lib/shipping-flex.ts
// 発送完了通知のLINE Flexメッセージビルダー
// 配色: 予約通知と統一（LPベースのピンク & 白）

import { pushMessage } from "@/lib/line-push";
import { supabaseAdmin } from "@/lib/supabase";

// テーマカラー（reservation-flex.ts と統一）
const PINK = "#ec4899";       // pink-400 ヘッダー背景
const PINK_DARK = "#be185d";  // pink-700 追跡番号テキスト
const WHITE = "#ffffff";      // ヘッダーテキスト
const GRAY = "#666666";       // 補足テキスト

// 画像URL（public/images/）
const TRUCK_IMAGE_URL = "https://app.noname-beauty.jp/images/truck-delivery.png";
const PROGRESS_BAR_URL = "https://app.noname-beauty.jp/images/progress-bar.png";

/** 追跡番号をハイフン区切りにフォーマット（12桁 → XXXX-XXXX-XXXX） */
function formatTrackingNumber(num: string): string {
  const digits = num.replace(/\D/g, "");
  if (digits.length === 12) {
    return `${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8, 12)}`;
  }
  return num;
}

/** キャリア別の追跡URL */
function buildTrackingUrl(carrier: string, trackingNumber: string): string {
  const tn = encodeURIComponent(trackingNumber.replace(/\D/g, ""));
  if (carrier === "japanpost") {
    return `https://trackings.post.japanpost.jp/services/srv/search/direct?reqCodeNo1=${tn}`;
  }
  // ヤマト運輸
  return `https://member.kms.kuronekoyamato.co.jp/parcel/detail?pno=${tn}`;
}

/** キャリア表示ラベル */
function carrierLabel(carrier: string): string {
  if (carrier === "japanpost") return "日本郵便";
  return "ヤマト運輸 チルド便";
}

/** 発送完了 Flex メッセージ */
export function buildShippingFlex(
  trackingInfo: { number: string; carrier: string }[],
) {
  const primary = trackingInfo[0];
  const formatted = formatTrackingNumber(primary.number);
  const label = carrierLabel(primary.carrier);
  const trackingUrl = buildTrackingUrl(primary.carrier, primary.number);

  // 追跡番号セクション
  const trackingContents: any[] = [
    { type: "text", text: "追跡番号", size: "sm", color: GRAY, align: "center" },
    { type: "text", text: formatted, size: "xl", weight: "bold", margin: "sm", color: PINK_DARK, align: "center" },
  ];

  // 複数追跡番号がある場合
  for (let i = 1; i < trackingInfo.length; i++) {
    trackingContents.push({
      type: "text",
      text: formatTrackingNumber(trackingInfo[i].number),
      size: "lg",
      weight: "bold",
      margin: "sm",
      color: PINK_DARK,
      align: "center",
    });
  }

  // 配送ステータスビジュアル（ヤマト風：発送 🚚 お届け予定 + ゲージ）
  const progressSection = {
    type: "box",
    layout: "vertical",
    contents: [
      // 発送 🚚 お届け予定（一行）
      {
        type: "box",
        layout: "horizontal",
        contents: [
          { type: "text", text: "発送", size: "xs", color: GRAY, flex: 1, align: "start", gravity: "bottom" },
          {
            type: "image",
            url: TRUCK_IMAGE_URL,
            size: "full",
            aspectRatio: "3:2",
            aspectMode: "fit",
            flex: 1,
          },
          { type: "text", text: "お届け予定", size: "xs", color: GRAY, flex: 1, align: "end", gravity: "bottom", wrap: true },
        ],
        alignItems: "flex-end",
        paddingStart: "12px",
        paddingEnd: "12px",
      },
      // プログレスバー画像（横幅いっぱい）
      {
        type: "image",
        url: PROGRESS_BAR_URL,
        size: "full",
        aspectRatio: "20:2",
        aspectMode: "cover",
        margin: "xs",
      },
      // キャリア名（中央配置・括弧付き）
      { type: "text", text: `（${label}）`, size: "xs", color: GRAY, margin: "sm", align: "center" },
    ],
    backgroundColor: "#fdf2f8",
    cornerRadius: "8px",
    paddingTop: "12px",
    paddingBottom: "12px",
    paddingStart: "0px",
    paddingEnd: "0px",
  };

  const bodyContents: any[] = [
    progressSection,
    // 追跡番号
    {
      type: "box",
      layout: "vertical",
      contents: trackingContents,
      margin: "lg",
    },
    { type: "separator", margin: "md" },
    {
      type: "text",
      text: "発送が開始されると日時指定が可能となります。",
      size: "sm",
      color: GRAY,
      wrap: true,
      margin: "md",
    },
    {
      type: "text",
      text: "日時指定を希望される場合はボタンより変更をしてください。",
      size: "sm",
      color: GRAY,
      wrap: true,
      margin: "sm",
    },
    { type: "separator", margin: "md" },
    {
      type: "text",
      text: "お届け後、マンジャロは冷蔵保管をするようにお願いいたします。",
      size: "sm",
      color: GRAY,
      wrap: true,
      margin: "md",
    },
    {
      type: "text",
      text: "冷凍保存を行うと薬液が凍結したり効果が下がってしまいますのでご注意ください。",
      size: "sm",
      color: GRAY,
      wrap: true,
      margin: "sm",
    },
  ];

  return {
    type: "flex" as const,
    altText: `【発送完了】追跡番号: ${formatted} ${label}にて発送しました`,
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        contents: [
          { type: "text", text: "発送完了のお知らせ", weight: "bold", size: "lg", color: WHITE },
        ],
        backgroundColor: PINK,
        paddingAll: "16px",
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: bodyContents,
        paddingAll: "16px",
      },
      footer: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "button",
            style: "primary",
            color: PINK,
            action: {
              type: "uri",
              label: "配送状況を確認",
              uri: trackingUrl,
            },
          },
          {
            type: "text",
            text: "マイページからも確認が可能です",
            size: "xs",
            color: GRAY,
            align: "center",
            margin: "sm",
          },
        ],
        paddingAll: "16px",
      },
    },
  };
}

/** LINE送信 + message_log 記録 */
export async function sendShippingNotification(params: {
  patientId: string;
  lineUid: string;
  flex: { type: "flex"; altText: string; contents: any };
}): Promise<{ ok: boolean }> {
  const { patientId, lineUid, flex } = params;

  try {
    const res = await pushMessage(lineUid, [flex]);
    const status = res?.ok ? "sent" : "failed";

    await supabaseAdmin.from("message_log").insert({
      patient_id: patientId,
      line_uid: lineUid,
      direction: "outgoing",
      event_type: "message",
      message_type: "shipping_notify",
      content: `[${flex.altText}]`,
      status,
    });

    console.log(`[shipping-flex] shipping_notify: patient=${patientId}, status=${status}`);
    return { ok: status === "sent" };
  } catch (err) {
    console.error(`[shipping-flex] shipping_notify error:`, err);
    try {
      await supabaseAdmin.from("message_log").insert({
        patient_id: patientId,
        line_uid: lineUid,
        direction: "outgoing",
        event_type: "message",
        message_type: "shipping_notify",
        content: `[${flex.altText}]`,
        status: "failed",
        error_message: String(err),
      });
    } catch {
      // ログ記録失敗は握りつぶす
    }
    return { ok: false };
  }
}
