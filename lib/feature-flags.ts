// lib/feature-flags.ts — プラン別機能フラグ
import { supabaseAdmin } from "@/lib/supabase";

/** 機能名の型定義 */
export type Feature =
  | "broadcast" // 一斉配信
  | "rich_menu" // リッチメニュー管理
  | "step_scenario" // ステップ配信
  | "keyword_reply" // キーワード自動応答
  | "ai_reply" // AI返信
  | "form_builder" // フォームビルダー
  | "analytics" // アナリティクス
  | "reorder" // 再処方
  | "multi_doctor"; // 複数Dr管理

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
};

/** プラン別の利用可能機能 */
const PLAN_FEATURES: Record<string, Feature[]> = {
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
 * 1. tenant_settings の個別オーバーライド
 * 2. tenant_plans のプラン → PLAN_FEATURES マッピング
 * 3. テナントID null → 全機能有効（シングルテナント互換）
 */
export async function hasFeature(
  tenantId: string | null,
  feature: Feature
): Promise<boolean> {
  // シングルテナント互換: テナントIDがなければ全機能有効
  if (!tenantId) return true;

  // 個別オーバーライド確認
  const overrides = await getFeatureOverrides(tenantId);
  if (feature in overrides) {
    return overrides[feature];
  }

  // プランベース判定
  const planName = await getTenantPlan(tenantId);
  if (!planName) return false; // プラン未設定 → 機能なし

  const planFeatures = PLAN_FEATURES[planName] ?? [];
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
    ? (PLAN_FEATURES[planName] ?? [])
    : [];

  const overrides = await getFeatureOverrides(tenantId);

  // プラン機能 + オーバーライドを統合
  const enabled = new Set<Feature>(basePlanFeatures);

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
 */
export function getPlanFeatures(planName: string): Feature[] {
  return PLAN_FEATURES[planName] ?? [];
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
