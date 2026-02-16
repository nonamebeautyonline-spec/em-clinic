// lib/validations/checkout.ts — 決済リクエスト入力スキーマ
import { z } from "zod";

export const checkoutSchema = z.object({
  productCode: z.string().min(1, "商品コードは必須です").max(100),
  mode: z.enum(["current", "first", "reorder"], {
    error: "modeはcurrent/first/reorderのいずれか",
  }),
  patientId: z.string().optional(),
  reorderId: z.string().optional(),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
