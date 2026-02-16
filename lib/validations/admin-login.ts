// lib/validations/admin-login.ts — 管理者ログイン入力スキーマ
import { z } from "zod";

export const adminLoginSchema = z.object({
  email: z.string().email("メールアドレスの形式が不正です").max(255),
  password: z.string().min(1, "パスワードは必須です").max(200),
  token: z.string().min(1, "トークンは必須です").max(200),
});

export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
