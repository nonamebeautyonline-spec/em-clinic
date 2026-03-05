// lib/voice/vocabulary/types.ts — 医療辞書の型定義・ラベル

/** 辞書エントリ */
export type VocabEntry = {
  term: string;
  reading?: string;
  category: "drug" | "symptom" | "procedure" | "anatomy" | "lab" | "general";
  boost_weight: number;
};

/** 診療科カテゴリ */
export type Specialty =
  | "common"
  | "beauty"
  | "internal"
  | "surgery"
  | "orthopedics"
  | "dermatology"
  | "ophthalmology"
  | "ent"
  | "urology"
  | "ob_gyn";

/** 診療科ラベル（日本語表示名） */
export const SPECIALTY_LABELS: Record<Specialty, string> = {
  common: "共通（全科）",
  beauty: "美容（自由診療）",
  internal: "内科",
  surgery: "外科",
  orthopedics: "整形外科",
  dermatology: "皮膚科",
  ophthalmology: "眼科",
  ent: "耳鼻咽喉科",
  urology: "泌尿器科",
  ob_gyn: "産婦人科",
};

/** カテゴリラベル */
export const CATEGORY_LABELS: Record<VocabEntry["category"], string> = {
  drug: "薬剤",
  symptom: "症状",
  procedure: "処置・検査",
  anatomy: "解剖",
  lab: "検査値",
  general: "その他",
};
