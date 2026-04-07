// lib/validations/reorder.ts — 再処方申請入力スキーマ
import { z } from "zod";

export const reorderApplySchema = z.object({
  productCode: z.string().min(1).max(100).optional(),
  productCodes: z.array(z.string().min(1).max(100)).optional(),
  patientId: z.string().optional(),
}).passthrough();

export type ReorderApplyInput = z.infer<typeof reorderApplySchema>;
