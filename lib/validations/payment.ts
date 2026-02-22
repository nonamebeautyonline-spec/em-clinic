// lib/validations/payment.ts — 決済関連APIのZodスキーマ
import { z } from "zod";

/** 銀行振込 POST /api/bank-transfer/shipping */
export const bankTransferShippingSchema = z
  .object({
    patientId: z.string().min(1, "患者IDは必須です"),
    productCode: z.string().min(1, "商品コードは必須です"),
    mode: z.string().optional(),
    reorderId: z.union([z.string(), z.number()]).optional().nullable(),
    accountName: z.string().min(1, "振込名義は必須です"),
    shippingName: z.string().min(1, "配送先氏名は必須です"),
    phoneNumber: z.string().min(1, "電話番号は必須です"),
    email: z.string().min(1, "メールアドレスは必須です"),
    postalCode: z.string().min(1, "郵便番号は必須です"),
    address: z.string().min(1, "住所は必須です"),
  })
  .passthrough();

/** 返金 POST /api/admin/refunds */
export const refundSchema = z
  .object({
    orderId: z.string().min(1, "注文IDは必須です"),
    amount: z.number().int().min(0).optional(),
    reason: z.string().optional(),
  })
  .passthrough();
