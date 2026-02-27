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

/** ABテストバリアントのスキーマ */
const abTestVariantSchema = z.object({
  name: z.string().min(1, "バリアント名は必須です"),
  template_id: z.string().uuid().optional().nullable(),
  message_content: z.string().optional().nullable(),
  message_type: z.string().default("text"),
  allocation_ratio: z.number().min(1).max(99).default(50),
});

/** ABテスト管理 POST /api/admin/line/ab-test */
export const createAbTestSchema = z
  .object({
    name: z.string().min(1, "テスト名は必須です"),
    target_segment: z.string().optional().nullable(),
    winner_criteria: z.enum(["open_rate", "click_rate", "conversion_rate"]).default("open_rate"),
    auto_select_winner: z.boolean().default(true),
    min_sample_size: z.number().min(1).default(100),
    variants: z.array(abTestVariantSchema).min(2, "2つ以上のバリアントが必要です"),
  })
  .passthrough();

/** ABテスト更新 PUT /api/admin/line/ab-test/[id] */
export const updateAbTestSchema = z
  .object({
    name: z.string().optional(),
    status: z.enum(["draft", "running", "completed", "cancelled"]).optional(),
    winner_variant_id: z.string().uuid().optional().nullable(),
    winner_criteria: z.enum(["open_rate", "click_rate", "conversion_rate"]).optional(),
    auto_select_winner: z.boolean().optional(),
    min_sample_size: z.number().min(1).optional(),
    target_count: z.number().optional(),
    variants: z.array(abTestVariantSchema.partial().extend({
      id: z.string().uuid().optional(),
    })).optional(),
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
