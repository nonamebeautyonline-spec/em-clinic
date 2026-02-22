// lib/validations/line-management.ts — LINE管理機能APIのZodスキーマ
import { z } from "zod";

// ─── フォルダ共通（action-folders, form-folders, media-folders）─────

/** フォルダ作成 POST */
export const createFolderSchema = z
  .object({
    name: z.string().min(1, "フォルダ名は必須です"),
  })
  .passthrough();

/** フォルダ名変更 PUT */
export const updateFolderSchema = z
  .object({
    id: z.union([z.number(), z.string()]),
    name: z.string().min(1, "フォルダ名は必須です"),
  })
  .passthrough();

// ─── アクション（actions）───────────────────────

/** アクション作成 POST /api/admin/line/actions */
export const createActionSchema = z
  .object({
    name: z.string().min(1, "アクション名は必須です"),
    folder_id: z.union([z.number(), z.string(), z.null()]).optional(),
    steps: z.array(z.record(z.string(), z.unknown())).min(1, "少なくとも1つの動作を設定してください"),
    repeat_enabled: z.boolean().optional(),
  })
  .passthrough();

/** アクション更新 PUT /api/admin/line/actions */
export const updateActionSchema = z
  .object({
    id: z.union([z.number(), z.string()]),
    name: z.string().min(1, "アクション名は必須です"),
    folder_id: z.union([z.number(), z.string(), z.null()]).optional(),
    steps: z.array(z.record(z.string(), z.unknown())).optional(),
    repeat_enabled: z.boolean().optional(),
  })
  .passthrough();

/** アクション実行 POST /api/admin/line/actions/execute */
export const executeActionSchema = z
  .object({
    action_id: z.union([z.number(), z.string()]),
    patient_id: z.string().min(1, "患者IDは必須です"),
  })
  .passthrough();

// ─── AI返信設定 ───────────────────────────

/** AI返信設定更新 PUT /api/admin/line/ai-reply-settings */
export const updateAiReplySettingsSchema = z
  .object({
    is_enabled: z.boolean().optional(),
    mode: z.string().optional(),
    knowledge_base: z.string().optional(),
    custom_instructions: z.string().optional(),
    min_message_length: z.number().int().optional(),
    daily_limit: z.number().int().optional(),
    approval_timeout_hours: z.number().int().optional(),
  })
  .passthrough();

// ─── クリック計測 ──────────────────────────

/** クリック計測リンク作成 POST /api/admin/line/click-track */
export const createClickTrackSchema = z
  .object({
    original_url: z.string().min(1, "URLは必須です"),
    label: z.string().optional(),
    broadcast_id: z.union([z.number(), z.string(), z.null()]).optional(),
  })
  .passthrough();

// ─── カラム設定 ──────────────────────────

/** カラム設定更新 PUT /api/admin/line/column-settings */
export const updateColumnSettingsSchema = z
  .object({
    sections: z.record(z.string(), z.boolean()),
  })
  .passthrough();

// ─── クーポン配布 ─────────────────────────

/** クーポン配布 POST /api/admin/line/coupons/[id]/distribute */
export const distributeCouponSchema = z
  .object({
    filter_rules: z.record(z.string(), z.unknown()).optional(),
    message: z.string().optional(),
  })
  .passthrough();

// ─── フォーム公開切替 ─────────────────────────

/** フォーム公開切替 POST /api/admin/line/forms/[id]/publish */
export const publishFormSchema = z
  .object({
    is_published: z.boolean().optional(),
  })
  .passthrough();

/** フォーム更新 PUT /api/admin/line/forms/[id] */
export const updateFormSchema = z
  .object({
    name: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    folder_id: z.union([z.number(), z.string(), z.null()]).optional(),
    fields: z.array(z.record(z.string(), z.unknown())).optional(),
    settings: z.record(z.string(), z.unknown()).optional(),
    is_published: z.boolean().optional(),
  })
  .passthrough();

// ─── 友達追加時設定 ─────────────────────────

/** 友達追加時設定更新 PUT /api/admin/line/friend-settings */
export const updateFriendSettingsSchema = z
  .object({
    setting_key: z.string().min(1, "setting_keyは必須です"),
    setting_value: z.unknown().optional(),
    enabled: z.boolean().optional(),
  })
  .passthrough();

// ─── キーワード応答テスト ───────────────────────

/** キーワードマッチテスト POST /api/admin/line/keyword-replies/test */
export const keywordTestSchema = z
  .object({
    text: z.string().min(1, "テスト文字列は必須です"),
  })
  .passthrough();

// ─── メディア ────────────────────────────

/** メディア更新 PUT /api/admin/line/media */
export const updateMediaSchema = z
  .object({
    id: z.union([z.number(), z.string()]),
    name: z.string().optional(),
    folder_id: z.union([z.number(), z.string(), z.null()]).optional(),
  })
  .passthrough();

// ─── メニュー自動切替ルール ──────────────────────

/** メニュールール作成・更新 POST /api/admin/line/menu-rules */
export const menuRuleSchema = z
  .object({
    rule: z.object({
      id: z.string().optional(),
      name: z.string().min(1, "名前は必須です"),
      enabled: z.boolean().optional(),
      conditions: z.array(z.record(z.string(), z.unknown())).optional(),
      conditionOperator: z.string().optional(),
      target_menu_id: z.string().min(1, "対象メニューは必須です"),
      priority: z.number().int().optional(),
    }).passthrough(),
  })
  .passthrough();

// ─── NPS調査 ────────────────────────────

/** NPS調査作成 POST /api/admin/line/nps */
export const createNpsSchema = z
  .object({
    title: z.string().min(1, "タイトルは必須です"),
    question_text: z.string().optional(),
    comment_label: z.string().optional(),
    thank_you_message: z.string().optional(),
    auto_send_after: z.string().optional().nullable(),
    auto_send_delay_hours: z.number().int().optional(),
  })
  .passthrough();

/** NPS調査更新 PUT /api/admin/line/nps */
export const updateNpsSchema = z
  .object({
    id: z.union([z.number(), z.string()]),
    title: z.string().optional(),
    question_text: z.string().optional(),
    comment_label: z.string().optional(),
    thank_you_message: z.string().optional(),
    is_active: z.boolean().optional(),
    auto_send_after: z.string().optional().nullable(),
    auto_send_delay_hours: z.number().int().optional(),
  })
  .passthrough();

/** NPS調査配信 POST /api/admin/line/nps/[id]/distribute */
export const distributeNpsSchema = z
  .object({
    filter_rules: z.record(z.string(), z.unknown()).optional(),
    message: z.string().optional(),
  })
  .passthrough();

// ─── プロフィール更新 ─────────────────────────

/** LINEプロフィール更新 POST /api/admin/line/refresh-profile */
export const refreshProfileSchema = z
  .object({
    patient_id: z.string().min(1, "patient_idは必須です"),
  })
  .passthrough();

// ─── リッチメニュー ──────────────────────────

/** リッチメニュー更新 PUT /api/admin/line/rich-menus/[id] */
export const updateRichMenuSchema = z
  .object({
    name: z.string().optional(),
    chat_bar_text: z.string().optional(),
    size_type: z.string().optional(),
    areas: z.array(z.record(z.string(), z.unknown())).optional(),
    selected: z.boolean().optional(),
    image_url: z.string().optional(),
  })
  .passthrough();

// ─── 予約送信 ────────────────────────────

/** 予約送信登録 POST /api/admin/line/schedule */
export const createScheduleSchema = z
  .object({
    patient_id: z.string().min(1, "patient_idは必須です"),
    message: z.string().min(1, "メッセージは必須です"),
    scheduled_at: z.string().min(1, "scheduled_atは必須です"),
  })
  .passthrough();

// ─── ステップシナリオ登録者 ──────────────────────

/** ステップシナリオ手動登録 POST /api/admin/line/step-scenarios/[id]/enrollments */
export const enrollStepSchema = z
  .object({
    patient_ids: z.array(z.string()).min(1, "patient_idsは1件以上必要です"),
  })
  .passthrough();

// ─── テンプレートカテゴリ ─────────────────────

/** テンプレートカテゴリ作成 POST /api/admin/line/template-categories */
export const createTemplateCategorySchema = z
  .object({
    name: z.string().min(1, "フォルダ名は必須です"),
  })
  .passthrough();

// ─── ユーザーリッチメニュー割当 ──────────────────

/** ユーザーリッチメニュー割当 POST /api/admin/line/user-richmenu */
export const assignUserRichMenuSchema = z
  .object({
    patient_id: z.string().min(1, "patient_idは必須です"),
    rich_menu_id: z.union([z.number(), z.string()]),
  })
  .passthrough();
