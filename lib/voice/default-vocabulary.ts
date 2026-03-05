// lib/voice/default-vocabulary.ts — 後方互換 re-export
// 実装は lib/voice/vocabulary/ に分割済み
// 既存のインポートを壊さないよう、全エクスポートをそのまま公開する

export type { VocabEntry, Specialty } from "./vocabulary";
export {
  SPECIALTY_LABELS,
  CATEGORY_LABELS,
  DEFAULT_VOCABULARY,
  getDefaultVocabulary,
  getVocabularySummary,
} from "./vocabulary";
