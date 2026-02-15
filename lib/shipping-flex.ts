// lib/shipping-flex.ts
// 発送完了通知のLINE Flexメッセージビルダー
// 配色・文言は管理画面から設定可能（tenant_settings経由）

import { pushMessage } from "@/lib/line-push";
import { supabaseAdmin } from "@/lib/supabase";
import { getFlexConfig } from "@/lib/flex-message/config";
import { DEFAULT_FLEX_CONFIG } from "@/lib/flex-message/types";
import { tenantPayload } from "@/lib/tenant";

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
export async function buildShippingFlex(
  trackingInfo: { number: string; carrier: string }[],
) {
  let cfg = DEFAULT_FLEX_CONFIG;
  try { cfg = await getFlexConfig(); } catch {}
  const { colors, shipping } = cfg;

  const primary = trackingInfo[0];
  const formatted = formatTrackingNumber(primary.number);
  const label = carrierLabel(primary.carrier);
  const trackingUrl = buildTrackingUrl(primary.carrier, primary.number);

  // 追跡番号セクション
  const trackingContents: any[] = [
    { type: "text", text: "追跡番号", size: "sm", color: colors.bodyText, align: "center" },
    { type: "text", text: formatted, size: "xl", weight: "bold", margin: "sm", color: colors.accentColor, align: "center" },
  ];

  // 複数追跡番号がある場合
  for (let i = 1; i < trackingInfo.length; i++) {
    trackingContents.push({
      type: "text",
      text: formatTrackingNumber(trackingInfo[i].number),
      size: "lg",
      weight: "bold",
      margin: "sm",
      color: colors.accentColor,
      align: "center",
    });
  }

  // 配送ステータスビジュアル
  const progressSection = {
    type: "box",
    layout: "vertical",
    contents: [
      {
        type: "box",
        layout: "horizontal",
        contents: [
          { type: "text", text: "発送", size: "xs", color: colors.bodyText, flex: 1, align: "start", gravity: "bottom" },
          {
            type: "image",
            url: shipping.truckImageUrl,
            size: "full",
            aspectRatio: "3:2",
            aspectMode: "fit",
            flex: 1,
          },
          { type: "text", text: "お届け予定", size: "xs", color: colors.bodyText, flex: 1, align: "end", gravity: "bottom", wrap: true },
        ],
        alignItems: "flex-end",
        paddingStart: "12px",
        paddingEnd: "12px",
      },
      {
        type: "image",
        url: shipping.progressBarUrl,
        size: "full",
        aspectRatio: "20:2",
        aspectMode: "cover",
        margin: "xs",
      },
      { type: "text", text: `（${label}）`, size: "xs", color: colors.bodyText, margin: "sm", align: "center" },
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
    { type: "box", layout: "vertical", contents: trackingContents, margin: "lg" },
    { type: "separator", margin: "md" },
    { type: "text", text: shipping.deliveryNotice1, size: "sm", color: colors.bodyText, wrap: true, margin: "md" },
    { type: "text", text: shipping.deliveryNotice2, size: "sm", color: colors.bodyText, wrap: true, margin: "sm" },
    { type: "separator", margin: "md" },
    { type: "text", text: shipping.storageNotice1, size: "sm", color: colors.bodyText, wrap: true, margin: "md" },
    { type: "text", text: shipping.storageNotice2, size: "sm", color: colors.bodyText, wrap: true, margin: "sm" },
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
          { type: "text", text: shipping.header, weight: "bold", size: "lg", color: colors.headerText },
        ],
        backgroundColor: colors.headerBg,
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
            color: colors.buttonColor,
            action: {
              type: "uri",
              label: shipping.buttonLabel,
              uri: trackingUrl,
            },
          },
          {
            type: "text",
            text: shipping.footerNote,
            size: "xs",
            color: colors.bodyText,
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
  tenantId?: string;
}): Promise<{ ok: boolean }> {
  const { patientId, lineUid, flex, tenantId } = params;
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
      message_type: "shipping_notify",
      content: `[${flex.altText}]`,
      flex_json: flex.contents,
      status,
    });

    console.log(`[shipping-flex] shipping_notify: patient=${patientId}, status=${status}`);
    return { ok: status === "sent" };
  } catch (err) {
    console.error(`[shipping-flex] shipping_notify error:`, err);
    try {
      await supabaseAdmin.from("message_log").insert({
        ...tenantPayload(tid),
        patient_id: patientId,
        line_uid: lineUid,
        direction: "outgoing",
        event_type: "message",
        message_type: "shipping_notify",
        content: `[${flex.altText}]`,
        flex_json: flex.contents,
        status: "failed",
        error_message: String(err),
      });
    } catch {
      // ログ記録失敗は握りつぶす
    }
    return { ok: false };
  }
}
