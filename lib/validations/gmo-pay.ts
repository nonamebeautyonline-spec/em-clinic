// lib/validations/gmo-pay.ts — GMOインライン決済リクエストのバリデーション
import { z } from "zod";

export const gmoInlinePaySchema = z.object({
  token: z.string().min(1).optional(),
  useSavedCard: z.boolean().optional().default(false),
  // 単一商品モード（後方互換）
  productCode: z.string().min(1).max(100).optional(),
  // カートモード（複数商品）
  cartItems: z.array(z.object({
    code: z.string().min(1).max(100),
    qty: z.number().int().min(1).max(99),
  })).optional(),
  mode: z.enum(["current", "first", "reorder"]).optional(),
  patientId: z.string().min(1),
  reorderId: z.union([z.string(), z.null()]).optional(),
  saveCard: z.boolean().optional().default(true),
  isFirstPurchase: z.boolean().optional().default(false),
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

export type GmoInlinePayInput = z.infer<typeof gmoInlinePaySchema>;
