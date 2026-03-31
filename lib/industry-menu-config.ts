// lib/industry-menu-config.ts — 業種別メニュー表示制御
//
// /admin のサイドバーメニューを業種に応じてフィルタリングする。
// menu-permissions.ts の menuKey と連動。

import type { Industry } from "@/lib/feature-flags-shared";

// ---------------------------------------------------------------------------
// 業種別に表示するメニューキーの定義
// ---------------------------------------------------------------------------

/**
 * 各業種でテナント管理画面(/admin)に表示するメニューキー。
 * menu-permissions.ts の MENU_ITEMS[].key と一致させること。
 *
 * ここに含まれていないメニューは、その業種のテナントでは非表示になる。
 * allowedMenuKeys（権限ベース）とのAND条件で最終的な表示が決定する。
 */
export const INDUSTRY_MENU_MAP: Record<Industry, string[]> = {
  // クリニック — 既存の全メニュー（変更なし）
  clinic: [
    "dashboard",
    "accounting",
    "line",
    "reservations",
    "reorders",
    "karte",
    "doctor",
    "payments",
    "bank_reconcile",
    "subscription_plans",
    "shipping",
    "shipping_tracking",
    "shipping_settings",
    "view_mypage",
    "merge_patients",
    "intake_form",
    "schedule",
    "notification_settings",
    "products",
    "campaigns",
    "inventory",
    "tracking_sources",
    "settings",
    "help",
    // CLINIC専用（新規追加時にここに追記）
  ],

  // サロン — 予約・施術系を追加、医療系を除外
  salon: [
    "dashboard",
    "accounting",
    "line",
    // 予約・施術
    "reservations",
    "schedule",
    "stylists",       // 新規: スタイリスト管理
    "treatments",     // 新規: 施術メニュー管理
    "salon_karte",    // 新規: 施術カルテ
    "hotpepper",      // 新規: HotPepper連携
    "stamp_cards",    // 新規: スタンプカード
    // 決済
    "payments",
    // 顧客管理
    "view_mypage",
    "merge_patients",
    // 業務管理
    "notification_settings",
    "products",
    "campaigns",
    "tracking_sources",
    // システム
    "settings",
    "help",
  ],

  // EC — 配送・在庫を追加、予約・医療系を除外
  ec: [
    "dashboard",
    "accounting",
    "line",
    // 注文・決済
    "payments",
    "bank_reconcile",
    "subscription_plans",
    "ec_subscriptions", // 定期購入管理
    "ec_settings",    // 新規: EC連携設定
    "rfm",            // 新規: RFM分析
    // 配送
    "shipping",
    "shipping_tracking",
    "shipping_settings",
    // 顧客管理
    "view_mypage",
    "merge_patients",
    // 業務管理
    "notification_settings",
    "products",
    "campaigns",
    "inventory",
    "tracking_sources",
    // システム
    "settings",
    "help",
  ],

  // 汎用（Lオペ）— LINE CRM機能のみ
  other: [
    "dashboard",
    "accounting",
    "line",
    // 顧客管理
    "view_mypage",
    "merge_patients",
    // 業務管理
    "notification_settings",
    "campaigns",
    "tracking_sources",
    // システム
    "settings",
    "help",
  ],
};

/**
 * 指定された業種でメニューキーが表示可能かどうかを判定する。
 */
export function isMenuVisibleForIndustry(industry: Industry, menuKey: string): boolean {
  return INDUSTRY_MENU_MAP[industry]?.includes(menuKey) ?? false;
}

/**
 * 業種とロール権限の両方でフィルタリングした表示可能メニューキーを返す。
 *
 * @param industry テナントの業種
 * @param allowedMenuKeys ロールベースの許可メニューキー（nullの場合は全許可）
 * @returns 表示すべきメニューキーの配列
 */
export function getVisibleMenuKeys(
  industry: Industry,
  allowedMenuKeys: string[] | null,
): string[] {
  const industryKeys = INDUSTRY_MENU_MAP[industry] ?? INDUSTRY_MENU_MAP.other;

  if (!allowedMenuKeys) {
    // ロール制限なし（owner/admin） → 業種フィルタのみ適用
    return industryKeys;
  }

  // 業種フィルタ AND ロールフィルタ
  const allowedSet = new Set(allowedMenuKeys);
  return industryKeys.filter((key) => allowedSet.has(key));
}
