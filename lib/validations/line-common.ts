// lib/validations/line-common.ts — LINE共通機能のZodスキーマ
import { z } from "zod";

/** タグ作成 POST /api/admin/tags */
export const createTagSchema = z
  .object({
    name: z.string().min(1, "タグ名は必須です").max(50),
    color: z.string().optional(),
    description: z.string().optional(),
    is_auto: z.boolean().optional(),
  })
  .passthrough();

/** タグ更新 PATCH /api/admin/tags/[id] */
export const updateTagSchema = z
  .object({
    name: z.string().min(1).max(50).optional(),
    color: z.string().optional(),
    description: z.string().optional(),
    is_auto: z.boolean().optional(),
  })
  .passthrough();

/** テンプレート作成 POST /api/admin/line/templates */
export const createTemplateSchema = z
  .object({
    name: z.string().min(1, "テンプレート名は必須です"),
    content: z.string().optional(),
    message_type: z.enum(["text", "image", "flex"]).optional(),
    category: z.string().optional(),
    flex_content: z.unknown().optional(),
  })
  .passthrough();

/** テンプレート更新 PUT /api/admin/line/templates/[id] */
export const updateTemplateSchema = z
  .object({
    name: z.string().optional(),
    content: z.string().optional(),
    message_type: z.enum(["text", "image", "flex"]).optional(),
    category: z.string().optional(),
    flex_content: z.unknown().optional(),
  })
  .passthrough();

/** リッチメニュー作成 POST /api/admin/line/rich-menus */
export const createRichMenuSchema = z
  .object({
    name: z.string().min(1, "メニュー名は必須です"),
    chat_bar_text: z.string().optional(),
    size_type: z.string().optional(),
    areas: z.array(z.record(z.string(), z.unknown())).optional(),
    selected: z.boolean().optional(),
    image_url: z.string().optional(),
  })
  .passthrough();

/** キーワード自動応答 POST/PUT /api/admin/line/keyword-replies */
export const keywordReplySchema = z
  .object({
    name: z.string().min(1, "ルール名は必須です"),
    keyword: z.string().min(1, "キーワードは必須です"),
    match_type: z.enum(["exact", "partial", "regex"]).optional(),
    priority: z.number().int().optional(),
    is_enabled: z.boolean().optional(),
    reply_type: z.enum(["text", "template", "action"]).optional(),
    reply_text: z.string().optional(),
    reply_template_id: z.union([z.number(), z.string()]).optional(),
    reply_action_id: z.union([z.number(), z.string()]).optional(),
    condition_rules: z.array(z.record(z.string(), z.unknown())).optional(),
  })
  .passthrough();

/** マーク作成 POST /api/admin/line/marks */
export const createMarkSchema = z
  .object({
    label: z.string().min(1, "マーク名は必須です"),
    color: z.string().optional(),
    icon: z.string().optional(),
  })
  .passthrough();

/** リマインダールール POST/PUT /api/admin/line/reminder-rules */
export const reminderRuleSchema = z
  .object({
    name: z.string().min(1, "ルール名は必須です"),
    timing_type: z.enum(["before_hours", "before_days", "fixed_time"]).optional(),
    timing_value: z.number().int().min(0).optional(),
    message_template: z.string().optional(),
    is_enabled: z.boolean().optional(),
    message_format: z.enum(["text", "flex"]).optional(),
    send_hour: z.number().int().min(0).max(23).optional(),
    send_minute: z.number().int().min(0).max(59).optional(),
    target_day_offset: z.number().int().optional(),
  })
  .passthrough();

/** フォーム作成 POST /api/admin/line/forms */
export const createFormSchema = z
  .object({
    name: z.string().min(1, "フォーム名は必須です"),
    folder_id: z.union([z.number(), z.string()]).optional(),
  })
  .passthrough();

/** ステップシナリオ POST/PUT /api/admin/line/step-scenarios */
export const stepScenarioSchema = z
  .object({
    name: z.string().min(1, "シナリオ名は必須です"),
    folder_id: z.union([z.number(), z.string()]).optional(),
    trigger_type: z.string().optional(),
    trigger_tag_id: z.union([z.number(), z.string()]).optional(),
    trigger_keyword: z.string().optional(),
    trigger_keyword_match: z.enum(["exact", "partial", "regex"]).optional(),
    condition_rules: z.array(z.record(z.string(), z.unknown())).optional(),
    is_enabled: z.boolean().optional(),
    steps: z.array(z.record(z.string(), z.unknown())).optional(),
  })
  .passthrough();

/** クーポン作成 POST /api/admin/line/coupons */
export const createCouponSchema = z
  .object({
    name: z.string().min(1, "クーポン名は必須です"),
    code: z.string().min(1, "クーポンコードは必須です"),
    discount_type: z.enum(["fixed", "percent"]).optional(),
    discount_value: z.number().min(1, "割引値は1以上を指定してください"),
    min_purchase: z.number().optional(),
    max_uses: z.number().int().optional(),
    max_uses_per_patient: z.number().int().optional(),
    valid_from: z.string().optional(),
    valid_until: z.string().optional(),
    description: z.string().optional(),
    is_active: z.boolean().optional(),
  })
  .passthrough();

/** 患者タグ一括操作 POST /api/admin/patients/bulk/tags */
export const bulkTagSchema = z
  .object({
    patient_ids: z.array(z.string()).min(1, "患者IDは1件以上必要です"),
    tag_id: z.union([z.number(), z.string()]),
    action: z.enum(["add", "remove"]),
  })
  .passthrough();

/** 患者マーク一括操作 POST /api/admin/patients/bulk/mark */
export const bulkMarkSchema = z
  .object({
    patient_ids: z.array(z.string()).min(1, "患者IDは1件以上必要です"),
    mark: z.string().min(1, "マークは必須です"),
  })
  .passthrough();

/** 患者一括送信 POST /api/admin/patients/bulk/send */
export const bulkSendSchema = z
  .object({
    patient_ids: z.array(z.string()).min(1, "患者IDは1件以上必要です"),
    template_id: z.union([z.number(), z.string()]),
  })
  .passthrough();

/** ワークフローステップ設定 */
const workflowStepSchema = z.object({
  sort_order: z.number().int().min(0).optional(),
  step_type: z.enum([
    "send_message",
    "add_tag",
    "remove_tag",
    "switch_richmenu",
    "wait",
    "condition",
    "webhook",
  ]),
  config: z.record(z.string(), z.unknown()).default({}),
});

/** ワークフロー作成 POST /api/admin/line/workflows */
export const createWorkflowSchema = z
  .object({
    name: z.string().min(1, "ワークフロー名は必須です"),
    description: z.string().optional(),
    trigger_type: z.enum([
      "reservation_completed",
      "payment_completed",
      "tag_added",
      "form_submitted",
      "scheduled",
      "manual",
    ]),
    trigger_config: z.record(z.string(), z.unknown()).optional(),
    status: z.enum(["draft", "active", "paused", "archived"]).optional(),
    steps: z.array(workflowStepSchema).optional(),
  })
  .passthrough();

/** ワークフロー更新 PUT /api/admin/line/workflows/[id] */
export const updateWorkflowSchema = z
  .object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    trigger_type: z
      .enum([
        "reservation_completed",
        "payment_completed",
        "tag_added",
        "form_submitted",
        "scheduled",
        "manual",
      ])
      .optional(),
    trigger_config: z.record(z.string(), z.unknown()).optional(),
    status: z.enum(["draft", "active", "paused", "archived"]).optional(),
    steps: z.array(workflowStepSchema).optional(),
  })
  .passthrough();
