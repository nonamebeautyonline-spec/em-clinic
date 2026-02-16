// lib/validations/reorder.ts — 再処方申請入力スキーマ
import { z } from "zod";

export const reorderApplySchema = z.object({
  productCode: z.string().min(1, "商品コードは必須です").max(100),
  patientId: z.string().optional(),
});

export type ReorderApplyInput = z.infer<typeof reorderApplySchema>;
