// lib/industry-config.ts — 業種別設定の集約
//
// 業種ごとのデフォルト機能・用語・UI設定を一箇所で管理する。
// テナント作成時やUI表示時に参照する。

import type { Feature, Industry } from "@/lib/feature-flags";

// ---------------------------------------------------------------------------
// 1. 業種別デフォルト機能マッピング
// ---------------------------------------------------------------------------

/** 機能の有効化状態: on=デフォルト有効, off=無効(非表示), option=オプション(有償追加) */
export type FeatureDefault = "on" | "off" | "option";

/**
 * 業種ごとのデフォルト機能設定。
 * テナント作成時に tenant_settings (category="feature_flags") に投入する。
 * 未定義の機能は off 扱い。
 */
export const INDUSTRY_FEATURE_DEFAULTS: Record<Industry, Partial<Record<Feature, FeatureDefault>>> = {
  clinic: {
    // LINE CRMコア
    broadcast: "on",
    rich_menu: "on",
    step_scenario: "on",
    keyword_reply: "on",
    form_builder: "on",
    analytics: "on",
    // CLINIC専用
    reorder: "on",
    multi_doctor: "on",
    intake_form: "on",
    ehr_karte: "on",
    medical_shipping: "on",
    reservation: "on",
    point_system: "on",
    coupon_mgmt: "on",
    // AIオプション
    ai_reply: "option",
    voice_input: "option",
    ai_karte: "option",
    // 発送通知（既存の配送機能）
    shipping_notify: "on",
  },
  salon: {
    // LINE CRMコア
    broadcast: "on",
    rich_menu: "on",
    step_scenario: "on",
    keyword_reply: "on",
    form_builder: "on",
    analytics: "on",
    // SALON専用
    hotpepper_sync: "on",
    stylist_mgmt: "on",
    treatment_menu: "on",
    salon_karte: "on",
    stamp_card: "on",
    dormant_recovery: "on",
    // 共通
    reservation: "on",
    point_system: "on",
    coupon_mgmt: "on",
    // AIオプション（SALONではAI返信は不要がデフォルト）
    ai_reply: "off",
    voice_input: "off",
    ai_karte: "off",
  },
  ec: {
    // LINE CRMコア
    broadcast: "on",
    rich_menu: "on",
    step_scenario: "on",
    keyword_reply: "on",
    form_builder: "on",
    analytics: "on",
    // EC専用
    cart_abandonment: "on",
    ec_integration: "on",
    subscription: "on",
    shipping_notify: "on",
    rfm_analysis: "on",
    product_recommend: "option",
    // 共通
    point_system: "on",
    coupon_mgmt: "on",
    // AIオプション
    ai_reply: "option",
    voice_input: "off",
    ai_karte: "off",
  },
  other: {
    // LINE CRMコアのみ（汎用）
    broadcast: "on",
    rich_menu: "on",
    step_scenario: "on",
    keyword_reply: "on",
    form_builder: "on",
    analytics: "on",
    // 共通オプション
    reservation: "option",
    point_system: "option",
    coupon_mgmt: "option",
    // AIオプション
    ai_reply: "option",
    voice_input: "off",
    ai_karte: "off",
  },
};

// ---------------------------------------------------------------------------
// 2. 業種別 用語マッピング（UI表示用）
// ---------------------------------------------------------------------------

/** UI上の共通用語を業種に応じて置換するためのマップ */
export const TERM_MAP: Record<Industry, Record<string, string>> = {
  clinic: {
    customer: "患者",
    customers: "患者一覧",
    visit: "来院",
    record: "カルテ",
    staff: "医師",
    menu: "診療メニュー",
    appointment: "予約",
  },
  salon: {
    customer: "お客様",
    customers: "お客様一覧",
    visit: "来店",
    record: "施術カルテ",
    staff: "スタイリスト",
    menu: "施術メニュー",
    appointment: "予約",
  },
  ec: {
    customer: "顧客",
    customers: "顧客一覧",
    visit: "購入",
    record: "購買履歴",
    staff: "スタッフ",
    menu: "商品",
    appointment: "注文",
  },
  other: {
    customer: "友だち",
    customers: "友だち一覧",
    visit: "利用",
    record: "履歴",
    staff: "スタッフ",
    menu: "メニュー",
    appointment: "予約",
  },
};

/**
 * 業種に応じた用語を取得する。
 * 未定義のキーはそのまま返す。
 */
export function getTerm(industry: Industry, key: string): string {
  return TERM_MAP[industry]?.[key] ?? key;
}

// ---------------------------------------------------------------------------
// 3. 業種別セクションラベル（管理画面サイドバー用）
// ---------------------------------------------------------------------------

/** 管理画面サイドバーのセクション名を業種に応じて変更 */
export const SECTION_LABEL_MAP: Record<Industry, Record<string, string>> = {
  clinic: {
    "予約・診察": "予約・診察",
    "発送管理": "発送管理",
    "顧客管理": "顧客管理",
    "業務管理": "業務管理",
  },
  salon: {
    "予約・診察": "予約・施術",
    "発送管理": "発送管理",
    "顧客管理": "顧客管理",
    "業務管理": "業務管理",
  },
  ec: {
    "予約・診察": "注文管理",
    "発送管理": "配送管理",
    "顧客管理": "顧客管理",
    "業務管理": "業務管理",
  },
  other: {
    "予約・診察": "業務管理",
    "発送管理": "配送管理",
    "顧客管理": "友だち管理",
    "業務管理": "設定",
  },
};

/**
 * セクションラベルを業種に応じて変換する。
 * マッピングに存在しない場合は元のラベルをそのまま返す。
 */
export function getSectionLabel(industry: Industry, section: string): string {
  return SECTION_LABEL_MAP[industry]?.[section] ?? section;
}

// ---------------------------------------------------------------------------
// 4. テナント作成時のデフォルト feature_flags 投入データ生成
// ---------------------------------------------------------------------------

/**
 * テナント作成時に tenant_settings へ投入する feature_flags データを生成。
 * "on" の機能は "true"、"off" の機能は "false" として保存。
 * "option" の機能は保存しない（テナント個別でオーバーライド設定時に追加される）。
 */
export function generateFeatureFlagSettings(
  industry: Industry,
): { key: string; value: string }[] {
  const defaults = INDUSTRY_FEATURE_DEFAULTS[industry];
  const settings: { key: string; value: string }[] = [];

  for (const [feature, state] of Object.entries(defaults)) {
    if (state === "on") {
      settings.push({ key: feature, value: "true" });
    } else if (state === "off") {
      settings.push({ key: feature, value: "false" });
    }
    // "option" は保存しない（オプション課金で個別管理）
  }

  return settings;
}
