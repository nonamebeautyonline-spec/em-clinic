// lib/qa-flex.ts
// QAカルーセルFlexメッセージ — テンプレート登録用JSON生成ヘルパー

const QA_PAGE_URL = `${process.env.APP_BASE_URL || ""}/mypage/qa`;

// ── 共通カード定義 ──

const PAYMENT_CARD = {
  categoryId: "payment",
  title: "お支払い",
  subtitle: "決済方法とお手続きの流れ",
  items: [
    "クレジットカードと銀行振込の2種類に対応",
    "診察後、マイページに決済ボタンが表示されます",
    "カード決済は即時確認・銀行振込は発送直前に確認",
    "銀行振込の場合、お振込後に表示される配送先入力フォームの記入まで必要です（未入力だと配送が遅れます）",
    "お振込のみでフォーム未入力の場合は、再度決済フォームから配送先をご入力ください",
    "届け先住所もマイページから入力・変更できます",
  ],
  color: "#f59e0b",
};

const SHIPPING_CARD = {
  categoryId: "shipping",
  title: "配送・お届け",
  subtitle: "発送スケジュールと届け先",
  items: [
    "ヤマト運輸のクール便（チルド）で温度管理してお届け",
    "土日祝も発送対応しております",
    "12時までの決済確認で当日発送、以降は翌日発送",
    "発送後はLINEで追跡番号をお知らせします",
    "届け先の変更はマイページまたはヤマト運輸サイトから",
  ],
  color: "#06b6d4",
};

const TROUBLE_CARD = {
  categoryId: "sms-account",
  title: "お困りの方へ",
  subtitle: "よくあるトラブルと解決方法",
  items: [
    "SMS認証コードが届かない → 受信拒否設定をご確認ください",
    "ログインできない → LINEアプリの更新・キャッシュ削除をお試しください",
    "電話番号やLINEアカウントの変更 → LINEメッセージでご相談ください",
    "解決しない場合はLINEトーク画面からお気軽にご相談ください",
  ],
  color: "#8b5cf6",
};

// ── 通常版（初回〜処方前）カード定義 ──

const QA_CARDS = [
  {
    categoryId: "getting-started",
    title: "ご利用の流れ",
    subtitle: "初めての方はこちら",
    items: [
      "LINEメニューから「マイページ」をタップ",
      "マイページで個人情報を入力",
      "SMS認証で本人確認を完了",
      "マイページから問診に回答",
      "診察日時を予約 → 電話診察",
      "マイページから決済 → ご自宅へ発送",
    ],
    color: "#ec4899",
  },
  {
    categoryId: "reservation",
    title: "予約・診察",
    subtitle: "予約の取り方と当日の流れ",
    items: [
      "問診を提出するとマイページに予約ボタンが表示されます",
      "ご希望の日時を選んで予約確定",
      "予約の変更・キャンセルもマイページから可能",
      "予約時間に090〜の番号からお電話します",
      "電話に出られなかった場合は時間内に再度おかけします",
    ],
    color: "#3b82f6",
  },
  PAYMENT_CARD,
  SHIPPING_CARD,
  TROUBLE_CARD,
];

// ── 処方後版カード定義 ──

const QA_CARDS_POST = [
  {
    categoryId: "getting-started",
    title: "ご利用の流れ",
    subtitle: "処方後のお手続き",
    items: [
      "再処方を希望される場合はマイページより再処方申請",
      "医師の承認後、LINEで通知が届きます",
      "マイページから決済のお手続き",
      "決済確認後、ご自宅へ発送",
    ],
    color: "#ec4899",
  },
  {
    categoryId: "reorder",
    title: "再処方について",
    subtitle: "再処方の申請方法",
    items: [
      "マイページの「再処方申請」から申請できます",
      "ご希望の用量・月数を選択して申請",
      "医師の承認後、LINEで通知が届きます",
      "承認後、マイページから決済のお手続きをお願いします",
    ],
    color: "#6366f1",
  },
  PAYMENT_CARD,
  SHIPPING_CARD,
  TROUBLE_CARD,
];

/** バブル1枚を生成（megaサイズ） */
function buildQaBubble(card: (typeof QA_CARDS)[number]) {
  return {
    type: "bubble",
    size: "mega",
    header: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: card.title,
          weight: "bold",
          size: "xl",
          color: "#ffffff",
        },
        {
          type: "text",
          text: card.subtitle,
          size: "sm",
          color: "#ffffffcc",
          margin: "sm",
        },
      ],
      backgroundColor: card.color,
      paddingAll: "20px",
    },
    body: {
      type: "box",
      layout: "vertical",
      contents: card.items.map((item, i) => ({
        type: "box",
        layout: "horizontal",
        contents: [
          {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: "●",
                size: "xxs",
                color: card.color,
              },
            ],
            width: "16px",
            paddingTop: "4px",
          },
          {
            type: "text",
            text: item,
            size: "sm",
            color: "#444444",
            wrap: true,
            flex: 1,
          },
        ],
        ...(i > 0 ? { margin: "12px" } : {}),
      })),
      paddingAll: "20px",
      spacing: "none",
    },
    footer: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "separator",
          color: "#f0f0f0",
        },
        {
          type: "button",
          action: {
            type: "uri",
            label: "詳しく見る →",
            uri: `${QA_PAGE_URL}?c=${card.categoryId}`,
          },
          style: "link",
          color: card.color,
          height: "sm",
          margin: "sm",
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
    size: "mega",
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
              text: "💬",
              size: "4xl",
              align: "center",
            },
          ],
          paddingTop: "20px",
        },
        {
          type: "text",
          text: "すべてのQ&Aを見る",
          weight: "bold",
          size: "lg",
          align: "center",
          margin: "xl",
          color: "#333333",
        },
        {
          type: "text",
          text: "7カテゴリ・全25問の\nよくある質問をまとめています",
          size: "sm",
          align: "center",
          color: "#888888",
          wrap: true,
          margin: "lg",
        },
        {
          type: "separator",
          margin: "xl",
          color: "#f1f5f9",
        },
        {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "text",
              text: "ご利用の流れ｜予約・診察",
              size: "xs",
              align: "center",
              color: "#94a3b8",
            },
            {
              type: "text",
              text: "お支払い｜配送｜再処方",
              size: "xs",
              align: "center",
              color: "#94a3b8",
              margin: "xs",
            },
            {
              type: "text",
              text: "SMS認証・アカウント｜問診",
              size: "xs",
              align: "center",
              color: "#94a3b8",
              margin: "xs",
            },
          ],
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
        {
          type: "text",
          text: "Q&Aで解決しない場合や、薬に関する\n医学的な相談はトーク画面からお気軽にご相談ください",
          size: "xs",
          color: "#888888",
          align: "center",
          wrap: true,
          margin: "lg",
        },
      ],
      paddingAll: "16px",
    },
  };
}

/**
 * QAカルーセルFlexメッセージのJSONを生成（通常版）
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

/**
 * QAカルーセルFlexメッセージのJSONを生成（処方後版）
 */
export function buildPostPrescriptionQaCarouselFlex(): Record<string, unknown> {
  return {
    type: "carousel",
    contents: [
      ...QA_CARDS_POST.map(buildQaBubble),
      buildMoreBubble(),
    ],
  };
}

/** altText（Flex非対応環境向けテキスト） */
export const QA_CAROUSEL_ALT_TEXT =
  "【よくある質問】ご利用の流れ・予約・決済・配送などのQ&Aはこちら → " + QA_PAGE_URL;

export const QA_CAROUSEL_POST_ALT_TEXT =
  "【よくある質問】再処方・決済・配送などのQ&Aはこちら → " + QA_PAGE_URL;
