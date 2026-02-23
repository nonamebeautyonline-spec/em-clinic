// lib/plan-config.ts — メッセージプラン定義・AIオプション定義
//
// Lステップの各プラン価格を2割減・キリのいい数字で設定。
// 全プランで全機能利用可（AI系オプション除く）。

import type { Feature } from "./feature-flags";

/** メッセージプラン定義 */
export interface PlanTier {
  key: string;
  label: string;
  messageQuota: number; // 込み通数/月
  monthlyPrice: number; // 月額（税込・円）
  overageUnitPrice: number; // 超過単価（円/通）
  stripePriceId: string; // Stripe Price ID（Stripe設定後に埋める）
}

/** AIオプション定義 */
export interface OptionAddon {
  key: string;
  label: string;
  monthlyPrice: number; // 月額（税込・円）
  feature: Feature; // feature-flags.ts の Feature 型と連動
  stripePriceId: string; // Stripe Price ID
}

/**
 * メッセージプラン一覧（Lステップ2割減・税込）
 *
 * | Lオペ        | 通数      | 月額      | Lステップ対応        |
 * |-------------|----------|----------|-------------------|
 * | ライト       | 5,000    | ¥4,000   | スタート ¥5,000     |
 * | スタンダード  | 30,000   | ¥17,000  | スタンダード ¥21,780 |
 * | プロ         | 50,000   | ¥26,000  | プロ ¥32,780       |
 * | ビジネス     | 100,000  | ¥70,000  | 大量10万 ¥87,780   |
 * | ビジネス30万  | 300,000  | ¥105,000 | 大量30万 ¥131,780  |
 * | ビジネス50万  | 500,000  | ¥115,000 | 大量50万 ¥142,780  |
 * | ビジネス100万 | 1,000,000| ¥158,000 | 大量100万 ¥197,780 |
 */
export const MESSAGE_PLANS: PlanTier[] = [
  {
    key: "light",
    label: "ライト",
    messageQuota: 5_000,
    monthlyPrice: 4_000,
    overageUnitPrice: 1.0,
    stripePriceId: "",
  },
  {
    key: "standard",
    label: "スタンダード",
    messageQuota: 30_000,
    monthlyPrice: 17_000,
    overageUnitPrice: 0.7,
    stripePriceId: "",
  },
  {
    key: "pro",
    label: "プロ",
    messageQuota: 50_000,
    monthlyPrice: 26_000,
    overageUnitPrice: 0.6,
    stripePriceId: "",
  },
  {
    key: "business",
    label: "ビジネス",
    messageQuota: 100_000,
    monthlyPrice: 70_000,
    overageUnitPrice: 0.5,
    stripePriceId: "",
  },
  {
    key: "business_30",
    label: "ビジネス30万",
    messageQuota: 300_000,
    monthlyPrice: 105_000,
    overageUnitPrice: 0.4,
    stripePriceId: "",
  },
  {
    key: "business_50",
    label: "ビジネス50万",
    messageQuota: 500_000,
    monthlyPrice: 115_000,
    overageUnitPrice: 0.3,
    stripePriceId: "",
  },
  {
    key: "business_100",
    label: "ビジネス100万",
    messageQuota: 1_000_000,
    monthlyPrice: 158_000,
    overageUnitPrice: 0.2,
    stripePriceId: "",
  },
];

/**
 * AIオプション一覧（定額アドオン）
 */
export const AI_OPTIONS: OptionAddon[] = [
  {
    key: "ai_reply",
    label: "AI返信",
    monthlyPrice: 20_000,
    feature: "ai_reply",
    stripePriceId: "",
  },
  {
    key: "voice_input",
    label: "音声入力",
    monthlyPrice: 15_000,
    feature: "voice_input",
    stripePriceId: "",
  },
  {
    key: "ai_karte",
    label: "AIカルテ",
    monthlyPrice: 20_000,
    feature: "ai_karte",
    stripePriceId: "",
  },
];

/** AI系オプションのキー一覧 */
export const AI_OPTION_KEYS = AI_OPTIONS.map((o) => o.key);

/** プランキーからプラン情報を取得 */
export function getPlanByKey(key: string): PlanTier | undefined {
  return MESSAGE_PLANS.find((p) => p.key === key);
}

/** オプションキーからオプション情報を取得 */
export function getOptionByKey(key: string): OptionAddon | undefined {
  return AI_OPTIONS.find((o) => o.key === key);
}

/** 月額合計を計算（プラン + オプション） */
export function calculateMonthlyTotal(
  planKey: string,
  activeOptionKeys: string[]
): number {
  const plan = getPlanByKey(planKey);
  if (!plan) return 0;

  const optionsTotal = activeOptionKeys.reduce((sum, key) => {
    const opt = getOptionByKey(key);
    return sum + (opt?.monthlyPrice ?? 0);
  }, 0);

  return plan.monthlyPrice + optionsTotal;
}
