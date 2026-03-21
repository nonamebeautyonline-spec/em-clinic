// lib/purchase/types.ts — 購入画面設定の型定義

/** カラーテーマ一覧 */
export const COLOR_THEMES = ["emerald", "blue", "purple", "pink", "amber", "rose", "teal", "indigo", "orange"] as const;
export type ColorTheme = (typeof COLOR_THEMES)[number];

/** 商品グループ */
export interface PurchaseGroup {
  id: string;
  badgeLabel: string;      // "2.5mg"
  displayName: string;     // "マンジャロ 2.5mg"
  description: string;     // "週1回注射"
  colorTheme: string;      // "emerald" | "blue" | "purple" 等
  sortOrder: number;
  productCodes: string[];  // 商品マスタのcode
}

/** 購入画面設定全体 */
export interface PurchaseConfig {
  pageTitle: string;
  reorderTitle: string;
  description: string;
  reorderDescription: string;
  footerNote: string;
  checkoutButtonLabel: string;
  reorderButtonLabel: string;
  groups: PurchaseGroup[];
}

/** デフォルト設定（現在のハードコード値と一致） */
export const DEFAULT_PURCHASE_CONFIG: PurchaseConfig = {
  pageTitle: "マンジャロ購入（今回の診察分）",
  reorderTitle: "マンジャロ再処方の申請",
  description:
    "本ページは診察後に決定した「今回の処方分」の決済専用です。必ず診察時に医師と決定した用量のみをご選択ください。",
  reorderDescription:
    "再処方を希望される内容を選択してください。診察内容と前回の経過を踏まえて、Drが再処方可否を判断いたします。",
  footerNote:
    "※ 用量は必ず診察時に医師と確認の上でご選択ください。\n※ 再処方を希望される場合は、再処方モードで申請してください。",
  checkoutButtonLabel: "この内容で今回の決済に進む",
  reorderButtonLabel: "この内容で再処方を申請する",
  groups: [
    {
      id: "group-2.5mg",
      badgeLabel: "2.5mg",
      displayName: "マンジャロ 2.5mg",
      description: "週1回注射",
      colorTheme: "emerald",
      sortOrder: 1,
      productCodes: ["MJL_2.5mg_1m", "MJL_2.5mg_2m", "MJL_2.5mg_3m"],
    },
    {
      id: "group-5mg",
      badgeLabel: "5mg",
      displayName: "マンジャロ 5mg",
      description: "週1回注射",
      colorTheme: "blue",
      sortOrder: 2,
      productCodes: ["MJL_5mg_1m", "MJL_5mg_2m", "MJL_5mg_3m"],
    },
    {
      id: "group-7.5mg",
      badgeLabel: "7.5mg",
      displayName: "マンジャロ 7.5mg",
      description: "週1回注射",
      colorTheme: "purple",
      sortOrder: 3,
      productCodes: ["MJL_7.5mg_1m", "MJL_7.5mg_2m", "MJL_7.5mg_3m"],
    },
  ],
};
