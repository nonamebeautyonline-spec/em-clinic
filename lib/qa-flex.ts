// lib/qa-flex.ts
// QAカルーセルFlexメッセージ — テンプレート登録用JSON生成ヘルパー

const QA_PAGE_URL = "https://noname-beauty.l-ope.jp/mypage/qa";

// カテゴリごとのカード定義（categoryIdはQAページ側のid）
const QA_CARDS = [
  {
    categoryId: "getting-started",
    title: "ご利用の流れ",
    subtitle: "初めての方はこちら",
    items: [
      "① 個人情報入力・SMS認証",
      "② 問診に回答",
      "③ 診察予約を選択",
      "④ 電話診察を受ける",
      "⑤ 決済・発送",
    ],
    color: "#ec4899",
    lightColor: "#fce7f3",
  },
  {
    categoryId: "reservation",
    title: "予約・診察",
    subtitle: "予約方法と当日の流れ",
    items: [
      "問診提出後にマイページから予約",
      "変更・キャンセルもマイページで",
      "090〜の番号からお電話します",
      "出られない場合は再度おかけします",
    ],
    color: "#3b82f6",
    lightColor: "#dbeafe",
  },
  {
    categoryId: "payment",
    title: "お支払い",
    subtitle: "決済方法とお手続き",
    items: [
      "クレジットカード／銀行振込対応",
      "診察後にマイページから決済",
      "カード決済は即時確認",
      "振込は次回発送前に確認",
    ],
    color: "#f59e0b",
    lightColor: "#fef3c7",
  },
  {
    categoryId: "shipping",
    title: "配送・お届け",
    subtitle: "発送と届け先について",
    items: [
      "ヤマト運輸クール便（チルド）",
      "土日祝も発送対応",
      "12時まで決済で最短当日発送",
      "届け先変更はマイページから",
    ],
    color: "#06b6d4",
    lightColor: "#cffafe",
  },
  {
    categoryId: "sms-account",
    title: "お困りの方へ",
    subtitle: "認証・ログイントラブル",
    items: [
      "SMS認証コードが届かない",
      "ログインできない",
      "電話番号・個人情報の変更",
      "→ LINEでご相談ください",
    ],
    color: "#8b5cf6",
    lightColor: "#ede9fe",
  },
];

/** バブル1枚を生成（kiloサイズ・エレガントデザイン） */
function buildQaBubble(card: (typeof QA_CARDS)[number]) {
  return {
    type: "bubble",
    size: "kilo",
    header: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: card.title,
          weight: "bold",
          size: "lg",
          color: "#ffffff",
        },
        {
          type: "text",
          text: card.subtitle,
          size: "xs",
          color: "#ffffffcc",
          margin: "xs",
        },
      ],
      backgroundColor: card.color,
      paddingAll: "18px",
    },
    body: {
      type: "box",
      layout: "vertical",
      contents: card.items.map((item) => ({
        type: "box",
        layout: "horizontal",
        contents: [
          {
            type: "text",
            text: "•",
            size: "sm",
            color: card.color,
            flex: 0,
          },
          {
            type: "text",
            text: item,
            size: "sm",
            color: "#333333",
            wrap: true,
            flex: 1,
            margin: "sm",
          },
        ],
        margin: "md",
      })),
      paddingAll: "16px",
      spacing: "none",
    },
    footer: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "button",
          action: {
            type: "uri",
            label: "詳しく見る",
            uri: `${QA_PAGE_URL}?c=${card.categoryId}`,
          },
          style: "primary",
          color: card.color,
          height: "sm",
        },
      ],
      paddingAll: "12px",
    },
  };
}

/** 「すべて見る」バブルを生成 */
function buildMoreBubble() {
  return {
    type: "bubble",
    size: "kilo",
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: "💬",
          size: "4xl",
          align: "center",
        },
        {
          type: "text",
          text: "すべてのQ&A",
          weight: "bold",
          size: "md",
          align: "center",
          margin: "xl",
          color: "#333333",
        },
        {
          type: "text",
          text: "7カテゴリ・全25問の\nQ&Aをご覧いただけます",
          size: "sm",
          align: "center",
          color: "#888888",
          wrap: true,
          margin: "md",
        },
        {
          type: "separator",
          margin: "xl",
          color: "#f1f5f9",
        },
        {
          type: "text",
          text: "ご利用の流れ / 予約・診察\nお支払い / 配送 / 再処方 …",
          size: "xs",
          align: "center",
          color: "#94a3b8",
          wrap: true,
          margin: "lg",
        },
      ],
      justifyContent: "center",
      paddingAll: "20px",
    },
    footer: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "button",
          action: {
            type: "uri",
            label: "Q&Aページを開く",
            uri: QA_PAGE_URL,
          },
          style: "primary",
          color: "#ec4899",
          height: "sm",
        },
      ],
      paddingAll: "12px",
    },
  };
}

/**
 * QAカルーセルFlexメッセージのJSONを生成
 */
export function buildQaCarouselFlex(): Record<string, unknown> {
  return {
    type: "carousel",
    contents: [
      ...QA_CARDS.map(buildQaBubble),
      buildMoreBubble(),
    ],
  };
}

/** altText（Flex非対応環境向けテキスト） */
export const QA_CAROUSEL_ALT_TEXT =
  "【よくある質問】ご利用の流れ・予約・決済・配送などのQ&Aはこちら → " + QA_PAGE_URL;
