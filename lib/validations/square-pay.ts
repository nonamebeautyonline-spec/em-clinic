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
    addressDetail: z.string().optional().default(""),
    phone: z.string().min(1),
    email: z.string().email(),
  }),
  shippingOptions: z.object({
    customSenderName: z.string().nullable().optional(),
    itemNameCosmetics: z.boolean().optional().default(false),
    useHexidin: z.boolean().optional().default(false),
    postOfficeHold: z.boolean().optional().default(false),
    postOfficeName: z.string().nullable().optional(),
  }).optional(),
});

export type InlinePayInput = z.infer<typeof inlinePaySchema>;
