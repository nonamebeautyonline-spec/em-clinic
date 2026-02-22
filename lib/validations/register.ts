// lib/validations/register.ts — 登録完了API入力スキーマ
import { z } from "zod";

/** 電話認証完了 POST /api/register/complete */
export const registerCompleteSchema = z
  .object({
    phone: z.string().min(1, "電話番号は必須です"),
  })
  .passthrough();

export type RegisterCompleteInput = z.infer<typeof registerCompleteSchema>;
