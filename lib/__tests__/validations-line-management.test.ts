// lib/__tests__/validations-line-management.test.ts
// LINE管理機能APIのZodスキーマバリデーションテスト
import {
  createFolderSchema,
  updateFolderSchema,
  createActionSchema,
  updateActionSchema,
  executeActionSchema,
  updateAiReplySettingsSchema,
  createClickTrackSchema,
  updateColumnSettingsSchema,
  distributeCouponSchema,
  publishFormSchema,
  updateFormSchema,
  updateFriendSettingsSchema,
  keywordTestSchema,
  updateMediaSchema,
  menuRuleSchema,
  createNpsSchema,
  updateNpsSchema,
  distributeNpsSchema,
  refreshProfileSchema,
  updateRichMenuSchema,
  createScheduleSchema,
  enrollStepSchema,
  createTemplateCategorySchema,
  assignUserRichMenuSchema,
} from "@/lib/validations/line-management";

// ==========================================
// フォルダ共通
// ==========================================
describe("createFolderSchema", () => {
  it("正常値でparse成功", () => {
    const result = createFolderSchema.safeParse({ name: "フォルダA" });
    expect(result.success).toBe(true);
  });

  it("name 空文字で失敗", () => {
    const result = createFolderSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("passthrough で追加フィールドが許容される", () => {
    const result = createFolderSchema.safeParse({
      name: "フォルダA",
      extra: "value",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as any).extra).toBe("value");
    }
  });
});

describe("updateFolderSchema", () => {
  it("id が数値で成功", () => {
    const result = updateFolderSchema.safeParse({ id: 1, name: "更新名" });
    expect(result.success).toBe(true);
  });

  it("id が文字列で成功（union型）", () => {
    const result = updateFolderSchema.safeParse({ id: "1", name: "更新名" });
    expect(result.success).toBe(true);
  });

  it("name 空文字で失敗", () => {
    const result = updateFolderSchema.safeParse({ id: 1, name: "" });
    expect(result.success).toBe(false);
  });
});

// ==========================================
// アクション
// ==========================================
describe("createActionSchema", () => {
  it("正常値でparse成功", () => {
    const result = createActionSchema.safeParse({
      name: "テストアクション",
      steps: [{ type: "message", text: "こんにちは" }],
    });
    expect(result.success).toBe(true);
  });

  it("steps が空配列で失敗（min(1)）", () => {
    const result = createActionSchema.safeParse({
      name: "テストアクション",
      steps: [],
    });
    expect(result.success).toBe(false);
  });

  it("name 空文字で失敗", () => {
    const result = createActionSchema.safeParse({
      name: "",
      steps: [{ type: "message" }],
    });
    expect(result.success).toBe(false);
  });

  it("folder_id が null でも成功", () => {
    const result = createActionSchema.safeParse({
      name: "テスト",
      steps: [{ type: "tag" }],
      folder_id: null,
    });
    expect(result.success).toBe(true);
  });

  it("folder_id が数値でも成功", () => {
    const result = createActionSchema.safeParse({
      name: "テスト",
      steps: [{ type: "tag" }],
      folder_id: 5,
    });
    expect(result.success).toBe(true);
  });
});

describe("updateActionSchema", () => {
  it("正常値でparse成功", () => {
    const result = updateActionSchema.safeParse({
      id: 1,
      name: "更新アクション",
    });
    expect(result.success).toBe(true);
  });

  it("id 欠損で失敗", () => {
    const result = updateActionSchema.safeParse({ name: "更新アクション" });
    expect(result.success).toBe(false);
  });

  it("steps はオプション", () => {
    const result = updateActionSchema.safeParse({ id: 1, name: "テスト" });
    expect(result.success).toBe(true);
  });
});

describe("executeActionSchema", () => {
  it("正常値でparse成功", () => {
    const result = executeActionSchema.safeParse({
      action_id: 1,
      patient_id: "p_001",
    });
    expect(result.success).toBe(true);
  });

  it("patient_id 空文字で失敗", () => {
    const result = executeActionSchema.safeParse({
      action_id: 1,
      patient_id: "",
    });
    expect(result.success).toBe(false);
  });
});

// ==========================================
// AI返信設定
// ==========================================
describe("updateAiReplySettingsSchema", () => {
  it("正常値でparse成功", () => {
    const result = updateAiReplySettingsSchema.safeParse({
      is_enabled: true,
      mode: "auto",
      daily_limit: 100,
    });
    expect(result.success).toBe(true);
  });

  it("空オブジェクトでも成功（全フィールド optional）", () => {
    const result = updateAiReplySettingsSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("min_message_length は整数のみ", () => {
    const result = updateAiReplySettingsSchema.safeParse({
      min_message_length: 5.5,
    });
    expect(result.success).toBe(false);
  });
});

// ==========================================
// クリック計測
// ==========================================
describe("createClickTrackSchema", () => {
  it("正常値でparse成功", () => {
    const result = createClickTrackSchema.safeParse({
      original_url: "https://example.com",
    });
    expect(result.success).toBe(true);
  });

  it("original_url 空文字で失敗", () => {
    const result = createClickTrackSchema.safeParse({ original_url: "" });
    expect(result.success).toBe(false);
  });
});

// ==========================================
// カラム設定
// ==========================================
describe("updateColumnSettingsSchema", () => {
  it("正常値でparse成功", () => {
    const result = updateColumnSettingsSchema.safeParse({
      sections: { header: true, footer: false },
    });
    expect(result.success).toBe(true);
  });

  it("sections 欠損で失敗", () => {
    const result = updateColumnSettingsSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

// ==========================================
// クーポン配布
// ==========================================
describe("distributeCouponSchema", () => {
  it("正常値でparse成功", () => {
    const result = distributeCouponSchema.safeParse({
      filter_rules: { tag: "VIP" },
      message: "クーポンをお送りします",
    });
    expect(result.success).toBe(true);
  });

  it("空オブジェクトでも成功（全フィールド optional）", () => {
    const result = distributeCouponSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

// ==========================================
// フォーム公開切替
// ==========================================
describe("publishFormSchema", () => {
  it("正常値でparse成功", () => {
    const result = publishFormSchema.safeParse({ is_published: true });
    expect(result.success).toBe(true);
  });

  it("空オブジェクトでも成功（optional）", () => {
    const result = publishFormSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

describe("updateFormSchema", () => {
  it("正常値でparse成功", () => {
    const result = updateFormSchema.safeParse({
      name: "問診フォーム",
      is_published: true,
    });
    expect(result.success).toBe(true);
  });

  it("fields が配列で成功", () => {
    const result = updateFormSchema.safeParse({
      fields: [{ type: "text", label: "名前" }],
    });
    expect(result.success).toBe(true);
  });
});

// ==========================================
// 友達追加時設定
// ==========================================
describe("updateFriendSettingsSchema", () => {
  it("正常値でparse成功", () => {
    const result = updateFriendSettingsSchema.safeParse({
      setting_key: "welcome_message",
      setting_value: "ようこそ",
    });
    expect(result.success).toBe(true);
  });

  it("setting_key 空文字で失敗", () => {
    const result = updateFriendSettingsSchema.safeParse({ setting_key: "" });
    expect(result.success).toBe(false);
  });
});

// ==========================================
// キーワード応答テスト
// ==========================================
describe("keywordTestSchema", () => {
  it("正常値でparse成功", () => {
    const result = keywordTestSchema.safeParse({ text: "予約" });
    expect(result.success).toBe(true);
  });

  it("text 空文字で失敗", () => {
    const result = keywordTestSchema.safeParse({ text: "" });
    expect(result.success).toBe(false);
  });
});

// ==========================================
// メディア更新
// ==========================================
describe("updateMediaSchema", () => {
  it("id が数値で成功", () => {
    const result = updateMediaSchema.safeParse({ id: 1, name: "画像A" });
    expect(result.success).toBe(true);
  });

  it("id が文字列で成功（union型）", () => {
    const result = updateMediaSchema.safeParse({ id: "1" });
    expect(result.success).toBe(true);
  });

  it("folder_id が null でも成功", () => {
    const result = updateMediaSchema.safeParse({ id: 1, folder_id: null });
    expect(result.success).toBe(true);
  });
});

// ==========================================
// メニュールール
// ==========================================
describe("menuRuleSchema", () => {
  it("正常値でparse成功", () => {
    const result = menuRuleSchema.safeParse({
      rule: {
        name: "VIPルール",
        target_menu_id: "menu_001",
      },
    });
    expect(result.success).toBe(true);
  });

  it("rule.name 空文字で失敗", () => {
    const result = menuRuleSchema.safeParse({
      rule: {
        name: "",
        target_menu_id: "menu_001",
      },
    });
    expect(result.success).toBe(false);
  });

  it("rule.target_menu_id 空文字で失敗", () => {
    const result = menuRuleSchema.safeParse({
      rule: {
        name: "ルール",
        target_menu_id: "",
      },
    });
    expect(result.success).toBe(false);
  });
});

// ==========================================
// NPS調査
// ==========================================
describe("createNpsSchema", () => {
  it("正常値でparse成功", () => {
    const result = createNpsSchema.safeParse({
      title: "満足度調査",
    });
    expect(result.success).toBe(true);
  });

  it("title 空文字で失敗", () => {
    const result = createNpsSchema.safeParse({ title: "" });
    expect(result.success).toBe(false);
  });

  it("auto_send_delay_hours は整数のみ", () => {
    const result = createNpsSchema.safeParse({
      title: "調査",
      auto_send_delay_hours: 2.5,
    });
    expect(result.success).toBe(false);
  });
});

describe("updateNpsSchema", () => {
  it("id が数値で成功", () => {
    const result = updateNpsSchema.safeParse({ id: 1, title: "更新調査" });
    expect(result.success).toBe(true);
  });

  it("id が文字列で成功（union型）", () => {
    const result = updateNpsSchema.safeParse({ id: "1" });
    expect(result.success).toBe(true);
  });
});

describe("distributeNpsSchema", () => {
  it("空オブジェクトでも成功（全フィールド optional）", () => {
    const result = distributeNpsSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

// ==========================================
// プロフィール更新
// ==========================================
describe("refreshProfileSchema", () => {
  it("正常値でparse成功", () => {
    const result = refreshProfileSchema.safeParse({ patient_id: "p_001" });
    expect(result.success).toBe(true);
  });

  it("patient_id 空文字で失敗", () => {
    const result = refreshProfileSchema.safeParse({ patient_id: "" });
    expect(result.success).toBe(false);
  });
});

// ==========================================
// リッチメニュー更新
// ==========================================
describe("updateRichMenuSchema", () => {
  it("正常値でparse成功", () => {
    const result = updateRichMenuSchema.safeParse({
      name: "メニュー1",
      selected: true,
    });
    expect(result.success).toBe(true);
  });

  it("空オブジェクトでも成功（全フィールド optional）", () => {
    const result = updateRichMenuSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

// ==========================================
// 予約送信
// ==========================================
describe("createScheduleSchema", () => {
  it("正常値でparse成功", () => {
    const result = createScheduleSchema.safeParse({
      patient_id: "p_001",
      message: "予約確認",
      scheduled_at: "2026-03-01T10:00:00",
    });
    expect(result.success).toBe(true);
  });

  it("message 空文字で失敗", () => {
    const result = createScheduleSchema.safeParse({
      patient_id: "p_001",
      message: "",
      scheduled_at: "2026-03-01T10:00:00",
    });
    expect(result.success).toBe(false);
  });

  it("scheduled_at 空文字で失敗", () => {
    const result = createScheduleSchema.safeParse({
      patient_id: "p_001",
      message: "予約確認",
      scheduled_at: "",
    });
    expect(result.success).toBe(false);
  });
});

// ==========================================
// ステップシナリオ手動登録
// ==========================================
describe("enrollStepSchema", () => {
  it("正常値でparse成功", () => {
    const result = enrollStepSchema.safeParse({
      patient_ids: ["p_001", "p_002"],
    });
    expect(result.success).toBe(true);
  });

  it("patient_ids が空配列で失敗（min(1)）", () => {
    const result = enrollStepSchema.safeParse({ patient_ids: [] });
    expect(result.success).toBe(false);
  });
});

// ==========================================
// テンプレートカテゴリ作成
// ==========================================
describe("createTemplateCategorySchema", () => {
  it("正常値でparse成功", () => {
    const result = createTemplateCategorySchema.safeParse({ name: "挨拶" });
    expect(result.success).toBe(true);
  });

  it("name 空文字で失敗", () => {
    const result = createTemplateCategorySchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });
});

// ==========================================
// ユーザーリッチメニュー割当
// ==========================================
describe("assignUserRichMenuSchema", () => {
  it("正常値でparse成功", () => {
    const result = assignUserRichMenuSchema.safeParse({
      patient_id: "p_001",
      rich_menu_id: 1,
    });
    expect(result.success).toBe(true);
  });

  it("rich_menu_id が文字列でも成功（union型）", () => {
    const result = assignUserRichMenuSchema.safeParse({
      patient_id: "p_001",
      rich_menu_id: "menu_001",
    });
    expect(result.success).toBe(true);
  });

  it("patient_id 空文字で失敗", () => {
    const result = assignUserRichMenuSchema.safeParse({
      patient_id: "",
      rich_menu_id: 1,
    });
    expect(result.success).toBe(false);
  });
});
