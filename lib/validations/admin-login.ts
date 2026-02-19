// lib/validations/admin-login.ts — 管理者ログイン入力スキーマ
import { z } from "zod";

export const adminLoginSchema = z.object({
  username: z.string().min(1, "ユーザーIDは必須です").max(50),
  password: z.string().min(1, "パスワードは必須です").max(200),
});

export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
