// lib/feature-flags.ts — プラン別機能フラグ
//
// 従量課金制移行後:
// - 全プランで BASE_FEATURES が利用可（プラン間の機能差なし）
// - AI系3機能は tenant_options テーブルで個別課金管理
import { supabaseAdmin } from "@/lib/supabase";

/** 機能名の型定義 */
export type Feature =
  | "broadcast" // 一斉配信
  | "rich_menu" // リッチメニュー管理
  | "step_scenario" // ステップ配信
  | "keyword_reply" // キーワード自動応答
  | "ai_reply" // AI返信（オプション課金）
  | "form_builder" // フォームビルダー
  | "analytics" // アナリティクス
  | "reorder" // 再処方
  | "multi_doctor" // 複数Dr管理
  | "voice_input" // 音声入力（オプション課金）
  | "ai_karte"; // AIカルテ（オプション課金）

/** 全機能一覧 */
export const ALL_FEATURES: Feature[] = [
  "broadcast",
  "rich_menu",
  "step_scenario",
  "keyword_reply",
  "ai_reply",
  "form_builder",
  "analytics",
  "reorder",
  "multi_doctor",
  "voice_input",
  "ai_karte",
];

/** 全プラン共通で利用可能な基本機能（AI系オプション除く） */
export const BASE_FEATURES: Feature[] = [
  "broadcast",
  "rich_menu",
  "step_scenario",
  "keyword_reply",
  "form_builder",
  "analytics",
  "reorder",
  "multi_doctor",
];

/** AIオプション機能（tenant_options テーブルで課金管理） */
export const AI_OPTION_FEATURES: Feature[] = [
  "ai_reply",
  "voice_input",
  "ai_karte",
];

/** 機能名→表示名マッピング */
export const FEATURE_LABELS: Record<Feature, string> = {
  broadcast: "一斉配信",
  rich_menu: "リッチメニュー管理",
  step_scenario: "ステップ配信",
  keyword_reply: "キーワード自動応答",
  ai_reply: "AI返信",
  form_builder: "フォームビルダー",
  analytics: "アナリティクス",
  reorder: "再処方",
  multi_doctor: "複数Dr管理",
  voice_input: "音声入力",
  ai_karte: "AIカルテ",
};

/**
 * 旧プラン別の利用可能機能（後方互換）
 * 新規テナントはメッセージ量ベースプランで作成されるため、
 * 旧プラン名が使われることはないが、移行期間中の互換のため残す
 */
const LEGACY_PLAN_FEATURES: Record<string, Feature[]> = {
  trial: ["broadcast", "keyword_reply"],
  standard: [
    "broadcast",
    "rich_menu",
    "keyword_reply",
    "reorder",
    "form_builder",
  ],
  premium: [
    "broadcast",
    "rich_menu",
    "step_scenario",
    "keyword_reply",
    "ai_reply",
    "reorder",
    "form_builder",
    "analytics",
  ],
  enterprise: [...ALL_FEATURES],
};

/**
 * テナントのプラン名を取得
 */
async function getTenantPlan(tenantId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("tenant_plans")
    .select("plan_name")
    .eq("tenant_id", tenantId)
    .eq("status", "active")
    .maybeSingle();

  return data?.plan_name ?? null;
}

/**
 * テナント個別の機能オーバーライドを取得
 * tenant_settings (category="feature_flags") に保存
 * value: "true" = 強制有効, "false" = 強制無効
 */
async function getFeatureOverrides(
  tenantId: string
): Promise<Record<string, boolean>> {
  const { data } = await supabaseAdmin
    .from("tenant_settings")
    .select("key, value")
    .eq("tenant_id", tenantId)
    .eq("category", "feature_flags");

  if (!data) return {};

  const overrides: Record<string, boolean> = {};
  for (const row of data) {
    overrides[row.key] = row.value === "true";
  }
  return overrides;
}

/**
 * テナントで特定の機能が有効かチェック
 *
 * 解決ロジック（優先順位）:
 * 1. tenant_settings の個別オーバーライド（最優先）
 * 2. AIオプション → tenant_options テーブル参照
 * 3. ベース機能 → 全プランで有効
 * 4. 旧プラン互換 → LEGACY_PLAN_FEATURES で判定
 * 5. テナントID null → 全機能有効（シングルテナント互換）
 */
export async function hasFeature(
  tenantId: string | null,
  feature: Feature
): Promise<boolean> {
  // シングルテナント互換: テナントIDがなければ全機能有効
  if (!tenantId) return true;

  // 個別オーバーライド確認（最優先）
  const overrides = await getFeatureOverrides(tenantId);
  if (feature in overrides) {
    return overrides[feature];
  }

  // AIオプション → tenant_options テーブル参照
  if (AI_OPTION_FEATURES.includes(feature)) {
    const { data } = await supabaseAdmin
      .from("tenant_options")
      .select("is_active")
      .eq("tenant_id", tenantId)
      .eq("option_key", feature)
      .maybeSingle();
    return data?.is_active ?? false;
  }

  // ベース機能 → 全プランで有効
  if (BASE_FEATURES.includes(feature)) {
    return true;
  }

  // 旧プラン互換フォールバック
  const planName = await getTenantPlan(tenantId);
  if (!planName) return false;

  const planFeatures = LEGACY_PLAN_FEATURES[planName] ?? [];
  return planFeatures.includes(feature);
}

/**
 * テナントの有効な機能一覧を取得
 */
export async function getEnabledFeatures(
  tenantId: string | null
): Promise<Feature[]> {
  // シングルテナント互換
  if (!tenantId) return [...ALL_FEATURES];

  const planName = await getTenantPlan(tenantId);
  const basePlanFeatures = planName
    ? (LEGACY_PLAN_FEATURES[planName] ?? [])
    : [];

  const overrides = await getFeatureOverrides(tenantId);

  // ベース機能 + プラン機能 + オーバーライドを統合
  const enabled = new Set<Feature>([...BASE_FEATURES, ...basePlanFeatures]);

  // AIオプション: tenant_options から有効なものを追加
  const { data: options } = await supabaseAdmin
    .from("tenant_options")
    .select("option_key")
    .eq("tenant_id", tenantId)
    .eq("is_active", true);

  if (options) {
    for (const opt of options) {
      if (ALL_FEATURES.includes(opt.option_key as Feature)) {
        enabled.add(opt.option_key as Feature);
      }
    }
  }

  for (const [key, value] of Object.entries(overrides)) {
    if (value) {
      enabled.add(key as Feature);
    } else {
      enabled.delete(key as Feature);
    }
  }

  return [...enabled];
}

/**
 * プラン名から利用可能な機能一覧を取得（DB不要、定義のみ）
 * 新プランでは全ベース機能が有効なため、旧プラン互換用
 */
export function getPlanFeatures(planName: string): Feature[] {
  return LEGACY_PLAN_FEATURES[planName] ?? [...BASE_FEATURES];
}

/**
 * 利用可能なプラン一覧
 */
export const PLAN_NAMES = ["trial", "standard", "premium", "enterprise"] as const;
export type PlanName = (typeof PLAN_NAMES)[number];

/** 業種タイプ（将来的に業種別テナントグループに対応） */
export type Industry = "clinic" | "salon" | "retail" | "other";

/** 業種名→表示名マッピング */
export const INDUSTRY_LABELS: Record<Industry, string> = {
  clinic: "クリニック",
  salon: "サロン",
  retail: "小売",
  other: "その他",
};
