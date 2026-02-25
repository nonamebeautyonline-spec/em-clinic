// QAカルーセルFlexテンプレートをmessage_templatesテーブルに登録するスクリプト
// 実行: node scripts/seed-qa-template.cjs
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const QA_PAGE_URL = "https://noname-beauty.l-ope.jp/mypage/qa";

const QA_CARDS = [
  {
    icon: "\u{1F3E5}",
    title: "ご利用の流れ",
    body: "\u2460個人情報入力 \u2192 \u2461SMS認証 \u2192 \u2462問診 \u2192 \u2463予約 \u2192 \u2464診察 \u2192 \u2465決済 \u2192 \u2466発送",
    color: "#ec4899",
  },
  {
    icon: "\u{1F4C5}",
    title: "予約・診察",
    body: "予約の変更・キャンセルはマイページから可能です。診察は予約時間に090〜の番号からお電話します。",
    color: "#3b82f6",
  },
  {
    icon: "\u{1F4B3}",
    title: "お支払い",
    body: "クレジットカードまたは銀行振込に対応。診察後、マイページの決済ボタンからお手続きください。",
    color: "#f59e0b",
  },
  {
    icon: "\u{1F4E6}",
    title: "配送・お届け",
    body: "ヤマト運輸のクール便（チルド）でお届け。土日祝も発送対応。発送後はLINEで追跡番号をお知らせします。",
    color: "#06b6d4",
  },
  {
    icon: "\u{1F510}",
    title: "お困りの方へ",
    body: "SMS認証コードが届かない・ログインできない等のトラブルはこちら。解決しない場合はLINEでご相談ください。",
    color: "#8b5cf6",
  },
];

function buildBubble(card) {
  return {
    type: "bubble",
    size: "micro",
    header: {
      type: "box",
      layout: "vertical",
      contents: [
        { type: "text", text: `${card.icon} ${card.title}`, weight: "bold", size: "sm", color: "#ffffff" },
      ],
      backgroundColor: card.color,
      paddingAll: "14px",
    },
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        { type: "text", text: card.body, size: "xs", color: "#555555", wrap: true },
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
          action: { type: "uri", label: "詳しく見る", uri: QA_PAGE_URL },
          style: "primary",
          color: card.color,
          height: "sm",
        },
      ],
      paddingAll: "10px",
    },
  };
}

function buildMoreBubble() {
  return {
    type: "bubble",
    size: "micro",
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        { type: "text", text: "\u{1F4AC}", size: "3xl", align: "center" },
        { type: "text", text: "もっと詳しく", weight: "bold", size: "sm", align: "center", margin: "lg", color: "#333333" },
        { type: "text", text: "全カテゴリのQ&Aを\nご覧いただけます", size: "xs", align: "center", color: "#888888", wrap: true, margin: "md" },
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
          action: { type: "uri", label: "Q&Aページへ", uri: QA_PAGE_URL },
          style: "primary",
          color: "#ec4899",
          height: "sm",
        },
      ],
      paddingAll: "10px",
    },
  };
}

const flexContent = {
  type: "carousel",
  contents: [...QA_CARDS.map(buildBubble), buildMoreBubble()],
};

// デフォルトテナントID（環境変数で上書き可能）
const TENANT_ID = process.env.TENANT_ID || "00000000-0000-0000-0000-000000000001";

async function main() {
  // 既に同名テンプレートが存在するか確認
  const { data: existing } = await supabase
    .from("message_templates")
    .select("id")
    .eq("name", "よくある質問（Q&Aカルーセル）")
    .eq("tenant_id", TENANT_ID)
    .maybeSingle();

  if (existing) {
    // 既存テンプレートを更新
    const { data, error } = await supabase
      .from("message_templates")
      .update({
        content: "",
        message_type: "flex",
        category: "Q&A",
        flex_content: flexContent,
      })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) {
      console.error("更新失敗:", error.message);
      process.exit(1);
    }
    console.log("既存テンプレートを更新しました:", data.id);
  } else {
    // 新規作成
    const { data, error } = await supabase
      .from("message_templates")
      .insert({
        name: "よくある質問（Q&Aカルーセル）",
        content: "",
        message_type: "flex",
        category: "Q&A",
        flex_content: flexContent,
        tenant_id: TENANT_ID,
      })
      .select()
      .single();

    if (error) {
      console.error("登録失敗:", error.message);
      process.exit(1);
    }
    console.log("テンプレート登録完了:", data.id, data.name);
  }
}

main();
