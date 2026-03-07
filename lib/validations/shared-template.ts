// lib/validations/shared-template.ts — 共有テンプレートのZodスキーマ

import { z } from "zod";

/** 共有テンプレート作成スキーマ */
export const createSharedTemplateSchema = z.object({
  name: z.string().min(1, "名前は必須です").max(200, "名前は200文字以内です"),
  description: z.string().max(1000, "説明は1000文字以内です").optional().default(""),
  category: z.string().max(100, "カテゴリは100文字以内です").optional().default(""),
  content: z.record(z.string(), z.unknown()).default({}),
  template_type: z.enum(["message", "flex", "workflow"]).default("message"),
  tags: z.array(z.string().max(50)).max(20, "タグは最大20個です").optional().default([]),
  is_active: z.boolean().optional().default(true),
});

/** 共有テンプレート更新スキーマ（全フィールド任意） */
export const updateSharedTemplateSchema = z.object({
  name: z.string().min(1, "名前は必須です").max(200, "名前は200文字以内です").optional(),
  description: z.string().max(1000, "説明は1000文字以内です").optional(),
  category: z.string().max(100, "カテゴリは100文字以内です").optional(),
  content: z.record(z.string(), z.unknown()).optional(),
  template_type: z.enum(["message", "flex", "workflow"]).optional(),
  tags: z.array(z.string().max(50)).max(20, "タグは最大20個です").optional(),
  is_active: z.boolean().optional(),
});
