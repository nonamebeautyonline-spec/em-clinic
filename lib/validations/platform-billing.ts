// lib/validations/platform-billing.ts
// 請求管理用Zodスキーマ

import { z } from "zod";

export const updatePlanSchema = z.object({
  planName: z.enum(["trial", "standard", "premium", "enterprise"]),
  monthlyFee: z.number().int().min(0),
  setupFee: z.number().int().min(0).optional(),
  notes: z.string().max(500).nullable().optional(),
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
