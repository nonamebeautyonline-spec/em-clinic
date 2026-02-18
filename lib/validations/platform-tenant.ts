// lib/validations/platform-tenant.ts
// テナント管理用Zodスキーマ

import { z } from "zod";

// slug予約語
const RESERVED_SLUGS = ["app", "admin", "www", "localhost", "127", "l-ope", "api", "platform"];

export const createTenantSchema = z.object({
  name: z.string().min(1, "クリニック名は必須です").max(100),
  slug: z
    .string()
    .min(2, "スラグは2文字以上です")
    .max(50)
    .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, "英小文字・数字・ハイフンのみ（先頭末尾はハイフン不可）")
    .refine((s) => !RESERVED_SLUGS.includes(s), "この名前は予約済みです"),
  contactEmail: z.string().email("有効なメールアドレスを入力してください").max(255).optional(),
  contactPhone: z.string().max(20).optional(),
  address: z.string().max(500).optional(),
  // 初期管理者
  adminName: z.string().min(1, "管理者名は必須です").max(100),
  adminEmail: z.string().email("有効なメールアドレスを入力してください").max(255),
  adminPassword: z.string().min(8, "パスワードは8文字以上です").max(100),
  // LINE設定（任意）
  lineChannelId: z.string().optional(),
  lineChannelSecret: z.string().optional(),
  lineAccessToken: z.string().optional(),
  // プラン（任意）
  planName: z.enum(["trial", "standard", "premium", "enterprise"]).default("standard"),
  monthlyFee: z.number().int().min(0).default(50000),
  setupFee: z.number().int().min(0).default(300000),
});

export const updateTenantSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/)
    .refine((s) => !RESERVED_SLUGS.includes(s), "この名前は予約済みです")
    .optional(),
  contactEmail: z.string().email().max(255).nullable().optional(),
  contactPhone: z.string().max(20).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  logoUrl: z.string().url().max(500).nullable().optional(),
});

export const updateTenantStatusSchema = z.object({
  isActive: z.boolean(),
});

export const addMemberSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(255),
  password: z.string().min(8).max(100),
  role: z.enum(["admin", "owner"]).default("admin"),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(["admin", "owner"]),
});

export type CreateTenantInput = z.infer<typeof createTenantSchema>;
export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;
