// lib/validations/nps.ts — NPS回答API入力スキーマ
import { z } from "zod";

/** NPS回答送信 POST /api/nps/[id] */
export const npsResponseSchema = z
  .object({
    score: z.number().min(0, "スコアは0以上").max(10, "スコアは10以下"),
    comment: z.string().optional(),
    patient_id: z.string().optional(),
  })
  .passthrough();

export type NpsResponseInput = z.infer<typeof npsResponseSchema>;
