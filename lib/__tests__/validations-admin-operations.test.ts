// lib/__tests__/validations-admin-operations.test.ts
// 管理者操作APIのZodスキーマバリデーションテスト
import {
  mergePatientSchema,
  accountPasswordChangeSchema,
  accountEmailChangeSchema,
  chatReadSchema,
  flexSettingsSchema,
  mypageSettingsSchema,
  shippingConfigPutSchema,
  invalidateCacheSchema,
  doctorUpsertSchema,
  karteCreateSchema,
  karteEditSchema,
  karteLockSchema,
  karteTemplateCreateSchema,
  karteTemplateUpdateSchema,
  patientNoteSchema,
  deletePatientDataSchema,
  patientNameChangeSchema,
  patientFieldsUpdateSchema,
  patientMarkUpdateSchema,
  patientTagAddSchema,
  bulkActionSchema,
  bulkFieldsUpdateSchema,
  pinsUpdateSchema,
  updateLineUserIdSchema,
  updateOrderAddressSchema,
  adminReorderApproveSchema,
  adminReorderRejectSchema,
  notifyShippedSchema,
  bankTransferManualConfirmSchema,
  bankTransferReconcileConfirmSchema,
  productCreateSchema,
  productUpdateSchema,
  inventorySchema,
  tagCreateSchema,
  tagUpdateSchema,
  createAdminUserSchema,
  weeklyRulesSchema,
  bookingOpenSchema,
  friendFieldCreateSchema,
  friendFieldUpdateSchema,
  reminderCsvSchema,
  reminderPreviewSchema,
  sendReminderSchema,
  financialsSchema,
  dateOverridePostSchema,
  dateOverrideDeleteSchema,
  adminPasswordResetRequestSchema,
  adminPasswordResetConfirmSchema,
  bulkMenuSchema,
  settingsUpdateSchema,
} from "@/lib/validations/admin-operations";

// ==========================================
// 患者マージ
// ==========================================
describe("mergePatientSchema", () => {
  it("正常値でparse成功", () => {
    const result = mergePatientSchema.safeParse({
      old_patient_id: "p_001",
      new_patient_id: "p_002",
    });
    expect(result.success).toBe(true);
  });

  it("old_patient_id 欠損で失敗", () => {
    const result = mergePatientSchema.safeParse({ new_patient_id: "p_002" });
    expect(result.success).toBe(false);
  });

  it("passthrough で追加フィールドが許容される", () => {
    const result = mergePatientSchema.safeParse({
      old_patient_id: "p_001",
      new_patient_id: "p_002",
      extra_field: "test",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as any).extra_field).toBe("test");
    }
  });

  it("delete_new_intake は省略可能", () => {
    const result = mergePatientSchema.safeParse({
      old_patient_id: "p_001",
      new_patient_id: "p_002",
      delete_new_intake: true,
    });
    expect(result.success).toBe(true);
  });
});

// ==========================================
// パスワード変更
// ==========================================
describe("accountPasswordChangeSchema", () => {
  it("正常値でparse成功", () => {
    const result = accountPasswordChangeSchema.safeParse({
      currentPassword: "oldpass",
      newPassword: "NewPass123!",
    });
    expect(result.success).toBe(true);
  });

  it("newPassword が8文字未満で失敗", () => {
    const result = accountPasswordChangeSchema.safeParse({
      currentPassword: "oldpass",
      newPassword: "short",
    });
    expect(result.success).toBe(false);
  });

  it("currentPassword 欠損で失敗", () => {
    const result = accountPasswordChangeSchema.safeParse({
      newPassword: "NewPass123!",
    });
    expect(result.success).toBe(false);
  });
});

// ==========================================
// メールアドレス変更
// ==========================================
describe("accountEmailChangeSchema", () => {
  it("正常値でparse成功", () => {
    const result = accountEmailChangeSchema.safeParse({
      newEmail: "test@example.com",
      password: "mypassword",
    });
    expect(result.success).toBe(true);
  });

  it("無効なメールアドレスで失敗", () => {
    const result = accountEmailChangeSchema.safeParse({
      newEmail: "invalid-email",
      password: "mypassword",
    });
    expect(result.success).toBe(false);
  });

  it("password 欠損で失敗", () => {
    const result = accountEmailChangeSchema.safeParse({
      newEmail: "test@example.com",
    });
    expect(result.success).toBe(false);
  });
});

// ==========================================
// 既読マーク
// ==========================================
describe("chatReadSchema", () => {
  it("正常値でparse成功", () => {
    const result = chatReadSchema.safeParse({ patient_id: "p_001" });
    expect(result.success).toBe(true);
  });

  it("patient_id 空文字で失敗", () => {
    const result = chatReadSchema.safeParse({ patient_id: "" });
    expect(result.success).toBe(false);
  });
});

// ==========================================
// FLEX通知設定
// ==========================================
describe("flexSettingsSchema", () => {
  it("正常値でparse成功", () => {
    const result = flexSettingsSchema.safeParse({
      config: { key1: "value1" },
    });
    expect(result.success).toBe(true);
  });

  it("config 欠損で失敗", () => {
    const result = flexSettingsSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

// ==========================================
// マイページ設定
// ==========================================
describe("mypageSettingsSchema", () => {
  it("正常値でparse成功", () => {
    const result = mypageSettingsSchema.safeParse({
      config: { showReservation: true },
    });
    expect(result.success).toBe(true);
  });
});

// ==========================================
// 配送設定
// ==========================================
describe("shippingConfigPutSchema", () => {
  it("正常値でparse成功", () => {
    const result = shippingConfigPutSchema.safeParse({
      config: { provider: "yamato" },
    });
    expect(result.success).toBe(true);
  });
});

// ==========================================
// キャッシュ無効化
// ==========================================
describe("invalidateCacheSchema", () => {
  it("patient_id で成功", () => {
    const result = invalidateCacheSchema.safeParse({ patient_id: "p_001" });
    expect(result.success).toBe(true);
  });

  it("patientId で成功", () => {
    const result = invalidateCacheSchema.safeParse({ patientId: "p_001" });
    expect(result.success).toBe(true);
  });

  it("両方欠損で失敗（refine）", () => {
    const result = invalidateCacheSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

// ==========================================
// 医師登録・更新
// ==========================================
describe("doctorUpsertSchema", () => {
  it("フラットな形式で成功", () => {
    const result = doctorUpsertSchema.safeParse({
      doctor_id: "dr_001",
      doctor_name: "田中太郎",
    });
    expect(result.success).toBe(true);
  });

  it("doctor ラップ形式で成功", () => {
    const result = doctorUpsertSchema.safeParse({
      doctor: {
        doctor_id: "dr_001",
        doctor_name: "田中太郎",
      },
    });
    expect(result.success).toBe(true);
  });

  it("passthrough で追加フィールドが許容される", () => {
    const result = doctorUpsertSchema.safeParse({
      doctor_id: "dr_001",
      doctor_name: "田中",
      memo: "備考",
    });
    expect(result.success).toBe(true);
  });
});

// ==========================================
// カルテ新規追加
// ==========================================
describe("karteCreateSchema", () => {
  it("正常値でparse成功", () => {
    const result = karteCreateSchema.safeParse({
      patientId: "p_001",
      note: "初回カルテ",
    });
    expect(result.success).toBe(true);
  });

  it("patientId 空文字で失敗", () => {
    const result = karteCreateSchema.safeParse({
      patientId: "",
      note: "カルテ",
    });
    expect(result.success).toBe(false);
  });

  it("note 欠損で失敗", () => {
    const result = karteCreateSchema.safeParse({ patientId: "p_001" });
    expect(result.success).toBe(false);
  });
});

// ==========================================
// カルテメモ編集
// ==========================================
describe("karteEditSchema", () => {
  it("intakeId が文字列で成功", () => {
    const result = karteEditSchema.safeParse({ intakeId: "123" });
    expect(result.success).toBe(true);
  });

  it("intakeId が数値で成功", () => {
    const result = karteEditSchema.safeParse({ intakeId: 123, note: "メモ" });
    expect(result.success).toBe(true);
  });

  it("intakeId 空文字で失敗（refine）", () => {
    const result = karteEditSchema.safeParse({ intakeId: "" });
    expect(result.success).toBe(false);
  });
});

// ==========================================
// カルテロック
// ==========================================
describe("karteLockSchema", () => {
  it("正常値でparse成功", () => {
    const result = karteLockSchema.safeParse({ intakeId: 1, action: "lock" });
    expect(result.success).toBe(true);
  });

  it("action が 'unlock' で成功", () => {
    const result = karteLockSchema.safeParse({
      intakeId: "1",
      action: "unlock",
    });
    expect(result.success).toBe(true);
  });

  it("action に無効な値で失敗", () => {
    const result = karteLockSchema.safeParse({
      intakeId: 1,
      action: "invalid",
    });
    expect(result.success).toBe(false);
  });
});

// ==========================================
// カルテテンプレート作成
// ==========================================
describe("karteTemplateCreateSchema", () => {
  it("正常値でparse成功", () => {
    const result = karteTemplateCreateSchema.safeParse({
      name: "テンプレA",
      body: "テンプレ内容",
    });
    expect(result.success).toBe(true);
  });

  it("name 空文字で失敗", () => {
    const result = karteTemplateCreateSchema.safeParse({
      name: "",
      body: "内容",
    });
    expect(result.success).toBe(false);
  });
});

// ==========================================
// カルテテンプレート更新
// ==========================================
describe("karteTemplateUpdateSchema", () => {
  it("id が文字列で成功", () => {
    const result = karteTemplateUpdateSchema.safeParse({ id: "1" });
    expect(result.success).toBe(true);
  });

  it("id が数値で成功", () => {
    const result = karteTemplateUpdateSchema.safeParse({
      id: 1,
      name: "更新名",
    });
    expect(result.success).toBe(true);
  });

  it("id 空文字で失敗（refine）", () => {
    const result = karteTemplateUpdateSchema.safeParse({ id: "" });
    expect(result.success).toBe(false);
  });
});

// ==========================================
// カルテ（doctor note）更新
// ==========================================
describe("patientNoteSchema", () => {
  it("正常値でparse成功", () => {
    const result = patientNoteSchema.safeParse({
      patientId: "p_001",
      note: "メモ内容",
    });
    expect(result.success).toBe(true);
  });

  it("note 省略時はデフォルト空文字", () => {
    const result = patientNoteSchema.safeParse({ patientId: "p_001" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.note).toBe("");
    }
  });
});

// ==========================================
// 患者データ削除
// ==========================================
describe("deletePatientDataSchema", () => {
  it("正常値でparse成功", () => {
    const result = deletePatientDataSchema.safeParse({
      patient_id: "p_001",
    });
    expect(result.success).toBe(true);
  });

  it("patient_id 空文字で失敗", () => {
    const result = deletePatientDataSchema.safeParse({ patient_id: "" });
    expect(result.success).toBe(false);
  });
});

// ==========================================
// 患者名変更
// ==========================================
describe("patientNameChangeSchema", () => {
  it("正常値でparse成功", () => {
    const result = patientNameChangeSchema.safeParse({
      patient_id: "p_001",
      new_name: "田中太郎",
    });
    expect(result.success).toBe(true);
  });

  it("new_name 空文字で失敗", () => {
    const result = patientNameChangeSchema.safeParse({
      patient_id: "p_001",
      new_name: "",
    });
    expect(result.success).toBe(false);
  });

  it("new_name_kana 省略時はデフォルト空文字", () => {
    const result = patientNameChangeSchema.safeParse({
      patient_id: "p_001",
      new_name: "名前",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.new_name_kana).toBe("");
    }
  });
});

// ==========================================
// 患者フィールド更新
// ==========================================
describe("patientFieldsUpdateSchema", () => {
  it("正常値でparse成功", () => {
    const result = patientFieldsUpdateSchema.safeParse({
      values: [{ field_id: 1, value: "テスト" }],
    });
    expect(result.success).toBe(true);
  });

  it("values が空配列でも成功（min制約なし）", () => {
    const result = patientFieldsUpdateSchema.safeParse({ values: [] });
    expect(result.success).toBe(true);
  });

  it("values 欠損で失敗", () => {
    const result = patientFieldsUpdateSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

// ==========================================
// 対応マーク更新
// ==========================================
describe("patientMarkUpdateSchema", () => {
  it("正常値でparse成功", () => {
    const result = patientMarkUpdateSchema.safeParse({
      mark: "urgent",
    });
    expect(result.success).toBe(true);
  });

  it("mark 空文字で失敗", () => {
    const result = patientMarkUpdateSchema.safeParse({ mark: "" });
    expect(result.success).toBe(false);
  });
});

// ==========================================
// タグ付与
// ==========================================
describe("patientTagAddSchema", () => {
  it("正常値でparse成功", () => {
    const result = patientTagAddSchema.safeParse({ tag_id: 1 });
    expect(result.success).toBe(true);
  });

  it("tag_id が文字列で失敗", () => {
    const result = patientTagAddSchema.safeParse({ tag_id: "abc" });
    expect(result.success).toBe(false);
  });
});

// ==========================================
// 一括アクション
// ==========================================
describe("bulkActionSchema", () => {
  it("正常値でparse成功", () => {
    const result = bulkActionSchema.safeParse({
      patient_ids: ["p_001", "p_002"],
      action_id: "action_1",
    });
    expect(result.success).toBe(true);
  });

  it("patient_ids が空配列で失敗", () => {
    const result = bulkActionSchema.safeParse({
      patient_ids: [],
      action_id: "action_1",
    });
    expect(result.success).toBe(false);
  });

  it("action_id 空文字で失敗（refine）", () => {
    const result = bulkActionSchema.safeParse({
      patient_ids: ["p_001"],
      action_id: "",
    });
    expect(result.success).toBe(false);
  });
});

// ==========================================
// 一括フィールド更新
// ==========================================
describe("bulkFieldsUpdateSchema", () => {
  it("正常値でparse成功", () => {
    const result = bulkFieldsUpdateSchema.safeParse({
      patient_ids: ["p_001"],
      field_id: 1,
    });
    expect(result.success).toBe(true);
  });

  it("patient_ids が空配列で失敗", () => {
    const result = bulkFieldsUpdateSchema.safeParse({
      patient_ids: [],
      field_id: 1,
    });
    expect(result.success).toBe(false);
  });
});

// ==========================================
// ピン更新
// ==========================================
describe("pinsUpdateSchema", () => {
  it("正常値でparse成功", () => {
    const result = pinsUpdateSchema.safeParse({
      pins: ["p_001", "p_002"],
    });
    expect(result.success).toBe(true);
  });

  it("pins 省略時はデフォルト空配列", () => {
    const result = pinsUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.pins).toEqual([]);
    }
  });
});

// ==========================================
// LINE UID更新
// ==========================================
describe("updateLineUserIdSchema", () => {
  it("patient_id で成功", () => {
    const result = updateLineUserIdSchema.safeParse({
      patient_id: "p_001",
      line_user_id: "U1234",
    });
    expect(result.success).toBe(true);
  });

  it("patientId で成功", () => {
    const result = updateLineUserIdSchema.safeParse({
      patientId: "p_001",
      line_user_id: "U1234",
    });
    expect(result.success).toBe(true);
  });

  it("両方欠損で失敗（refine）", () => {
    const result = updateLineUserIdSchema.safeParse({
      line_user_id: "U1234",
    });
    expect(result.success).toBe(false);
  });
});

// ==========================================
// 注文住所更新
// ==========================================
describe("updateOrderAddressSchema", () => {
  it("正常値でparse成功", () => {
    const result = updateOrderAddressSchema.safeParse({
      orderId: "order_001",
      postalCode: "100-0001",
      address: "東京都千代田区",
    });
    expect(result.success).toBe(true);
  });

  it("orderId 空文字で失敗", () => {
    const result = updateOrderAddressSchema.safeParse({ orderId: "" });
    expect(result.success).toBe(false);
  });
});

// ==========================================
// 再処方承認
// ==========================================
describe("adminReorderApproveSchema", () => {
  it("id が文字列で成功", () => {
    const result = adminReorderApproveSchema.safeParse({ id: "123" });
    expect(result.success).toBe(true);
  });

  it("id が数値で成功", () => {
    const result = adminReorderApproveSchema.safeParse({ id: 123 });
    expect(result.success).toBe(true);
  });

  it("id 欠損で失敗", () => {
    const result = adminReorderApproveSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

// ==========================================
// 再処方却下
// ==========================================
describe("adminReorderRejectSchema", () => {
  it("正常値でparse成功", () => {
    const result = adminReorderRejectSchema.safeParse({
      id: 1,
      reason: "副作用のため",
    });
    expect(result.success).toBe(true);
  });

  it("reason 省略でも成功", () => {
    const result = adminReorderRejectSchema.safeParse({ id: 1 });
    expect(result.success).toBe(true);
  });
});

// ==========================================
// 発送通知
// ==========================================
describe("notifyShippedSchema", () => {
  it("正常値でparse成功", () => {
    const result = notifyShippedSchema.safeParse({
      orderId: "order_001",
      trackingNumber: "1234567890",
    });
    expect(result.success).toBe(true);
  });

  it("orderId 空文字で失敗", () => {
    const result = notifyShippedSchema.safeParse({ orderId: "" });
    expect(result.success).toBe(false);
  });
});

// ==========================================
// 銀行振込手動確認
// ==========================================
describe("bankTransferManualConfirmSchema", () => {
  it("正常値でparse成功", () => {
    const result = bankTransferManualConfirmSchema.safeParse({
      order_id: "bt_pending_1",
    });
    expect(result.success).toBe(true);
  });

  it("order_id 空文字で失敗", () => {
    const result = bankTransferManualConfirmSchema.safeParse({ order_id: "" });
    expect(result.success).toBe(false);
  });
});

// ==========================================
// 銀行振込照合確定
// ==========================================
describe("bankTransferReconcileConfirmSchema", () => {
  it("正常値でparse成功", () => {
    const result = bankTransferReconcileConfirmSchema.safeParse({
      matches: [
        {
          transfer: {
            date: "2026-01-01",
            description: "タナカ タロウ",
            amount: 50000,
          },
          order: {
            patient_id: "p_001",
            product_code: "MJL_2.5mg_1m",
            amount: 50000,
          },
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("matches が空配列で失敗（min(1)）", () => {
    const result = bankTransferReconcileConfirmSchema.safeParse({
      matches: [],
    });
    expect(result.success).toBe(false);
  });
});

// ==========================================
// 商品作成
// ==========================================
describe("productCreateSchema", () => {
  it("正常値でparse成功", () => {
    const result = productCreateSchema.safeParse({
      code: "MJL_2.5mg_1m",
      title: "マンジャロ 2.5mg 1ヶ月",
      price: 50000,
    });
    expect(result.success).toBe(true);
  });

  it("price が文字列で失敗", () => {
    const result = productCreateSchema.safeParse({
      code: "MJL_2.5mg_1m",
      title: "マンジャロ",
      price: "50000",
    });
    expect(result.success).toBe(false);
  });

  it("code 空文字で失敗", () => {
    const result = productCreateSchema.safeParse({
      code: "",
      title: "タイトル",
      price: 50000,
    });
    expect(result.success).toBe(false);
  });
});

// ==========================================
// 商品更新
// ==========================================
describe("productUpdateSchema", () => {
  it("id が文字列で成功（transformでString化）", () => {
    const result = productUpdateSchema.safeParse({ id: "123" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe("123");
    }
  });

  it("id が数値で成功（transformでString化）", () => {
    const result = productUpdateSchema.safeParse({ id: 456 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe("456");
    }
  });
});

// ==========================================
// 在庫記録
// ==========================================
describe("inventorySchema", () => {
  it("正常値でparse成功", () => {
    const result = inventorySchema.safeParse({
      date: "2026-02-23",
      entries: [
        { item_key: "MJL_2.5", location: "倉庫A", box_count: 10 },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("entries が空配列で失敗（min(1)）", () => {
    const result = inventorySchema.safeParse({
      date: "2026-02-23",
      entries: [],
    });
    expect(result.success).toBe(false);
  });
});

// ==========================================
// タグ作成
// ==========================================
describe("tagCreateSchema", () => {
  it("正常値でparse成功", () => {
    const result = tagCreateSchema.safeParse({ name: "VIP" });
    expect(result.success).toBe(true);
  });

  it("name 空文字で失敗", () => {
    const result = tagCreateSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });
});

// ==========================================
// タグ更新
// ==========================================
describe("tagUpdateSchema", () => {
  it("正常値でparse成功", () => {
    const result = tagUpdateSchema.safeParse({ name: "更新タグ" });
    expect(result.success).toBe(true);
  });

  it("空オブジェクトでも成功（全フィールド optional）", () => {
    const result = tagUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

// ==========================================
// 管理者ユーザー作成
// ==========================================
describe("createAdminUserSchema", () => {
  it("正常値でparse成功", () => {
    const result = createAdminUserSchema.safeParse({
      email: "admin@example.com",
      name: "管理者",
    });
    expect(result.success).toBe(true);
  });

  it("無効なメールアドレスで失敗", () => {
    const result = createAdminUserSchema.safeParse({
      email: "not-email",
      name: "管理者",
    });
    expect(result.success).toBe(false);
  });

  it("name 空文字で失敗", () => {
    const result = createAdminUserSchema.safeParse({
      email: "admin@example.com",
      name: "",
    });
    expect(result.success).toBe(false);
  });
});

// ==========================================
// 予約ルール
// ==========================================
describe("weeklyRulesSchema", () => {
  it("正常値でparse成功", () => {
    const result = weeklyRulesSchema.safeParse({
      doctor_id: "dr_001",
      rules: [{ weekday: 1, enabled: true, start_time: "09:00" }],
    });
    expect(result.success).toBe(true);
  });

  it("doctor_id 欠損で失敗", () => {
    const result = weeklyRulesSchema.safeParse({
      rules: [{ weekday: 1 }],
    });
    expect(result.success).toBe(false);
  });
});

// ==========================================
// 予約開放
// ==========================================
describe("bookingOpenSchema", () => {
  it("正常値でparse成功", () => {
    const result = bookingOpenSchema.safeParse({ month: "2026-03" });
    expect(result.success).toBe(true);
  });

  it("不正なフォーマットで失敗（YYYY-MM以外）", () => {
    const result = bookingOpenSchema.safeParse({ month: "2026/03" });
    expect(result.success).toBe(false);
  });

  it("年月のみ（日付付き）で失敗", () => {
    const result = bookingOpenSchema.safeParse({ month: "2026-03-01" });
    expect(result.success).toBe(false);
  });
});

// ==========================================
// 友達情報欄作成
// ==========================================
describe("friendFieldCreateSchema", () => {
  it("正常値でparse成功", () => {
    const result = friendFieldCreateSchema.safeParse({ name: "メモ欄" });
    expect(result.success).toBe(true);
  });

  it("name 空文字で失敗", () => {
    const result = friendFieldCreateSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });
});

// ==========================================
// 友達情報欄更新
// ==========================================
describe("friendFieldUpdateSchema", () => {
  it("空オブジェクトでも成功（全フィールド optional）", () => {
    const result = friendFieldUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

// ==========================================
// リマインダーCSV
// ==========================================
describe("reminderCsvSchema", () => {
  it("正常値でparse成功", () => {
    const result = reminderCsvSchema.safeParse({
      date: "2026-02-23",
      reminders: [
        {
          lstep_id: "L001",
          patient_id: "p_001",
          patient_name: "田中太郎",
          reserved_time: "10:00",
          phone: "09012345678",
          message: "リマインド",
          doctor_status: "OK",
          call_status: "未対応",
          prescription_menu: "マンジャロ",
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("reminders が空配列で失敗（min(1)）", () => {
    const result = reminderCsvSchema.safeParse({
      date: "2026-02-23",
      reminders: [],
    });
    expect(result.success).toBe(false);
  });
});

// ==========================================
// リマインダープレビュー
// ==========================================
describe("reminderPreviewSchema", () => {
  it("正常値でparse成功", () => {
    const result = reminderPreviewSchema.safeParse({ date: "2026-02-23" });
    expect(result.success).toBe(true);
  });

  it("date 空文字で失敗", () => {
    const result = reminderPreviewSchema.safeParse({ date: "" });
    expect(result.success).toBe(false);
  });
});

// ==========================================
// リマインダー送信
// ==========================================
describe("sendReminderSchema", () => {
  it("正常値でparse成功", () => {
    const result = sendReminderSchema.safeParse({ date: "2026-02-23" });
    expect(result.success).toBe(true);
  });

  it("testOnly, patient_ids はオプション", () => {
    const result = sendReminderSchema.safeParse({
      date: "2026-02-23",
      testOnly: true,
      patient_ids: ["p_001"],
    });
    expect(result.success).toBe(true);
  });
});

// ==========================================
// 月次経理データ
// ==========================================
describe("financialsSchema", () => {
  it("正常値でparse成功", () => {
    const result = financialsSchema.safeParse({ year_month: "2026-02" });
    expect(result.success).toBe(true);
  });

  it("不正フォーマットで失敗", () => {
    const result = financialsSchema.safeParse({ year_month: "202602" });
    expect(result.success).toBe(false);
  });
});

// ==========================================
// 日付オーバーライド POST
// ==========================================
describe("dateOverridePostSchema", () => {
  it("フラット形式で成功", () => {
    const result = dateOverridePostSchema.safeParse({
      doctor_id: "dr_001",
      date: "2026-03-01",
      type: "holiday",
    });
    expect(result.success).toBe(true);
  });

  it("override ラップ形式で成功", () => {
    const result = dateOverridePostSchema.safeParse({
      override: {
        doctor_id: "dr_001",
        date: "2026-03-01",
      },
    });
    expect(result.success).toBe(true);
  });
});

// ==========================================
// 日付オーバーライド DELETE
// ==========================================
describe("dateOverrideDeleteSchema", () => {
  it("正常値でparse成功", () => {
    const result = dateOverrideDeleteSchema.safeParse({
      doctor_id: "dr_001",
      date: "2026-03-01",
    });
    expect(result.success).toBe(true);
  });

  it("doctor_id 空文字で失敗", () => {
    const result = dateOverrideDeleteSchema.safeParse({
      doctor_id: "",
      date: "2026-03-01",
    });
    expect(result.success).toBe(false);
  });
});

// ==========================================
// パスワードリセットリクエスト
// ==========================================
describe("adminPasswordResetRequestSchema", () => {
  it("正常値でparse成功", () => {
    const result = adminPasswordResetRequestSchema.safeParse({
      email: "admin@example.com",
    });
    expect(result.success).toBe(true);
  });

  it("email 空文字で失敗", () => {
    const result = adminPasswordResetRequestSchema.safeParse({ email: "" });
    expect(result.success).toBe(false);
  });
});

// ==========================================
// パスワードリセット確認
// ==========================================
describe("adminPasswordResetConfirmSchema", () => {
  it("正常値でparse成功", () => {
    const result = adminPasswordResetConfirmSchema.safeParse({
      token: "abc123",
      password: "NewPass123!",
    });
    expect(result.success).toBe(true);
  });

  it("password が8文字未満で失敗", () => {
    const result = adminPasswordResetConfirmSchema.safeParse({
      token: "abc123",
      password: "short",
    });
    expect(result.success).toBe(false);
  });
});

// ==========================================
// リッチメニュー一括割当
// ==========================================
describe("bulkMenuSchema", () => {
  it("正常値でparse成功", () => {
    const result = bulkMenuSchema.safeParse({
      patient_ids: ["p_001"],
      rich_menu_id: 1,
    });
    expect(result.success).toBe(true);
  });

  it("rich_menu_id が文字列でも成功", () => {
    const result = bulkMenuSchema.safeParse({
      patient_ids: ["p_001"],
      rich_menu_id: "menu_1",
    });
    expect(result.success).toBe(true);
  });

  it("patient_ids が空配列で失敗", () => {
    const result = bulkMenuSchema.safeParse({
      patient_ids: [],
      rich_menu_id: 1,
    });
    expect(result.success).toBe(false);
  });
});

// ==========================================
// テナント設定更新
// ==========================================
describe("settingsUpdateSchema", () => {
  it("正常値でparse成功", () => {
    const result = settingsUpdateSchema.safeParse({
      category: "general",
      key: "clinic_name",
      value: "テストクリニック",
    });
    expect(result.success).toBe(true);
  });

  it("category 空文字で失敗", () => {
    const result = settingsUpdateSchema.safeParse({
      category: "",
      key: "clinic_name",
      value: "テスト",
    });
    expect(result.success).toBe(false);
  });

  it("key 空文字で失敗", () => {
    const result = settingsUpdateSchema.safeParse({
      category: "general",
      key: "",
      value: "テスト",
    });
    expect(result.success).toBe(false);
  });
});
