// lib/__tests__/validations-remaining.test.ts
// 残り8ファイル分のZodバリデーションスキーマのテスト
// 対象: payment, coupon, platform-auth, repair, followup, nps, mypage, register
import { describe, it, expect } from "vitest";
import {
  bankTransferShippingSchema,
  refundSchema,
} from "@/lib/validations/payment";
import {
  couponValidateSchema,
  couponRedeemSchema,
} from "@/lib/validations/coupon";
import {
  passwordResetRequestSchema,
  passwordResetSchema,
} from "@/lib/validations/platform-auth";
import { repairSchema } from "@/lib/validations/repair";
import {
  createFollowupRuleSchema,
  updateFollowupRuleSchema,
} from "@/lib/validations/followup";
import { npsResponseSchema } from "@/lib/validations/nps";
import { mypageDashboardSchema } from "@/lib/validations/mypage";
import { registerCompleteSchema } from "@/lib/validations/register";

// ========== payment.ts ==========

// ---------- bankTransferShippingSchema ----------
describe("bankTransferShippingSchema", () => {
  const validInput = {
    patientId: "patient-123",
    productCode: "PROD-001",
    accountName: "ヤマダタロウ",
    shippingName: "山田太郎",
    phoneNumber: "09012345678",
    email: "test@example.com",
    postalCode: "100-0001",
    address: "東京都千代田区1-1-1",
  };

  it("正常値でparse成功（必須フィールドのみ）", () => {
    const result = bankTransferShippingSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("正常値でparse成功（全フィールド指定）", () => {
    const result = bankTransferShippingSchema.safeParse({
      ...validInput,
      mode: "first",
      reorderId: "reorder-123",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.mode).toBe("first");
    }
  });

  it("reorderIdにnullを渡してparse成功（nullable）", () => {
    const result = bankTransferShippingSchema.safeParse({
      ...validInput,
      reorderId: null,
    });
    expect(result.success).toBe(true);
  });

  it("reorderIdに数値を渡してparse成功（union: string | number）", () => {
    const result = bankTransferShippingSchema.safeParse({
      ...validInput,
      reorderId: 42,
    });
    expect(result.success).toBe(true);
  });

  it("patientIdが空文字でparse失敗", () => {
    const result = bankTransferShippingSchema.safeParse({
      ...validInput,
      patientId: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs).toContain("患者IDは必須です");
    }
  });

  it("productCodeが空文字でparse失敗", () => {
    const result = bankTransferShippingSchema.safeParse({
      ...validInput,
      productCode: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs).toContain("商品コードは必須です");
    }
  });

  it("accountNameが空文字でparse失敗", () => {
    const result = bankTransferShippingSchema.safeParse({
      ...validInput,
      accountName: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs).toContain("振込名義は必須です");
    }
  });

  it("必須フィールド欠損でparse失敗", () => {
    const result = bankTransferShippingSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("passthroughで追加フィールドが保持される", () => {
    const result = bankTransferShippingSchema.safeParse({
      ...validInput,
      memo: "テストメモ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.memo).toBe("テストメモ");
    }
  });
});

// ---------- refundSchema ----------
describe("refundSchema", () => {
  it("正常値でparse成功（必須フィールドのみ）", () => {
    const result = refundSchema.safeParse({ orderId: "order-123" });
    expect(result.success).toBe(true);
  });

  it("正常値でparse成功（全フィールド指定）", () => {
    const result = refundSchema.safeParse({
      orderId: "order-123",
      amount: 5000,
      reason: "患者都合によるキャンセル",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.amount).toBe(5000);
    }
  });

  it("orderIdが空文字でparse失敗", () => {
    const result = refundSchema.safeParse({ orderId: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs).toContain("注文IDは必須です");
    }
  });

  it("amountが負数でparse失敗", () => {
    const result = refundSchema.safeParse({
      orderId: "order-123",
      amount: -1,
    });
    expect(result.success).toBe(false);
  });

  it("amountが小数でparse失敗（int制約）", () => {
    const result = refundSchema.safeParse({
      orderId: "order-123",
      amount: 100.5,
    });
    expect(result.success).toBe(false);
  });

  it("orderId欠損でparse失敗", () => {
    const result = refundSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("passthroughで追加フィールドが保持される", () => {
    const result = refundSchema.safeParse({
      orderId: "order-123",
      operator: "admin-user",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.operator).toBe("admin-user");
    }
  });
});

// ========== coupon.ts ==========

// ---------- couponValidateSchema ----------
describe("couponValidateSchema", () => {
  it("正常値でparse成功（codeのみ）", () => {
    const result = couponValidateSchema.safeParse({ code: "WELCOME2026" });
    expect(result.success).toBe(true);
  });

  it("正常値でparse成功（patient_id付き）", () => {
    const result = couponValidateSchema.safeParse({
      code: "WELCOME2026",
      patient_id: "patient-123",
    });
    expect(result.success).toBe(true);
  });

  it("codeが空文字でparse失敗", () => {
    const result = couponValidateSchema.safeParse({ code: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs).toContain("クーポンコードは必須です");
    }
  });

  it("codeが100文字超でparse失敗", () => {
    const result = couponValidateSchema.safeParse({
      code: "A".repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it("code欠損でparse失敗", () => {
    const result = couponValidateSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("passthroughで追加フィールドが保持される", () => {
    const result = couponValidateSchema.safeParse({
      code: "TEST",
      extra: "value",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.extra).toBe("value");
    }
  });
});

// ---------- couponRedeemSchema ----------
describe("couponRedeemSchema", () => {
  it("正常値でparse成功（必須フィールドのみ）", () => {
    const result = couponRedeemSchema.safeParse({
      coupon_id: "coupon-123",
      patient_id: "patient-456",
    });
    expect(result.success).toBe(true);
  });

  it("正常値でparse成功（order_id付き）", () => {
    const result = couponRedeemSchema.safeParse({
      coupon_id: "coupon-123",
      patient_id: "patient-456",
      order_id: "order-789",
    });
    expect(result.success).toBe(true);
  });

  it("coupon_idが空文字でparse失敗", () => {
    const result = couponRedeemSchema.safeParse({
      coupon_id: "",
      patient_id: "patient-456",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs).toContain("coupon_idは必須です");
    }
  });

  it("patient_idが空文字でparse失敗", () => {
    const result = couponRedeemSchema.safeParse({
      coupon_id: "coupon-123",
      patient_id: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs).toContain("patient_idは必須です");
    }
  });

  it("必須フィールド欠損でparse失敗", () => {
    const result = couponRedeemSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("passthroughで追加フィールドが保持される", () => {
    const result = couponRedeemSchema.safeParse({
      coupon_id: "coupon-123",
      patient_id: "patient-456",
      usedAt: "2026-02-23",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.usedAt).toBe("2026-02-23");
    }
  });
});

// ========== platform-auth.ts ==========

// ---------- passwordResetRequestSchema ----------
describe("passwordResetRequestSchema", () => {
  it("正常値でparse成功", () => {
    const result = passwordResetRequestSchema.safeParse({
      email: "admin@example.com",
    });
    expect(result.success).toBe(true);
  });

  it("emailが無効な形式でparse失敗", () => {
    const result = passwordResetRequestSchema.safeParse({
      email: "invalid-email",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs).toContain("有効なメールアドレスを入力してください");
    }
  });

  it("email欠損でparse失敗", () => {
    const result = passwordResetRequestSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

// ---------- passwordResetSchema ----------
describe("passwordResetSchema", () => {
  it("正常値でparse成功", () => {
    const result = passwordResetSchema.safeParse({
      token: "reset-token-xyz",
      password: "newpassword123",
    });
    expect(result.success).toBe(true);
  });

  it("tokenが空文字でparse失敗", () => {
    const result = passwordResetSchema.safeParse({
      token: "",
      password: "newpassword123",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs).toContain("トークンは必須です");
    }
  });

  it("passwordが7文字でparse失敗（8文字以上必要）", () => {
    const result = passwordResetSchema.safeParse({
      token: "reset-token",
      password: "1234567",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs).toContain("パスワードは8文字以上で入力してください");
    }
  });

  it("passwordが8文字でparse成功（境界値）", () => {
    const result = passwordResetSchema.safeParse({
      token: "reset-token",
      password: "12345678",
    });
    expect(result.success).toBe(true);
  });

  it("passwordが200文字超でparse失敗", () => {
    const result = passwordResetSchema.safeParse({
      token: "reset-token",
      password: "a".repeat(201),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs).toContain("パスワードは200文字以下で入力してください");
    }
  });

  it("必須フィールド欠損でparse失敗", () => {
    const result = passwordResetSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

// ========== repair.ts ==========

// ---------- repairSchema ----------
describe("repairSchema", () => {
  const validInput = {
    name_kana: "ヤマダタロウ",
    sex: "male",
    birth: "1990-01-01",
    tel: "09012345678",
  };

  it("正常値でparse成功", () => {
    const result = repairSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("name_kanaが空文字でparse失敗", () => {
    const result = repairSchema.safeParse({ ...validInput, name_kana: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs).toContain("カナ氏名は必須です");
    }
  });

  it("name_kanaが100文字超でparse失敗", () => {
    const result = repairSchema.safeParse({
      ...validInput,
      name_kana: "ア".repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it("sexが空文字でparse失敗", () => {
    const result = repairSchema.safeParse({ ...validInput, sex: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs).toContain("性別は必須です");
    }
  });

  it("birthが空文字でparse失敗", () => {
    const result = repairSchema.safeParse({ ...validInput, birth: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs).toContain("生年月日は必須です");
    }
  });

  it("telが空文字でparse失敗", () => {
    const result = repairSchema.safeParse({ ...validInput, tel: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs).toContain("電話番号は必須です");
    }
  });

  it("必須フィールド欠損でparse失敗", () => {
    const result = repairSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("passthroughで追加フィールドが保持される", () => {
    const result = repairSchema.safeParse({
      ...validInput,
      patientId: "patient-123",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.patientId).toBe("patient-123");
    }
  });
});

// ========== followup.ts ==========

// ---------- createFollowupRuleSchema ----------
describe("createFollowupRuleSchema", () => {
  const validInput = {
    name: "フォローアップルール1",
    delay_days: 7,
    message_template: "ご購入ありがとうございます。",
  };

  it("正常値でparse成功（必須フィールドのみ）", () => {
    const result = createFollowupRuleSchema.safeParse(validInput);
    expect(result.success).toBe(true);
    if (result.success) {
      // デフォルト値が適用される
      expect(result.data.trigger_event).toBe("payment_completed");
      expect(result.data.is_enabled).toBe(true);
    }
  });

  it("正常値でparse成功（全フィールド指定）", () => {
    const result = createFollowupRuleSchema.safeParse({
      ...validInput,
      trigger_event: "shipping_completed",
      flex_json: { type: "bubble", body: {} },
      is_enabled: false,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.is_enabled).toBe(false);
    }
  });

  it("flex_jsonにnullを渡してparse成功（nullable）", () => {
    const result = createFollowupRuleSchema.safeParse({
      ...validInput,
      flex_json: null,
    });
    expect(result.success).toBe(true);
  });

  it("nameが空文字でparse失敗", () => {
    const result = createFollowupRuleSchema.safeParse({
      ...validInput,
      name: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs).toContain("名前は必須です");
    }
  });

  it("delay_daysが0でparse失敗（1日以上必要）", () => {
    const result = createFollowupRuleSchema.safeParse({
      ...validInput,
      delay_days: 0,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs).toContain("1日以上を指定してください");
    }
  });

  it("delay_daysが小数でparse失敗（int制約）", () => {
    const result = createFollowupRuleSchema.safeParse({
      ...validInput,
      delay_days: 1.5,
    });
    expect(result.success).toBe(false);
  });

  it("message_templateが空文字でparse失敗", () => {
    const result = createFollowupRuleSchema.safeParse({
      ...validInput,
      message_template: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs).toContain("メッセージテンプレートは必須です");
    }
  });

  it("必須フィールド欠損でparse失敗", () => {
    const result = createFollowupRuleSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("passthroughで追加フィールドが保持される", () => {
    const result = createFollowupRuleSchema.safeParse({
      ...validInput,
      priority: 1,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.priority).toBe(1);
    }
  });
});

// ---------- updateFollowupRuleSchema ----------
describe("updateFollowupRuleSchema", () => {
  it("部分更新でparse成功（nameのみ）", () => {
    const result = updateFollowupRuleSchema.safeParse({
      name: "更新ルール名",
    });
    expect(result.success).toBe(true);
  });

  it("部分更新でparse成功（delay_daysのみ）", () => {
    const result = updateFollowupRuleSchema.safeParse({ delay_days: 14 });
    expect(result.success).toBe(true);
  });

  it("全フィールド省略でparse成功（全てpartial）", () => {
    const result = updateFollowupRuleSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("passthroughで追加フィールドが保持される", () => {
    const result = updateFollowupRuleSchema.safeParse({
      updatedBy: "admin",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.updatedBy).toBe("admin");
    }
  });
});

// ========== nps.ts ==========

// ---------- npsResponseSchema ----------
describe("npsResponseSchema", () => {
  it("正常値でparse成功（scoreのみ）", () => {
    const result = npsResponseSchema.safeParse({ score: 8 });
    expect(result.success).toBe(true);
  });

  it("正常値でparse成功（全フィールド指定）", () => {
    const result = npsResponseSchema.safeParse({
      score: 9,
      comment: "とても満足です",
      patient_id: "patient-123",
    });
    expect(result.success).toBe(true);
  });

  it("scoreが0でparse成功（下限境界値）", () => {
    const result = npsResponseSchema.safeParse({ score: 0 });
    expect(result.success).toBe(true);
  });

  it("scoreが10でparse成功（上限境界値）", () => {
    const result = npsResponseSchema.safeParse({ score: 10 });
    expect(result.success).toBe(true);
  });

  it("scoreが-1でparse失敗（下限超過）", () => {
    const result = npsResponseSchema.safeParse({ score: -1 });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs).toContain("スコアは0以上");
    }
  });

  it("scoreが11でparse失敗（上限超過）", () => {
    const result = npsResponseSchema.safeParse({ score: 11 });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs).toContain("スコアは10以下");
    }
  });

  it("score欠損でparse失敗", () => {
    const result = npsResponseSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("passthroughで追加フィールドが保持される", () => {
    const result = npsResponseSchema.safeParse({
      score: 7,
      source: "line",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.source).toBe("line");
    }
  });
});

// ========== mypage.ts ==========

// ---------- mypageDashboardSchema ----------
describe("mypageDashboardSchema", () => {
  it("refreshがtrueでparse成功", () => {
    const result = mypageDashboardSchema.safeParse({ refresh: true });
    expect(result.success).toBe(true);
  });

  it("refreshがfalseでparse成功", () => {
    const result = mypageDashboardSchema.safeParse({ refresh: false });
    expect(result.success).toBe(true);
  });

  it("refreshが文字列'1'でparse成功（literal union）", () => {
    const result = mypageDashboardSchema.safeParse({ refresh: "1" });
    expect(result.success).toBe(true);
  });

  it("refreshが文字列'0'でparse失敗（literal '1'のみ許可）", () => {
    const result = mypageDashboardSchema.safeParse({ refresh: "0" });
    expect(result.success).toBe(false);
  });

  it("refresh省略でparse成功（optional）", () => {
    const result = mypageDashboardSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("passthroughで追加フィールドが保持される", () => {
    const result = mypageDashboardSchema.safeParse({
      refresh: true,
      page: 1,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
    }
  });
});

// ========== register.ts ==========

// ---------- registerCompleteSchema ----------
describe("registerCompleteSchema", () => {
  it("正常値でparse成功", () => {
    const result = registerCompleteSchema.safeParse({
      phone: "09012345678",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phone).toBe("09012345678");
    }
  });

  it("phoneが空文字でparse失敗", () => {
    const result = registerCompleteSchema.safeParse({ phone: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs).toContain("電話番号は必須です");
    }
  });

  it("phone欠損でparse失敗", () => {
    const result = registerCompleteSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("passthroughで追加フィールドが保持される", () => {
    const result = registerCompleteSchema.safeParse({
      phone: "09012345678",
      verificationCode: "123456",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.verificationCode).toBe("123456");
    }
  });
});
