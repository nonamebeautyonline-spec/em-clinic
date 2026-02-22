// lib/validations/forms.ts — フォーム送信API入力スキーマ
import { z } from "zod";

/** フォーム回答送信 POST /api/forms/[slug]/submit */
export const formSubmitSchema = z
  .object({
    answers: z.record(z.string(), z.unknown()),
    line_user_id: z.string().optional(),
    respondent_name: z.string().optional(),
  })
  .passthrough();

export type FormSubmitInput = z.infer<typeof formSubmitSchema>;
