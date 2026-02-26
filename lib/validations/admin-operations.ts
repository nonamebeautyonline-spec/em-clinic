// lib/validations/admin-operations.ts — 管理者操作APIのZodスキーマ
import { z } from "zod";
import { strongPasswordSchema } from "@/lib/validations/password-policy";

/** Patient ID形式: 数字11桁 or LINE_仮ID */
const patientIdFormat = z.string()
  .min(1, "患者IDは必須です")
  .transform(v => v.trim())
  .pipe(z.string().regex(/^(\d{11}|LINE_[a-f0-9]+)$/, "PID形式が不正です（数字11桁 or LINE_xxx）"));

/** 患者マージ POST /api/admin/merge-patients */
export const mergePatientSchema = z
  .object({
    old_patient_id: patientIdFormat,
    new_patient_id: patientIdFormat,
    delete_new_intake: z.boolean().optional(),
  })
  .passthrough();

// ==========================================
// グループ1: 管理画面 — アカウント・基本設定
// ==========================================

/** パスワード変更 PUT /api/admin/account */
export const accountPasswordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "現在のパスワードは必須です"),
    newPassword: strongPasswordSchema,
  })
  .passthrough();

/** メールアドレス変更 PATCH /api/admin/account */
export const accountEmailChangeSchema = z
  .object({
    newEmail: z.string().email("有効なメールアドレスを入力してください"),
    password: z.string().min(1, "パスワードは必須です"),
  })
  .passthrough();

/** 既読マーク PUT /api/admin/chat-reads */
export const chatReadSchema = z
  .object({
    patient_id: z.string().min(1, "patient_idは必須です"),
  })
  .passthrough();

/** FLEX通知設定 PUT /api/admin/flex-settings */
export const flexSettingsSchema = z
  .object({
    config: z.record(z.string(), z.unknown()).refine((v) => v !== null && typeof v === "object", {
      message: "configは必須です",
    }),
  })
  .passthrough();

/** マイページ設定 PUT /api/admin/mypage-settings */
export const mypageSettingsSchema = z
  .object({
    config: z.record(z.string(), z.unknown()).refine((v) => v !== null && typeof v === "object", {
      message: "configは必須です",
    }),
  })
  .passthrough();

/** 配送設定 PUT /api/admin/shipping/config */
export const shippingConfigPutSchema = z
  .object({
    config: z.record(z.string(), z.unknown()).refine((v) => v !== null && typeof v === "object", {
      message: "configは必須です",
    }),
  })
  .passthrough();

/** キャッシュ無効化 POST /api/admin/invalidate-cache */
export const invalidateCacheSchema = z
  .object({
    patient_id: z.string().min(1, "patient_idは必須です").optional(),
    patientId: z.string().min(1).optional(),
  })
  .passthrough()
  .refine(
    (data) => !!(data.patient_id || data.patientId),
    { message: "patient_id は必須です" },
  );

// ==========================================
// グループ2: 管理画面 — 医者・カルテ
// ==========================================

/** 医師登録・更新 POST /api/admin/doctors */
export const doctorUpsertSchema = z
  .object({
    doctor_id: z.string().min(1, "doctor_idは必須です").optional(),
    doctor_name: z.string().min(1, "doctor_nameは必須です").optional(),
    is_active: z.boolean().optional(),
    sort_order: z.number().optional(),
    color: z.string().nullable().optional(),
    // doctor フィールドでラップされるパターンにも対応
    doctor: z
      .object({
        doctor_id: z.string().min(1, "doctor_idは必須です"),
        doctor_name: z.string().min(1, "doctor_nameは必須です"),
        is_active: z.boolean().optional(),
        sort_order: z.number().optional(),
        color: z.string().nullable().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

/** カルテ新規追加 POST /api/admin/karte */
export const karteCreateSchema = z
  .object({
    patientId: z.string().min(1, "patientIdは必須です"),
    note: z.string().min(1, "noteは必須です"),
  })
  .passthrough();

/** カルテメモ編集 POST /api/admin/karte-edit */
export const karteEditSchema = z
  .object({
    intakeId: z.union([z.string(), z.number()]).refine(
      (v) => v !== "" && v !== null && v !== undefined,
      { message: "intakeIdは必須です" },
    ),
    note: z.string().optional(),
  })
  .passthrough();

/** カルテロック POST /api/admin/karte-lock */
export const karteLockSchema = z
  .object({
    intakeId: z.union([z.string(), z.number()]).refine(
      (v) => v !== "" && v !== null && v !== undefined,
      { message: "intakeIdは必須です" },
    ),
    action: z.enum(["lock", "unlock"]).optional(),
  })
  .passthrough();

/** カルテテンプレート作成 POST /api/admin/karte-templates */
export const karteTemplateCreateSchema = z
  .object({
    name: z.string().min(1, "nameは必須です"),
    body: z.string().min(1, "bodyは必須です"),
    category: z.string().optional(),
    sort_order: z.number().optional(),
  })
  .passthrough();

/** カルテテンプレート更新 PUT /api/admin/karte-templates */
export const karteTemplateUpdateSchema = z
  .object({
    id: z.union([z.string(), z.number()]).refine(
      (v) => v !== "" && v !== null && v !== undefined,
      { message: "idは必須です" },
    ),
    name: z.string().optional(),
    body: z.string().optional(),
    category: z.string().optional(),
    sort_order: z.number().optional(),
    is_active: z.boolean().optional(),
  })
  .passthrough();

/** カルテ（doctor note）更新 POST /api/admin/patientnote */
export const patientNoteSchema = z
  .object({
    patientId: z.string().min(1, "patientIdは必須です"),
    note: z.string().optional().default(""),
    intakeId: z.union([z.string(), z.number()]).optional(),
  })
  .passthrough();

// ==========================================
// グループ3: 管理画面 — 患者データ管理
// ==========================================

/** 患者データ削除 POST /api/admin/delete-patient-data */
export const deletePatientDataSchema = z
  .object({
    patient_id: z.string().min(1, "patient_idは必須です"),
    delete_intake: z.boolean().optional(),
    delete_reservation: z.boolean().optional(),
  })
  .passthrough();

/** 患者名変更 POST /api/admin/patient-name-change */
export const patientNameChangeSchema = z
  .object({
    patient_id: z.string().min(1, "patient_idは必須です"),
    new_name: z.string().min(1, "new_nameは必須です"),
    new_name_kana: z.string().optional().default(""),
  })
  .passthrough();

/** 患者フィールド更新 PUT /api/admin/patients/[id]/fields */
export const patientFieldsUpdateSchema = z
  .object({
    values: z.array(
      z.object({
        field_id: z.number(),
        value: z.string(),
      }).passthrough(),
    ),
  })
  .passthrough();

/** 対応マーク更新 PUT /api/admin/patients/[id]/mark */
export const patientMarkUpdateSchema = z
  .object({
    mark: z.string().min(1, "markは必須です"),
    note: z.string().nullable().optional(),
  })
  .passthrough();

/** タグ付与 POST /api/admin/patients/[id]/tags */
export const patientTagAddSchema = z
  .object({
    tag_id: z.number({ message: "tag_idは必須です" }),
  })
  .passthrough();

/** 一括アクション POST /api/admin/patients/bulk/action */
export const bulkActionSchema = z
  .object({
    patient_ids: z.array(z.string()).min(1, "patient_idsは必須です"),
    action_id: z.union([z.string(), z.number()]).refine(
      (v) => v !== "" && v !== null && v !== undefined,
      { message: "action_idは必須です" },
    ),
  })
  .passthrough();

/** 一括フィールド更新 POST /api/admin/patients/bulk/fields */
export const bulkFieldsUpdateSchema = z
  .object({
    patient_ids: z.array(z.string()).min(1, "patient_idsは必須です"),
    field_id: z.union([z.string(), z.number()]).refine(
      (v) => v !== "" && v !== null && v !== undefined,
      { message: "field_idは必須です" },
    ),
    value: z.string().optional().default(""),
  })
  .passthrough();

/** ピン更新 PUT /api/admin/pins */
export const pinsUpdateSchema = z
  .object({
    pins: z.array(z.string()).optional().default([]),
  })
  .passthrough();

/** LINE UID更新 POST /api/admin/update-line-user-id */
export const updateLineUserIdSchema = z
  .object({
    patient_id: z.string().min(1).optional(),
    patientId: z.string().min(1).optional(),
    line_user_id: z.string(),
  })
  .passthrough()
  .refine(
    (data) => !!(data.patient_id || data.patientId),
    { message: "patient_id は必須です" },
  );

/** 注文住所更新 POST /api/admin/update-order-address */
export const updateOrderAddressSchema = z
  .object({
    orderId: z.string().min(1, "orderIdは必須です"),
    postalCode: z.string().optional().default(""),
    address: z.string().optional().default(""),
    shippingName: z.string().optional().default(""),
  })
  .passthrough();

// ==========================================
// グループ4: 医師専用API（doctor.tsに追加分）
// ==========================================

/** 再処方承認 POST /api/admin/reorders/approve（レガシー互換） */
export const adminReorderApproveSchema = z
  .object({
    id: z.union([z.string(), z.number()]),
  })
  .passthrough();

/** 再処方却下 POST /api/admin/reorders/reject（レガシー互換） */
export const adminReorderRejectSchema = z
  .object({
    id: z.union([z.string(), z.number()]),
    reason: z.string().optional(),
  })
  .passthrough();

/** 発送通知 POST /api/admin/shipping/notify-shipped */
export const notifyShippedSchema = z
  .object({
    orderId: z.string().min(1, "注文IDは必須です"),
    trackingNumber: z.string().optional(),
  })
  .passthrough();

// ==========================================
// グループ5: 銀行振込・商品・在庫・タグ・ユーザー・予約
// ==========================================

/** 銀行振込手動確認 POST /api/admin/bank-transfer/manual-confirm */
export const bankTransferManualConfirmSchema = z
  .object({
    order_id: z.string().min(1, "order_idは必須です"),
    memo: z.string().optional(),
  })
  .passthrough();

/** 銀行振込照合確定 POST /api/admin/bank-transfer/reconcile/confirm */
export const bankTransferReconcileConfirmSchema = z
  .object({
    matches: z
      .array(
        z.object({
          transfer: z.object({
            date: z.string(),
            description: z.string(),
            amount: z.number(),
          }).passthrough(),
          order: z.object({
            patient_id: z.string(),
            product_code: z.string(),
            amount: z.number(),
          }).passthrough(),
        }).passthrough()
      )
      .min(1, "照合データは1件以上必要です"),
  })
  .passthrough();

/** 商品作成 POST /api/admin/products */
export const productCreateSchema = z
  .object({
    code: z.string().min(1, "商品コードは必須です"),
    title: z.string().min(1, "タイトルは必須です"),
    price: z.number({ message: "priceは数値で指定してください" }),
    drug_name: z.string().optional(),
    dosage: z.string().nullable().optional(),
    duration_months: z.number().nullable().optional(),
    quantity: z.number().nullable().optional(),
    category: z.string().optional(),
    sort_order: z.number().optional(),
    image_url: z.string().nullable().optional(),
    stock_quantity: z.number().nullable().optional(),
    discount_price: z.number().nullable().optional(),
    discount_until: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    parent_id: z.string().nullable().optional(),
  })
  .passthrough();

/** 商品更新 PUT /api/admin/products */
export const productUpdateSchema = z
  .object({
    id: z.union([z.string(), z.number()]).transform(String),
  })
  .passthrough();

/** 在庫記録 POST /api/admin/inventory */
export const inventorySchema = z
  .object({
    date: z.string().min(1, "日付は必須です"),
    entries: z
      .array(
        z.object({
          item_key: z.string(),
          section: z.string().optional(),
          location: z.string(),
          product_id: z.string().optional(),
          box_count: z.number(),
          shipped_count: z.number().optional(),
          received_count: z.number().optional(),
          note: z.string().optional(),
        }).passthrough()
      )
      .min(1, "entriesは1件以上必要です"),
  })
  .passthrough();

/** タグ作成 POST /api/admin/tags */
export const tagCreateSchema = z
  .object({
    name: z.string().min(1, "タグ名は必須です"),
    color: z.string().optional(),
    description: z.string().nullable().optional(),
    is_auto: z.boolean().optional(),
    auto_rule: z.any().optional(),
  })
  .passthrough();

/** タグ更新 PUT /api/admin/tags/[id] */
export const tagUpdateSchema = z
  .object({
    name: z.string().optional(),
    color: z.string().optional(),
    description: z.string().nullable().optional(),
  })
  .passthrough();

/** 管理者ユーザー作成 POST /api/admin/users */
export const createAdminUserSchema = z
  .object({
    email: z.string().email("有効なメールアドレスを入力してください"),
    name: z.string().min(1, "名前は必須です"),
  })
  .passthrough();

/** 予約ルール POST /api/admin/weekly_rules */
export const weeklyRulesSchema = z
  .object({
    doctor_id: z.string().min(1, "doctor_idは必須です"),
    rules: z.array(
      z.object({
        weekday: z.union([z.string(), z.number()]),
        enabled: z.boolean().optional(),
        start_time: z.string().nullable().optional(),
        end_time: z.string().nullable().optional(),
        slot_minutes: z.union([z.string(), z.number()]).optional(),
        capacity: z.union([z.string(), z.number()]).optional(),
      }).passthrough()
    ),
  })
  .passthrough();

/** 予約開放 POST /api/admin/booking-open */
export const bookingOpenSchema = z
  .object({
    month: z.string().regex(/^\d{4}-\d{2}$/, "YYYY-MM形式で指定してください"),
    memo: z.string().optional(),
  })
  .passthrough();

/** 友達情報欄作成 POST /api/admin/friend-fields */
export const friendFieldCreateSchema = z
  .object({
    name: z.string().min(1, "名前は必須です"),
    field_type: z.string().optional(),
    options: z.any().optional(),
    sort_order: z.number().optional(),
  })
  .passthrough();

/** 友達情報欄更新 PUT /api/admin/friend-fields/[id] */
export const friendFieldUpdateSchema = z
  .object({
    name: z.string().optional(),
    field_type: z.string().optional(),
    options: z.any().optional(),
    sort_order: z.number().optional(),
  })
  .passthrough();

/** リマインダーCSV POST /api/admin/reservations/reminder-csv */
export const reminderCsvSchema = z
  .object({
    reminders: z
      .array(
        z.object({
          lstep_id: z.string(),
          patient_id: z.string(),
          patient_name: z.string(),
          reserved_time: z.string(),
          phone: z.string(),
          message: z.string(),
          doctor_status: z.string(),
          call_status: z.string(),
          prescription_menu: z.string(),
        }).passthrough()
      )
      .min(1, "リマインドデータは1件以上必要です"),
    date: z.string().min(1, "日付は必須です"),
  })
  .passthrough();

/** リマインダープレビュー POST /api/admin/reservations/reminder-preview */
export const reminderPreviewSchema = z
  .object({
    date: z.string().min(1, "日付は必須です"),
  })
  .passthrough();

/** リマインダー送信 POST /api/admin/reservations/send-reminder */
export const sendReminderSchema = z
  .object({
    date: z.string().min(1, "日付は必須です"),
    testOnly: z.boolean().optional(),
    patient_ids: z.array(z.string()).optional(),
    idempotencyKey: z.string().optional(),
  })
  .passthrough();

/** 月次経理データ保存 POST /api/admin/financials */
export const financialsSchema = z
  .object({
    year_month: z.string().regex(/^\d{4}-\d{2}$/, "YYYY-MM形式で指定してください"),
  })
  .passthrough();

/** 日付オーバーライド POST /api/admin/date_override */
export const dateOverridePostSchema = z
  .object({
    doctor_id: z.string().optional(),
    date: z.string().optional(),
    type: z.string().optional(),
    slot_name: z.string().nullable().optional(),
    start_time: z.string().nullable().optional(),
    end_time: z.string().nullable().optional(),
    slot_minutes: z.union([z.string(), z.number()]).nullable().optional(),
    capacity: z.union([z.string(), z.number()]).nullable().optional(),
    memo: z.string().nullable().optional(),
    // overrideプロパティ経由でラップされる場合もある
    override: z.object({
      doctor_id: z.string(),
      date: z.string(),
      type: z.string().optional(),
      slot_name: z.string().nullable().optional(),
      start_time: z.string().nullable().optional(),
      end_time: z.string().nullable().optional(),
      slot_minutes: z.union([z.string(), z.number()]).nullable().optional(),
      capacity: z.union([z.string(), z.number()]).nullable().optional(),
      memo: z.string().nullable().optional(),
    }).passthrough().optional(),
  })
  .passthrough();

/** 日付オーバーライド DELETE /api/admin/date_override */
export const dateOverrideDeleteSchema = z
  .object({
    doctor_id: z.string().min(1, "doctor_idは必須です"),
    date: z.string().min(1, "dateは必須です"),
    slot_name: z.string().nullable().optional(),
    delete_all: z.boolean().optional(),
  })
  .passthrough();

/** パスワードリセットリクエスト POST /api/admin/password-reset/request */
export const adminPasswordResetRequestSchema = z
  .object({
    email: z.string().min(1, "メールアドレスは必須です"),
  })
  .passthrough();

/** パスワードリセット確認 POST /api/admin/password-reset/confirm */
export const adminPasswordResetConfirmSchema = z
  .object({
    token: z.string().min(1, "トークンは必須です"),
    password: strongPasswordSchema,
  })
  .passthrough();

/** リッチメニュー一括割当 POST /api/admin/patients/bulk/menu */
export const bulkMenuSchema = z
  .object({
    patient_ids: z.array(z.string()).min(1, "患者IDは1件以上必要です"),
    rich_menu_id: z.union([z.number(), z.string()]),
  })
  .passthrough();

/** テナント設定更新 PUT /api/admin/settings */
export const settingsUpdateSchema = z
  .object({
    category: z.string().min(1, "カテゴリは必須です"),
    key: z.string().min(1, "キーは必須です"),
    value: z.string(),
  })
  .passthrough();
