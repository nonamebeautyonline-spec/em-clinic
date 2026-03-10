// lib/validations/apply.ts — SaaS申し込みフォーム バリデーション（税込価格）
import { z } from "zod";

export const INDUSTRIES = [
  "美容皮膚科",
  "美容外科",
  "皮膚科",
  "内科",
  "整形外科",
  "歯科",
  "眼科",
  "耳鼻咽喉科",
  "産婦人科",
  "小児科",
  "精神科・心療内科",
  "泌尿器科",
  "AGA・薄毛治療",
  "脱毛クリニック",
  "その他",
] as const;

/** 機能プラン（3段階・税込） — 上位プランは下位の全機能を含む */
export const FEATURE_PLANS = [
  {
    key: "ライト",
    price: 22000,
    initialCost: 0,
    desc: "LINE配信・自動化で集患・リピートを強化",
    features: [
      "管理画面",
      "友だち管理（CRM）",
      "LINEトーク",
      "セグメント配信",
      "ステップシナリオ",
      "リッチメニュー",
      "フォームビルダー",
      "アクション自動化",
      "自動リマインド",
      "クーポン配信",
    ],
  },
  {
    key: "スタンダード",
    price: 71500,
    initialCost: 330000,
    popular: true,
    desc: "予約・カルテ・問診まで診療業務をカバー",
    features: [
      "予約カレンダー",
      "カルテ管理",
      "問診フォーム",
      "処方タイムライン",
    ],
  },
  {
    key: "プロ",
    price: 121000,
    initialCost: 550000,
    desc: "決済・配送・分析まで業務をまるごとDX化",
    features: [
      "決済管理",
      "配送管理",
      "在庫管理",
      "ダッシュボード",
      "売上管理",
      "NPS調査",
    ],
  },
] as const;

/** AIオプション（月額追加・税込） */
export const AI_OPTIONS = [
  { key: "AI自動返信", price: 22000, desc: "AIによるLINE自動返信" },
  { key: "音声カルテ", price: 16500, desc: "診察音声からSOAPカルテを自動生成" },
] as const;

/** その他オプション（月額追加・税込） */
export const EXTRA_OPTIONS = [
  { key: "LINEbot通知", price: 5500, desc: "予約・決済等のイベントをLINE botで自動通知" },
] as const;

/** メッセージ通数プラン（別途選択・税込） */
export const MSG_PLANS = [
  { key: "5,000通", price: 4400, per: "¥1.1/通" },
  { key: "30,000通", price: 18700, per: "¥0.77/通", popular: true },
  { key: "50,000通", price: 30800, per: "¥0.62/通" },
  { key: "100,000通", price: 77000, per: "¥0.55/通" },
  { key: "300,000通", price: 115500, per: "¥0.44/通" },
  { key: "500,000通", price: 126500, per: "¥0.33/通" },
  { key: "1,000,000通", price: 173800, per: "¥0.22/通" },
] as const;

export const SETUP_OPTIONS = [
  { key: "LINE公式アカウント初期構築", price: 110000, desc: "LINE公式アカウントの開設・Messaging API設定" },
  { key: "リッチメニュー作成", price: 27500, desc: "デザイン・設定込みのリッチメニュー構築" },
  { key: "データ移行", price: 110000, desc: "既存システムからの患者データ移行" },
] as const;

const featurePlanKeys = FEATURE_PLANS.map((p) => p.key);
const msgPlanKeys = MSG_PLANS.map((p) => p.key);

export const applicationSchema = z.object({
  company_name: z.string().min(1, "会社名は必須です").max(100),
  platform_name: z.string().max(100).optional(),
  industry: z.enum(INDUSTRIES as unknown as [string, ...string[]], {
    error: "業種を選択してください",
  }),
  contact_phone: z
    .string()
    .min(1, "電話番号は必須です")
    .regex(/^[0-9\-]+$/, "電話番号の形式が不正です"),
  email: z.string().email("メールアドレスの形式が不正です"),
  feature_plan: z.enum(featurePlanKeys as unknown as [string, ...string[]], {
    error: "機能プランを選択してください",
  }),
  msg_plan: z.enum(msgPlanKeys as unknown as [string, ...string[]], {
    error: "メッセージ通数を選択してください",
  }),
  ai_options: z.array(z.string()).default([]),
  extra_options: z.array(z.string()).default([]),
  setup_options: z.array(z.string()).default([]),
  note: z.string().max(1000).optional(),
  agreed_terms: z.literal(true, {
    error: "利用規約への同意が必要です",
  }),
});

export type ApplicationInput = z.infer<typeof applicationSchema>;

/* ─── 見積もり計算ヘルパー（税込） ─── */

export function getFeaturePlanPrice(key: string): number {
  return FEATURE_PLANS.find((p) => p.key === key)?.price ?? 0;
}

export function getFeaturePlanInitialCost(key: string): number {
  return FEATURE_PLANS.find((p) => p.key === key)?.initialCost ?? 0;
}

export function getMsgPlanPrice(key: string): number {
  return MSG_PLANS.find((p) => p.key === key)?.price ?? 0;
}

export function getAiOptionsTotal(keys: string[]): number {
  return keys.reduce((sum, k) => sum + (AI_OPTIONS.find((o) => o.key === k)?.price ?? 0), 0);
}

export function getExtraOptionsTotal(keys: string[]): number {
  return keys.reduce((sum, k) => sum + (EXTRA_OPTIONS.find((o) => o.key === k)?.price ?? 0), 0);
}

export function getSetupOptionsTotal(keys: string[]): number {
  return keys.reduce((sum, k) => sum + (SETUP_OPTIONS.find((o) => o.key === k)?.price ?? 0), 0);
}

export function getIncludedFeatures(planKey: string): string[] {
  const idx = FEATURE_PLANS.findIndex((p) => p.key === planKey);
  if (idx < 0) return [];
  const features: string[] = [];
  for (let i = 0; i <= idx; i++) {
    features.push(...FEATURE_PLANS[i].features);
  }
  return features;
}
