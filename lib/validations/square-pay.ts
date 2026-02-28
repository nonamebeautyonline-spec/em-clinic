// lib/validations/square-pay.ts — アプリ内決済リクエストのバリデーション
import { z } from "zod";

export const inlinePaySchema = z.object({
  sourceId: z.string().min(1).regex(/^(cnon:|ccof:)/, "無効な決済ソースです"),
  productCode: z.string().min(1).max(100),
  mode: z.enum(["current", "first", "reorder"]).optional(),
  patientId: z.string().min(1),
  reorderId: z.union([z.string(), z.null()]).optional(),
  saveCard: z.boolean().optional().default(true),
  shipping: z.object({
    name: z.string().min(1),
    postalCode: z.string().regex(/^\d{3}-?\d{4}$/, "郵便番号の形式が正しくありません"),
    address: z.string().min(1),
    phone: z.string().min(1),
    email: z.string().email(),
  }),
});

export type InlinePayInput = z.infer<typeof inlinePaySchema>;
