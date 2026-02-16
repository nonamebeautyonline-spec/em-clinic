// lib/validations/intake-form.ts — 問診フォーム定義のZodバリデーション
import { z } from "zod";

const IntakeFieldOptionSchema = z.object({
  label: z.string().min(1, "選択肢ラベルは必須です"),
  value: z.string().min(1, "選択肢の値は必須です"),
});

const IntakeConditionalSchema = z.object({
  when: z.string().min(1),
  value: z.string().min(1),
});

const IntakeFormFieldSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["text", "textarea", "radio", "dropdown", "checkbox", "heading"]),
  label: z.string().min(1, "項目名は必須です"),
  description: z.string().optional(),
  placeholder: z.string().optional(),
  required: z.boolean(),
  options: z.array(IntakeFieldOptionSchema).optional(),
  sort_order: z.number().int().min(0),
  conditional: IntakeConditionalSchema.optional(),
  ng_block: z.boolean().optional(),
  ng_block_value: z.string().optional(),
  ng_block_message: z.string().optional(),
});

const IntakeFormSettingsSchema = z.object({
  step_by_step: z.boolean(),
  header_title: z.string().min(1, "ヘッダータイトルは必須です"),
  estimated_time: z.string().optional(),
  ng_block_title: z.string().optional(),
  ng_block_message: z.string().optional(),
});

export const IntakeFormUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  fields: z.array(IntakeFormFieldSchema),
  settings: IntakeFormSettingsSchema,
});
