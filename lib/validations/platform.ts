// lib/validations/platform.ts — プラットフォーム管理API入力スキーマ
import { z } from "zod";

/** インパーソネーション開始 POST /api/platform/impersonate */
export const impersonateSchema = z
  .object({
    tenantId: z.string().min(1, "tenantIdは必須です"),
  })
  .passthrough();

export type ImpersonateInput = z.infer<typeof impersonateSchema>;

/** TOTP検証・有効化 POST /api/platform/totp/verify */
export const totpVerifySchema = z
  .object({
    secret: z.string().min(1, "シークレットは必須です"),
    token: z.string().min(1, "コードは必須です"),
    backupCodes: z.array(z.string()).optional(),
  })
  .passthrough();

export type TotpVerifyInput = z.infer<typeof totpVerifySchema>;

/** TOTPログイン POST /api/platform/totp/login */
export const totpLoginSchema = z
  .object({
    pendingTotpToken: z.string().min(1, "仮トークンは必須です"),
    token: z.string().min(1, "認証コードは必須です"),
  })
  .passthrough();

export type TotpLoginInput = z.infer<typeof totpLoginSchema>;

/** TOTP無効化 POST /api/platform/totp/disable */
export const totpDisableSchema = z
  .object({
    token: z.string().min(1, "確認コードは必須です"),
  })
  .passthrough();

export type TotpDisableInput = z.infer<typeof totpDisableSchema>;
