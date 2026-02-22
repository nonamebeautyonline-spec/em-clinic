// lib/validations/ai-reply.ts — AI返信ドラフトAPI入力スキーマ
import { z } from "zod";

/** AI返信ドラフト送信 POST /api/ai-reply/[draftId]/send */
export const aiReplySendSchema = z
  .object({
    sig: z.string().min(1, "署名は必須です"),
    exp: z.number({ message: "期限は数値で指定してください" }),
  })
  .passthrough();

export type AiReplySendInput = z.infer<typeof aiReplySendSchema>;

/** 却下理由カテゴリ */
export const rejectCategoryEnum = z.enum([
  "inaccurate",       // 不正確
  "inappropriate",    // 不適切な表現
  "not_answering",    // 質問に答えていない
  "insufficient_info", // 情報不足
  "other",            // その他
]);

export type RejectCategory = z.infer<typeof rejectCategoryEnum>;

/** 却下理由カテゴリの日本語ラベル */
export const rejectCategoryLabels: Record<RejectCategory, string> = {
  inaccurate: "不正確",
  inappropriate: "不適切な表現",
  not_answering: "質問に答えていない",
  insufficient_info: "情報不足",
  other: "その他",
};

/** AI返信ドラフト却下 POST /api/ai-reply/[draftId]/reject */
export const aiReplyRejectSchema = z
  .object({
    sig: z.string().min(1, "署名は必須です"),
    exp: z.number({ message: "期限は数値で指定してください" }),
    reason: z.string().optional(),                    // 却下理由（自由記述）
    reject_category: rejectCategoryEnum.optional(),   // 却下理由カテゴリ
  })
  .passthrough();

export type AiReplyRejectInput = z.infer<typeof aiReplyRejectSchema>;

/** AI返信ドラフト再生成 POST /api/ai-reply/[draftId]/regenerate */
export const aiReplyRegenerateSchema = z
  .object({
    instruction: z.string().min(1, "修正指示は必須です"),
    sig: z.string().min(1, "署名は必須です"),
    exp: z.number({ message: "期限は数値で指定してください" }),
  })
  .passthrough();

export type AiReplyRegenerateInput = z.infer<typeof aiReplyRegenerateSchema>;
