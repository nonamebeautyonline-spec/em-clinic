// lib/validations/followup.ts — フォローアップルール Zodスキーマ
import { z } from "zod";

export const createFollowupRuleSchema = z.object({
  name: z.string().min(1, "名前は必須です"),
  trigger_event: z.string().default("payment_completed"),
  delay_days: z.number().int().min(1, "1日以上を指定してください"),
  message_template: z.string().min(1, "メッセージテンプレートは必須です"),
  flex_json: z.record(z.string(), z.unknown()).optional().nullable(),
  is_enabled: z.boolean().optional().default(true),
}).passthrough();

export const updateFollowupRuleSchema = createFollowupRuleSchema.partial().passthrough();
