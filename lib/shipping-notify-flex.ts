// lib/shipping-notify-flex.ts — 発送通知Flex Message生成

import type { LineMessage } from "@/lib/line-push";

/** 発送通知データ */
export interface ShippingNotifyData {
  orderNumber?: string;
  items: Array<{ name: string; quantity: number }>;
  trackingNumber?: string;
  trackingUrl?: string;
  carrier?: string; // ヤマト/佐川/日本郵便
  estimatedDelivery?: string; // YYYY-MM-DD
}

/**
 * 発送通知のFlex Messageを生成
 * header: emerald背景で「📦 発送のお知らせ」
 * body: 注文番号・商品リスト・配送業者・お届け予定日
 * footer: 配送状況確認ボタン・追跡番号
 */
export function buildShippingNotifyMessage(
  data: ShippingNotifyData,
): LineMessage {
  // --- body contents ---
  const bodyContents: Record<string, unknown>[] = [];

  // 注文番号（あれば）
  if (data.orderNumber) {
    bodyContents.push({
      type: "box",
      layout: "horizontal",
      contents: [
        {
          type: "text",
          text: "注文番号",
          size: "sm",
          color: "#888888",
          flex: 0,
        },
        {
          type: "text",
          text: data.orderNumber,
          size: "sm",
          weight: "bold",
          align: "end",
        },
      ],
    });
    bodyContents.push({ type: "separator", margin: "md" });
  }

  // 商品リスト
  for (const item of data.items) {
    bodyContents.push({
      type: "text",
      text: `・${item.name} ×${item.quantity}`,
      size: "sm",
      wrap: true,
      margin: "sm",
    });
  }

  // 配送情報セクション（配送業者 or お届け予定日がある場合）
  if (data.carrier || data.estimatedDelivery) {
    bodyContents.push({ type: "separator", margin: "md" });

    if (data.carrier) {
      bodyContents.push({
        type: "box",
        layout: "horizontal",
        contents: [
          {
            type: "text",
            text: "配送業者",
            size: "sm",
            color: "#888888",
            flex: 0,
          },
          {
            type: "text",
            text: data.carrier,
            size: "sm",
            align: "end",
          },
        ],
        margin: "md",
      });
    }

    if (data.estimatedDelivery) {
      // YYYY-MM-DD → YYYY年MM月DD日 に変換
      const parts = data.estimatedDelivery.split("-");
      const displayDate =
        parts.length === 3
          ? `${parts[0]}年${parseInt(parts[1])}月${parseInt(parts[2])}日`
          : data.estimatedDelivery;

      bodyContents.push({
        type: "box",
        layout: "horizontal",
        contents: [
          {
            type: "text",
            text: "お届け予定日",
            size: "sm",
            color: "#888888",
            flex: 0,
          },
          {
            type: "text",
            text: displayDate,
            size: "sm",
            align: "end",
          },
        ],
        margin: "sm",
      });
    }
  }

  // --- footer contents ---
  const footerContents: Record<string, unknown>[] = [];

  // 配送状況確認ボタン（trackingUrlがある場合のみ）
  if (data.trackingUrl) {
    footerContents.push({
      type: "button",
      action: {
        type: "uri",
        label: "配送状況を確認",
        uri: data.trackingUrl,
      },
      style: "primary",
      color: "#10b981",
      height: "sm",
    });
  }

  // 追跡番号テキスト（あれば）
  if (data.trackingNumber) {
    footerContents.push({
      type: "text",
      text: `追跡番号: ${data.trackingNumber}`,
      size: "xs",
      color: "#888888",
      align: "center",
      margin: "sm",
    });
  }

  // Flex Bubble組み立て
  const bubble: Record<string, unknown> = {
    type: "bubble",
    header: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: "📦 発送のお知らせ",
          weight: "bold",
          size: "lg",
          color: "#ffffff",
        },
      ],
      paddingAll: "lg",
      backgroundColor: "#059669",
    },
    body: {
      type: "box",
      layout: "vertical",
      contents: bodyContents,
      paddingAll: "lg",
    },
  };

  // footerはコンテンツがある場合のみ追加
  if (footerContents.length > 0) {
    bubble.footer = {
      type: "box",
      layout: "vertical",
      contents: footerContents,
      paddingAll: "md",
    };
  }

  return {
    type: "flex",
    altText: "発送のお知らせ",
    contents: bubble,
  };
}
