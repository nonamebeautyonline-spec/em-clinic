// lib/feature-flags-shared.ts — クライアント・サーバー共用の型定義と定数
//
// feature-flags.ts はサーバー専用（supabaseAdmin依存）。
// クライアントコンポーネントからはこのファイルをインポートすること。

/** 機能名の型定義 */
export type Feature =
  // --- LINE CRMコア ---
  | "broadcast" // 一斉配信
  | "rich_menu" // リッチメニュー管理
  | "step_scenario" // ステップ配信
  | "keyword_reply" // キーワード自動応答
  | "ai_reply" // AI返信（オプション課金）
  | "form_builder" // フォームビルダー
  | "analytics" // アナリティクス
  | "voice_input" // 音声入力（オプション課金）
  | "ai_karte" // AIカルテ（オプション課金）
  // --- CLINIC専用 ---
  | "reorder" // 再処方
  | "multi_doctor" // 複数Dr管理
  | "intake_form" // 問診フォーム
  | "ehr_karte" // 電子カルテ
  | "medical_shipping" // 医療品配送
  // --- SALON専用 ---
  | "hotpepper_sync" // HotPepper連携
  | "stylist_mgmt" // スタイリスト管理
  | "treatment_menu" // 施術メニュー
  | "salon_karte" // 施術カルテ
  | "stamp_card" // デジタルスタンプカード
  | "dormant_recovery" // 休眠顧客掘り起こし
  // --- EC専用 ---
  | "cart_abandonment" // カゴ落ち対策
  | "ec_integration" // 外部EC連携(Shopify/BASE)
  | "subscription" // サブスク管理
  | "product_recommend" // 商品レコメンド
  | "shipping_notify" // 発送通知自動化
  | "rfm_analysis" // RFM購買分析
  // --- 共通オプション ---
  | "point_system" // ポイント制度
  | "coupon_mgmt" // クーポン管理
  | "reservation"; // 予約管理

/** 業種タイプ */
export type Industry = "clinic" | "salon" | "ec" | "other";

/** 業種名→表示名マッピング */
export const INDUSTRY_LABELS: Record<Industry, string> = {
  clinic: "クリニック",
  salon: "サロン",
  ec: "EC",
  other: "汎用",
};

/** プロダクトブランド名 */
export const PRODUCT_NAMES: Record<Industry, string> = {
  clinic: "Lオペ for CLINIC",
  salon: "Lオペ for SALON",
  ec: "Lオペ for EC",
  other: "Lオペ",
};

/** 業種別アイコン */
export const INDUSTRY_ICONS: Record<Industry, string> = {
  clinic: "🏥",
  salon: "💇",
  ec: "🛒",
  other: "🏢",
};

/** 業種別カラー（バッジ用） */
export const INDUSTRY_COLORS: Record<Industry, string> = {
  clinic: "bg-blue-100 text-blue-700",
  salon: "bg-purple-100 text-purple-700",
  ec: "bg-emerald-100 text-emerald-700",
  other: "bg-slate-100 text-slate-600",
};

/** 機能名→表示名マッピング */
export const FEATURE_LABELS: Record<Feature, string> = {
  // LINE CRMコア
  broadcast: "一斉配信",
  rich_menu: "リッチメニュー管理",
  step_scenario: "ステップ配信",
  keyword_reply: "キーワード自動応答",
  ai_reply: "AI返信",
  form_builder: "フォームビルダー",
  analytics: "アナリティクス",
  voice_input: "音声入力",
  ai_karte: "AIカルテ",
  // CLINIC
  reorder: "再処方",
  multi_doctor: "複数Dr管理",
  intake_form: "問診フォーム",
  ehr_karte: "電子カルテ",
  medical_shipping: "医療品配送",
  // SALON
  hotpepper_sync: "HotPepper連携",
  stylist_mgmt: "スタイリスト管理",
  treatment_menu: "施術メニュー",
  salon_karte: "施術カルテ",
  stamp_card: "スタンプカード",
  dormant_recovery: "休眠顧客掘り起こし",
  // EC
  cart_abandonment: "カゴ落ち対策",
  ec_integration: "EC連携(Shopify/BASE)",
  subscription: "サブスク管理",
  product_recommend: "商品レコメンド",
  shipping_notify: "発送通知自動化",
  rfm_analysis: "RFM購買分析",
  // 共通
  point_system: "ポイント制度",
  coupon_mgmt: "クーポン管理",
  reservation: "予約管理",
};
