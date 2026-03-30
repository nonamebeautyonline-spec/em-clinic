// AI Tasks API用 Zodスキーマ

import { z } from "zod/v4";

// タスク一覧のクエリパラメータ
export const aiTaskListQuerySchema = z.object({
  workflow_type: z.string().optional(),
  status: z.string().optional(),
  tenant_id: z.string().uuid().optional(),
  subject_type: z.string().optional(),
  subject_id: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

// タスク手動作成
export const aiTaskCreateSchema = z.object({
  workflow_type: z.string().min(1),
  input: z.record(z.string(), z.unknown()),
  tenant_id: z.string().uuid().optional(),
  subject_id: z.string().optional(),
  subject_type: z.string().optional(),
});

// ポリシールール rule_type
const ruleTypeEnum = z.enum(["keyword", "category", "confidence", "escalation", "custom"]);

// ポリシールール作成
export const policyRuleCreateSchema = z.object({
  workflow_type: z.string().min(1),
  rule_name: z.string().min(1).max(200),
  rule_type: ruleTypeEnum,
  priority: z.number().int().min(0).max(10000).optional().default(100),
  conditions: z.record(z.string(), z.unknown()),
  action: z.record(z.string(), z.unknown()),
  is_active: z.boolean().optional().default(true),
  tenant_id: z.string().uuid().nullable().optional(),
});

// ポリシールール更新
export const policyRuleUpdateSchema = z.object({
  rule_name: z.string().min(1).max(200).optional(),
  rule_type: ruleTypeEnum.optional(),
  priority: z.number().int().min(0).max(10000).optional(),
  conditions: z.record(z.string(), z.unknown()).optional(),
  action: z.record(z.string(), z.unknown()).optional(),
  is_active: z.boolean().optional(),
});

// フィードバック作成
export const aiTaskFeedbackSchema = z.object({
  feedback_type: z.enum(["approve", "reject", "edit", "escalate"]),
  rating: z.number().int().min(1).max(5).optional(),
  comment: z.string().optional(),
  reject_category: z.string().optional(),
  corrected_output: z.record(z.string(), z.unknown()).optional(),
});
