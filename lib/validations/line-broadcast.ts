// lib/validations/line-broadcast.ts — LINE配信関連APIのZodスキーマ
import { z } from "zod";

/** 一斉配信 POST /api/admin/line/broadcast */
export const broadcastSchema = z
  .object({
    name: z.string().optional(),
    message: z.string().min(1, "メッセージは必須です"),
    filter_rules: z.record(z.string(), z.unknown()).optional(),
    scheduled_at: z.string().optional().nullable(),
  })
  .passthrough();

/** 配信プレビュー POST /api/admin/line/broadcast/preview */
export const broadcastPreviewSchema = z
  .object({
    filter_rules: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

/** A/Bテスト配信 POST /api/admin/line/broadcast/ab-test */
export const abTestSchema = z
  .object({
    name: z.string().optional(),
    variants: z.array(z.record(z.string(), z.unknown())).min(2, "2つ以上のバリエーションが必要です"),
    filter_rules: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

/** 個別メッセージ送信 POST /api/admin/line/send */
export const lineSendSchema = z
  .object({
    patient_id: z.string().min(1, "患者IDは必須です"),
    message: z.string().optional(),
    message_type: z.string().optional(),
    flex: z.unknown().optional(),
    template_name: z.string().optional(),
  })
  .passthrough();

/** セグメント保存 POST /api/admin/line/segments */
export const saveSegmentSchema = z
  .object({
    name: z.string().min(1, "セグメント名は必須です"),
    includeConditions: z.array(z.record(z.string(), z.unknown())).optional(),
    excludeConditions: z.array(z.record(z.string(), z.unknown())).optional(),
  })
  .passthrough();
