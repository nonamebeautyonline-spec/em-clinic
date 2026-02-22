// lib/validations/coupon.ts — クーポンAPI入力スキーマ
import { z } from "zod";

/** クーポン検証 POST /api/coupon/validate */
export const couponValidateSchema = z
  .object({
    code: z.string().min(1, "クーポンコードは必須です").max(100),
    patient_id: z.string().optional(),
  })
  .passthrough();

export type CouponValidateInput = z.infer<typeof couponValidateSchema>;

/** クーポン利用記録 POST /api/coupon/redeem */
export const couponRedeemSchema = z
  .object({
    coupon_id: z.string().min(1, "coupon_idは必須です"),
    patient_id: z.string().min(1, "patient_idは必須です"),
    order_id: z.string().optional(),
  })
  .passthrough();

export type CouponRedeemInput = z.infer<typeof couponRedeemSchema>;
