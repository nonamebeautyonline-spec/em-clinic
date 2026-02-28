// lib/validations/square-pay.ts — アプリ内決済リクエストのバリデーション
import { z } from "zod";

export const inlinePaySchema = z.object({
  sourceId: z.string().min(1),
  productCode: z.string().min(1).max(100),
  mode: z.enum(["current", "first", "reorder"]).optional(),
  patientId: z.string().min(1),
  reorderId: z.union([z.string(), z.null()]).optional(),
  saveCard: z.boolean().optional().default(true),
  shipping: z.object({
    name: z.string().min(1),
    postalCode: z.string().min(1),
    address: z.string().min(1),
    phone: z.string().min(1),
    email: z.string().email(),
  }),
});

export type InlinePayInput = z.infer<typeof inlinePaySchema>;
