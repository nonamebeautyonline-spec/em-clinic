// lib/validations/platform-auth.ts — プラットフォーム認証関連Zodスキーマ
import { z } from "zod";
import { strongPasswordSchema } from "@/lib/validations/password-policy";

// パスワードリセットリクエスト（メール送信）
export const passwordResetRequestSchema = z.object({
  email: z.string().email("有効なメールアドレスを入力してください"),
});

export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>;

// パスワードリセット実行（新パスワード設定）
export const passwordResetSchema = z.object({
  token: z.string().min(1, "トークンは必須です"),
  password: strongPasswordSchema,
});

export type PasswordResetInput = z.infer<typeof passwordResetSchema>;
