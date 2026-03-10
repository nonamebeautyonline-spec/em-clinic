// lib/validations/followup.ts — フォローアップルール Zodスキーマ
import { z } from "zod";

export const TRIGGER_EVENTS = [
  { value: "payment_completed", label: "決済完了後" },
  { value: "reservation_completed", label: "来院完了後" },
] as const;

export const createFollowupRuleSchema = z.object({
  name: z.string().min(1, "名前は必須です"),
  trigger_event: z.enum(["payment_completed", "reservation_completed"]).default("payment_completed"),
  delay_days: z.number().int().min(0).default(0),
  delay_hours: z.number().int().min(0).optional().nullable(),
  message_template: z.string().min(1, "メッセージテンプレートは必須です"),
  flex_json: z.record(z.string(), z.unknown()).optional().nullable(),
  is_enabled: z.boolean().optional().default(true),
}).passthrough().refine(
  (data) => (data.delay_days ?? 0) > 0 || (data.delay_hours ?? 0) > 0,
  { message: "送信タイミング（日数または時間）を指定してください", path: ["delay_days"] },
);

export const updateFollowupRuleSchema = z.object({
  name: z.string().min(1, "名前は必須です").optional(),
  trigger_event: z.enum(["payment_completed", "reservation_completed"]).optional(),
  delay_days: z.number().int().min(0).optional(),
  delay_hours: z.number().int().min(0).optional().nullable(),
  message_template: z.string().min(1, "メッセージテンプレートは必須です").optional(),
  flex_json: z.record(z.string(), z.unknown()).optional().nullable(),
  is_enabled: z.boolean().optional(),
}).passthrough();
