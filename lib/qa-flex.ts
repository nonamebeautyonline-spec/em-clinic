// lib/qa-flex.ts
// QAカルーセルFlexメッセージ — テンプレート登録用JSON生成ヘルパー
// 管理画面のテンプレート管理で「Flex」タブにJSONを貼り付けて登録する

const QA_PAGE_URL = "https://noname-beauty.l-ope.jp/mypage/qa";

// カテゴリごとのカード定義
const QA_CARDS = [
  {
    icon: "🏥",
    title: "ご利用の流れ",
    body: "①個人情報入力 → ②SMS認証 → ③問診 → ④予約 → ⑤診察 → ⑥決済 → ⑦発送",
    color: "#ec4899",
  },
  {
    icon: "📅",
    title: "予約・診察",
    body: "予約の変更・キャンセルはマイページから可能です。診察は予約時間に090〜の番号からお電話します。",
    color: "#3b82f6",
  },
  {
    icon: "💳",
    title: "お支払い",
    body: "クレジットカードまたは銀行振込に対応。診察後、マイページの決済ボタンからお手続きください。",
    color: "#f59e0b",
  },
  {
    icon: "📦",
    title: "配送・お届け",
    body: "ヤマト運輸のクール便（チルド）でお届け。発送後はLINEで追跡番号をお知らせします。届け先変更はマイページから。",
    color: "#06b6d4",
  },
  {
    icon: "🔐",
    title: "お困りの方へ",
    body: "SMS認証コードが届かない・ログインできない等のトラブルはこちら。解決しない場合はLINEでご相談ください。",
    color: "#8b5cf6",
  },
];

/** バブル1枚を生成 */
function buildQaBubble(card: (typeof QA_CARDS)[number]) {
  return {
    type: "bubble",
    size: "micro",
    header: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: `${card.icon} ${card.title}`,
          weight: "bold",
          size: "sm",
          color: "#ffffff",
        },
      ],
      backgroundColor: card.color,
      paddingAll: "14px",
    },
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: card.body,
          size: "xs",
          color: "#555555",
          wrap: true,
        },
      ],
      paddingAll: "12px",
      spacing: "sm",
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
            uri: QA_PAGE_URL,
          },
          style: "primary",
          color: card.color,
          height: "sm",
        },
      ],
      paddingAll: "10px",
    },
  };
}

/** 「もっと見る」バブルを生成 */
function buildMoreBubble() {
  return {
    type: "bubble",
    size: "micro",
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: "💬",
          size: "3xl",
          align: "center",
        },
        {
          type: "text",
          text: "もっと詳しく",
          weight: "bold",
          size: "sm",
          align: "center",
          margin: "lg",
          color: "#333333",
        },
        {
          type: "text",
          text: "全カテゴリのQ&Aを\nご覧いただけます",
          size: "xs",
          align: "center",
          color: "#888888",
          wrap: true,
          margin: "md",
        },
      ],
      justifyContent: "center",
      paddingAll: "16px",
    },
    footer: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "button",
          action: {
            type: "uri",
            label: "Q&Aページへ",
            uri: QA_PAGE_URL,
          },
          style: "primary",
          color: "#ec4899",
          height: "sm",
        },
      ],
      paddingAll: "10px",
    },
  };
}

/**
 * QAカルーセルFlexメッセージのJSONを生成
 * テンプレート管理画面の「Flex」タブに貼り付けて登録してください
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
