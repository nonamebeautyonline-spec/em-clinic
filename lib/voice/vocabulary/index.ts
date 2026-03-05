// lib/voice/vocabulary/index.ts — 医療辞書エントリポイント
// 全診療科のデフォルト辞書を統合エクスポート

export type { VocabEntry, Specialty } from "./types";
export { SPECIALTY_LABELS, CATEGORY_LABELS } from "./types";

import type { VocabEntry, Specialty } from "./types";
import { COMMON } from "./common";
import { BEAUTY } from "./beauty";
import { INTERNAL } from "./internal";
import { SURGERY } from "./surgery";
import { ORTHOPEDICS } from "./orthopedics";
import { DERMATOLOGY } from "./dermatology";
import { OPHTHALMOLOGY } from "./ophthalmology";
import { ENT } from "./ent";
import { UROLOGY } from "./urology";
import { OB_GYN } from "./ob-gyn";

/** 全診療科のデフォルト辞書 */
export const DEFAULT_VOCABULARY: Record<Specialty, VocabEntry[]> = {
  common: COMMON,
  beauty: BEAUTY,
  internal: INTERNAL,
  surgery: SURGERY,
  orthopedics: ORTHOPEDICS,
  dermatology: DERMATOLOGY,
  ophthalmology: OPHTHALMOLOGY,
  ent: ENT,
  urology: UROLOGY,
  ob_gyn: OB_GYN,
};

/** 指定された診療科のデフォルト辞書を取得（共通 + 選択科の合算） */
export function getDefaultVocabulary(specialties: Specialty[]): VocabEntry[] {
  const result: VocabEntry[] = [...COMMON];
  const added = new Set(COMMON.map((v) => v.term));

  for (const sp of specialties) {
    if (sp === "common") continue;
    const entries = DEFAULT_VOCABULARY[sp];
    if (!entries) continue;
    for (const entry of entries) {
      if (!added.has(entry.term)) {
        result.push(entry);
        added.add(entry.term);
      }
    }
  }

  return result;
}

/** 全診療科の用語数サマリー */
export function getVocabularySummary(): Record<Specialty, number> {
  return Object.fromEntries(
    Object.entries(DEFAULT_VOCABULARY).map(([key, entries]) => [key, entries.length])
  ) as Record<Specialty, number>;
}
