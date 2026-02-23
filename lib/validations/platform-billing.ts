// lib/validations/platform-billing.ts
// 請求管理・従量課金用Zodスキーマ

import { z } from "zod";
import { MESSAGE_PLANS, AI_OPTIONS } from "@/lib/plan-config";

/** 有効なプランキー一覧 */
const PLAN_KEYS = MESSAGE_PLANS.map((p) => p.key);

/** 有効なオプションキー一覧 */
const OPTION_KEYS = AI_OPTIONS.map((o) => o.key);

/** 旧プラン + 新プラン両方に対応 */
const ALL_PLAN_NAMES = [
  "trial",
  "standard",
  "premium",
  "enterprise",
  ...PLAN_KEYS,
] as const;

export const updatePlanSchema = z.object({
  planName: z.enum(ALL_PLAN_NAMES as unknown as [string, ...string[]]),
  monthlyFee: z.number().int().min(0),
  setupFee: z.number().int().min(0).optional(),
  messageQuota: z.number().int().min(0).optional(),
  overageUnitPrice: z.number().min(0).optional(),
  notes: z.string().max(500).nullable().optional(),
});

/** AIオプション切替スキーマ */
export const toggleOptionSchema = z.object({
  tenantId: z.string().uuid(),
  optionKey: z.enum(OPTION_KEYS as unknown as [string, ...string[]]),
  isActive: z.boolean(),
});

/** 使用量クエリスキーマ */
export const usageQuerySchema = z.object({
  tenantId: z.string().uuid().optional(),
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/, "YYYY-MM形式で入力してください")
    .optional(),
});

export const createInvoiceSchema = z.object({
  tenantId: z.string().uuid(),
  amount: z.number().int().min(0),
  taxAmount: z.number().int().min(0).default(0),
  billingPeriodStart: z.string().date(),
  billingPeriodEnd: z.string().date(),
  notes: z.string().max(500).nullable().optional(),
});

export const updateInvoiceStatusSchema = z.object({
  status: z.enum(["pending", "paid", "overdue", "cancelled"]),
  paidAt: z.string().datetime().nullable().optional(),
});

export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type ToggleOptionInput = z.infer<typeof toggleOptionSchema>;
export type UsageQueryInput = z.infer<typeof usageQuerySchema>;
