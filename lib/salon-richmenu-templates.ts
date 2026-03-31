// lib/salon-richmenu-templates.ts — サロン向けリッチメニューテンプレートプリセット
//
// DBに保存せず、コード内に定義（変更頻度が低いため）。
// LINE Messaging APIリッチメニューサイズ仕様:
//   width = 2500固定、height = 1686（大）or 843（小）

export interface RichMenuTemplateArea {
  label: string;
  action: {
    type: "uri" | "message" | "postback";
    uri?: string;
    text?: string;
    data?: string;
  };
  bounds: { x: number; y: number; width: number; height: number };
}

export interface RichMenuTemplate {
  id: string;
  name: string;
  description: string;
  /** プレビュー用の説明テキスト */
  preview: string;
  areas: RichMenuTemplateArea[];
  size: { width: number; height: number };
  /** テンプレート対象の業種（複数可） */
  industries: ("salon" | "clinic" | "ec" | "other")[];
}

// ---------------------------------------------------------------------------
// サロン向けテンプレート
// ---------------------------------------------------------------------------

export const SALON_TEMPLATES: RichMenuTemplate[] = [
  {
    id: "salon-basic",
    name: "サロン基本メニュー",
    description: "予約・メニュー・お知らせ・クーポンの4分割",
    preview: "上段: 予約する / メニュー・料金、下段: お知らせ / クーポン",
    industries: ["salon"],
    areas: [
      {
        label: "予約する",
        action: { type: "uri", uri: "https://example.com/reserve" },
        bounds: { x: 0, y: 0, width: 1250, height: 843 },
      },
      {
        label: "メニュー・料金",
        action: { type: "message", text: "メニュー" },
        bounds: { x: 1250, y: 0, width: 1250, height: 843 },
      },
      {
        label: "お知らせ",
        action: { type: "message", text: "お知らせ" },
        bounds: { x: 0, y: 843, width: 1250, height: 843 },
      },
      {
        label: "クーポン",
        action: { type: "message", text: "クーポン" },
        bounds: { x: 1250, y: 843, width: 1250, height: 843 },
      },
    ],
    size: { width: 2500, height: 1686 },
  },
  {
    id: "salon-full",
    name: "サロンフルメニュー",
    description: "予約・メニュー・スタッフ・クーポン・ポイント・お問い合わせの6分割",
    preview:
      "上段: 予約する / メニュー・料金 / スタッフ紹介、下段: クーポン / ポイント確認 / お問い合わせ",
    industries: ["salon"],
    areas: [
      {
        label: "予約する",
        action: { type: "uri", uri: "https://example.com/reserve" },
        bounds: { x: 0, y: 0, width: 833, height: 843 },
      },
      {
        label: "メニュー・料金",
        action: { type: "message", text: "メニュー" },
        bounds: { x: 833, y: 0, width: 834, height: 843 },
      },
      {
        label: "スタッフ紹介",
        action: { type: "message", text: "スタッフ" },
        bounds: { x: 1667, y: 0, width: 833, height: 843 },
      },
      {
        label: "クーポン",
        action: { type: "message", text: "クーポン" },
        bounds: { x: 0, y: 843, width: 833, height: 843 },
      },
      {
        label: "ポイント確認",
        action: { type: "message", text: "ポイント" },
        bounds: { x: 833, y: 843, width: 834, height: 843 },
      },
      {
        label: "お問い合わせ",
        action: { type: "uri", uri: "https://example.com/contact" },
        bounds: { x: 1667, y: 843, width: 833, height: 843 },
      },
    ],
    size: { width: 2500, height: 1686 },
  },
  {
    id: "salon-simple",
    name: "サロンシンプル",
    description: "予約・お問い合わせの2分割（横長）",
    preview: "左: 予約する / 右: お問い合わせ（コンパクト表示）",
    industries: ["salon"],
    areas: [
      {
        label: "予約する",
        action: { type: "uri", uri: "https://example.com/reserve" },
        bounds: { x: 0, y: 0, width: 1250, height: 843 },
      },
      {
        label: "お問い合わせ",
        action: { type: "message", text: "お問い合わせ" },
        bounds: { x: 1250, y: 0, width: 1250, height: 843 },
      },
    ],
    size: { width: 2500, height: 843 },
  },
  {
    id: "salon-premium",
    name: "サロンプレミアム",
    description:
      "予約・メニュー・スタッフ・クーポン・スタンプカード・口コミ・アクセス・お問い合わせの8分割",
    preview:
      "上段: 予約する / メニュー / スタッフ / クーポン、下段: スタンプカード / 口コミ / アクセス / お問い合わせ",
    industries: ["salon"],
    areas: [
      // 上段4エリア（各625px幅）
      {
        label: "予約する",
        action: { type: "uri", uri: "https://example.com/reserve" },
        bounds: { x: 0, y: 0, width: 625, height: 843 },
      },
      {
        label: "メニュー・料金",
        action: { type: "message", text: "メニュー" },
        bounds: { x: 625, y: 0, width: 625, height: 843 },
      },
      {
        label: "スタッフ紹介",
        action: { type: "message", text: "スタッフ" },
        bounds: { x: 1250, y: 0, width: 625, height: 843 },
      },
      {
        label: "クーポン",
        action: { type: "message", text: "クーポン" },
        bounds: { x: 1875, y: 0, width: 625, height: 843 },
      },
      // 下段4エリア（各625px幅）
      {
        label: "スタンプカード",
        action: { type: "message", text: "スタンプカード" },
        bounds: { x: 0, y: 843, width: 625, height: 843 },
      },
      {
        label: "口コミ",
        action: { type: "uri", uri: "https://example.com/reviews" },
        bounds: { x: 625, y: 843, width: 625, height: 843 },
      },
      {
        label: "アクセス",
        action: { type: "uri", uri: "https://example.com/access" },
        bounds: { x: 1250, y: 843, width: 625, height: 843 },
      },
      {
        label: "お問い合わせ",
        action: { type: "message", text: "お問い合わせ" },
        bounds: { x: 1875, y: 843, width: 625, height: 843 },
      },
    ],
    size: { width: 2500, height: 1686 },
  },
];

// ---------------------------------------------------------------------------
// 全テンプレート（将来 clinic / ec 用を追加する場合はここにマージ）
// ---------------------------------------------------------------------------

export const ALL_TEMPLATES: RichMenuTemplate[] = [...SALON_TEMPLATES];

// ---------------------------------------------------------------------------
// 業種別フィルタ
// ---------------------------------------------------------------------------

/**
 * 業種に該当するテンプレートを返す。
 * "other" の場合は全テンプレートを返す。
 */
export function getTemplatesForIndustry(
  industry: "clinic" | "salon" | "ec" | "other",
): RichMenuTemplate[] {
  if (industry === "other") return ALL_TEMPLATES;
  return ALL_TEMPLATES.filter((t) => t.industries.includes(industry));
}

/**
 * IDでテンプレートを取得する。
 */
export function getTemplateById(id: string): RichMenuTemplate | undefined {
  return ALL_TEMPLATES.find((t) => t.id === id);
}
