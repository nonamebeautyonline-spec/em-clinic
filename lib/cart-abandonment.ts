// lib/cart-abandonment.ts — カゴ落ちリマインドFlexメッセージ生成

import type { LineMessage } from "@/lib/line-push";

interface CartItem {
  name: string;
  price: number;
  quantity: number;
  image_url?: string | null;
}

interface AbandonedCart {
  cart_items: CartItem[];
  cart_total: number;
}

/**
 * カゴ落ちリマインドのFlex Messageを生成
 * Step 1: 商品リスト付きリマインド（1時間後）
 * Step 2: クーポン訴求付きリマインド（24時間後）
 * Step 3: 最終リマインド・在庫限り（72時間後）
 */
export function buildCartReminderMessage(
  cart: AbandonedCart,
  step: number,
  cartUrl?: string,
): LineMessage {
  const items = Array.isArray(cart.cart_items) ? cart.cart_items : [];
  const total = cart.cart_total || 0;

  // Step別のヘッダー・フッターテキスト
  let headerText = "カートに商品が残っています";
  let footerText = "お買い忘れはございませんか？";
  let headerColor = "#1a1a1a";

  if (step === 2) {
    headerText = "お買い忘れはありませんか？";
    footerText = "今なら限定クーポンをご利用いただけます";
  } else if (step === 3) {
    headerText = "【最終ご案内】";
    footerText = "在庫切れになる前にお早めに";
    headerColor = "#cc0000";
  }

  // 商品カード（最大3件表示）
  const displayItems = items.slice(0, 3);
  const itemBoxes = displayItems.map((item) => ({
    type: "box",
    layout: "horizontal",
    contents: [
      // 商品画像（あれば）
      ...(item.image_url
        ? [
            {
              type: "image",
              url: item.image_url,
              size: "60px",
              aspectRatio: "1:1",
              aspectMode: "cover",
              flex: 0,
            },
          ]
        : []),
      {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: item.name,
            size: "sm",
            weight: "bold",
            wrap: true,
            maxLines: 2,
          },
          {
            type: "text",
            text: `¥${new Intl.NumberFormat("ja-JP").format(item.price)} × ${item.quantity}`,
            size: "xs",
            color: "#666666",
          },
        ],
        flex: 1,
        paddingStart: "md",
      },
    ],
    paddingAll: "sm",
  }));

  // 3件を超える場合は「他N件」表示
  if (items.length > 3) {
    itemBoxes.push({
      type: "box",
      layout: "horizontal",
      contents: [
        {
          type: "text",
          text: `他${items.length - 3}件の商品`,
          size: "xs",
          color: "#888888",
        } as any,
      ],
      paddingAll: "sm",
    } as any);
  }

  const bubble = {
    type: "bubble",
    header: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: headerText,
          weight: "bold",
          size: "lg",
          color: headerColor,
        },
      ],
      paddingAll: "lg",
      backgroundColor: "#f8f8f8",
    },
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        ...itemBoxes,
        { type: "separator", margin: "md" },
        {
          type: "box",
          layout: "horizontal",
          contents: [
            { type: "text", text: "合計", size: "md", weight: "bold", flex: 1 },
            {
              type: "text",
              text: `¥${new Intl.NumberFormat("ja-JP").format(total)}`,
              size: "md",
              weight: "bold",
              align: "end",
              color: "#cc0000",
            },
          ],
          margin: "md",
        },
      ],
      paddingAll: "lg",
    },
    footer: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: footerText,
          size: "xs",
          color: "#888888",
          align: "center",
        },
        // cartUrlが指定されている場合のみ購入ボタンを表示
        ...(cartUrl
          ? [
              {
                type: "button",
                action: {
                  type: "uri",
                  label: "購入に進む",
                  uri: cartUrl,
                },
                style: "primary",
                color: "#10b981",
                height: "sm",
                margin: "md",
              },
            ]
          : []),
      ],
      paddingAll: "md",
    },
  };

  return {
    type: "flex",
    altText: headerText,
    contents: bubble,
  };
}
