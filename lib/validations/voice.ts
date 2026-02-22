// lib/validations/voice.ts — 音声入力APIのZodスキーマ
import { z } from "zod";

/** 音声文字起こし POST /api/voice/transcribe メタデータ */
export const transcribeMetadataSchema = z
  .object({
    // テナントID（マルチテナント対応）
    tenantId: z.string().optional(),
  })
  .passthrough();

/** 音声ファイルのバリデーション定数 */
export const VOICE_LIMITS = {
  // 最大ファイルサイズ: 4MB（Vercel 4.5MB制限に余裕を持たせる）
  MAX_FILE_SIZE: 4 * 1024 * 1024,
  // 最大録音時間: 5分
  MAX_DURATION_SEC: 300,
  // 対応MIMEタイプ
  ALLOWED_MIME_TYPES: [
    "audio/webm",
    "audio/ogg",
    "audio/mp4",
    "audio/mpeg",
    "audio/wav",
  ] as const,
  // Deepgram confidence のフォールバック閾値
  FALLBACK_CONFIDENCE_THRESHOLD: 0.7,
} as const;

// --- 医療辞書管理 API スキーマ ---

const VALID_CATEGORIES = ["drug", "symptom", "procedure", "anatomy", "lab", "general"] as const;
const VALID_SPECIALTIES = ["common", "beauty", "internal", "surgery", "orthopedics", "dermatology"] as const;

/** 用語追加 POST /api/admin/voice/vocabulary */
export const createVocabularySchema = z.object({
  term: z.string().min(1, "用語を入力してください").max(100),
  reading: z.string().max(100).optional(),
  category: z.enum(VALID_CATEGORIES).default("general"),
  specialty: z.enum(VALID_SPECIALTIES).default("common"),
  boost_weight: z.number().min(1.0).max(3.0).default(1.5),
});

/** 用語更新 PUT /api/admin/voice/vocabulary */
export const updateVocabularySchema = z.object({
  id: z.string().uuid(),
  term: z.string().min(1).max(100).optional(),
  reading: z.string().max(100).nullable().optional(),
  category: z.enum(VALID_CATEGORIES).optional(),
  specialty: z.enum(VALID_SPECIALTIES).optional(),
  boost_weight: z.number().min(1.0).max(3.0).optional(),
});

/** 用語削除 DELETE /api/admin/voice/vocabulary */
export const deleteVocabularySchema = z.object({
  id: z.string().uuid(),
});

/** デフォルト辞書一括投入 POST /api/admin/voice/vocabulary/seed */
export const seedVocabularySchema = z.object({
  specialties: z.array(z.enum(VALID_SPECIALTIES)).min(1, "診療科を1つ以上選択してください"),
});
