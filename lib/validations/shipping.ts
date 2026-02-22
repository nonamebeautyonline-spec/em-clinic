// lib/validations/shipping.ts — 発送関連APIのZodスキーマ
import { z } from "zod";

/** 発送設定 POST /api/admin/shipping/config */
export const shippingConfigSchema = z
  .object({
    yamato_customer_code: z.string().optional(),
    yamato_password: z.string().optional(),
    default_sender_name: z.string().optional(),
    default_sender_phone: z.string().optional(),
    default_sender_postal_code: z.string().optional(),
    default_sender_address: z.string().optional(),
  })
  .passthrough();

/** ヤマトB2 CSV出力 POST /api/admin/shipping/export-yamato-b2 */
export const exportYamatoB2Schema = z
  .object({
    order_ids: z.array(z.string()).min(1, "order_idsは1件以上必要です"),
  })
  .passthrough();

/** ヤマトB2カスタムCSV出力 POST /api/admin/shipping/export-yamato-b2-custom */
export const exportYamatoB2CustomSchema = z
  .object({
    items: z
      .array(
        z.object({
          payment_id: z.string(),
          name: z.string(),
          postal: z.string(),
          address: z.string(),
          email: z.string(),
          phone: z.string(),
        }).passthrough()
      )
      .min(1, "itemsは1件以上必要です"),
    all_payment_ids: z.array(z.string()).optional(),
  })
  .passthrough();

/** LステップタグCSV出力 POST /api/admin/shipping/lstep-tag-csv */
export const lstepTagCsvSchema = z
  .object({
    lstepIds: z.array(z.string()).min(1, "LステップIDリストは1件以上必要です"),
  })
  .passthrough();

/** 配送共有 POST /api/admin/shipping/share */
export const shippingShareSchema = z
  .object({
    data: z.array(z.any()).min(1, "共有データは1件以上必要です"),
  })
  .passthrough();

/** 追跡番号CSV一括更新 POST /api/admin/shipping/update-tracking */
export const updateTrackingCsvSchema = z
  .object({
    csvContent: z.string().min(1, "CSVデータは必須です"),
  })
  .passthrough();

/** 追跡番号更新確定 POST /api/admin/shipping/update-tracking/confirm */
export const updateTrackingConfirmSchema = z
  .object({
    entries: z
      .array(
        z.object({
          payment_id: z.string(),
          patient_name: z.string(),
          tracking_number: z.string(),
          matched: z.boolean(),
        }).passthrough()
      )
      .min(1, "更新データは1件以上必要です"),
  })
  .passthrough();

/** Noname Master: 発送追加 POST /api/admin/noname-master/add-to-shipping */
export const addToShippingSchema = z
  .object({
    order_id: z.string().min(1, "order_idは必須です"),
  })
  .passthrough();

/** Noname Master: ラベル再作成 POST /api/admin/noname-master/recreate-label */
export const recreateLabelSchema = z
  .object({
    order_id: z.string().min(1, "order_idは必須です"),
  })
  .passthrough();

/** Noname Master: 追跡番号個別更新 POST /api/admin/noname-master/update-tracking */
export const nonameMasterUpdateTrackingSchema = z
  .object({
    order_id: z.string().min(1, "order_idは必須です"),
    tracking_number: z.string().min(1, "tracking_numberは必須です"),
    update_only: z.boolean().optional(),
    shipping_date: z.string().optional(),
  })
  .passthrough();
