// lib/__tests__/validations-platform-billing.test.ts
// 請求管理Zodバリデーションスキーマのテスト
import { describe, it, expect } from "vitest";
import {
  updatePlanSchema,
  createInvoiceSchema,
  updateInvoiceStatusSchema,
} from "@/lib/validations/platform-billing";

// ---------- updatePlanSchema ----------
describe("updatePlanSchema", () => {
  it("正常値でparse成功", () => {
    const result = updatePlanSchema.safeParse({
      planName: "standard",
      monthlyFee: 50000,
    });
    expect(result.success).toBe(true);
  });

  it("全プラン名でparse成功", () => {
    const plans = ["trial", "standard", "premium", "enterprise"] as const;
    for (const planName of plans) {
      const result = updatePlanSchema.safeParse({
        planName,
        monthlyFee: 50000,
      });
      expect(result.success).toBe(true);
    }
  });

  it("setupFee・notes含めてparse成功", () => {
    const result = updatePlanSchema.safeParse({
      planName: "premium",
      monthlyFee: 80000,
      setupFee: 500000,
      notes: "特別プラン適用",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.setupFee).toBe(500000);
      expect(result.data.notes).toBe("特別プラン適用");
    }
  });

  it("notesにnullを渡してparse成功（nullable）", () => {
    const result = updatePlanSchema.safeParse({
      planName: "standard",
      monthlyFee: 50000,
      notes: null,
    });
    expect(result.success).toBe(true);
  });

  it("無効なplanNameでparse失敗", () => {
    const result = updatePlanSchema.safeParse({
      planName: "free",
      monthlyFee: 0,
    });
    expect(result.success).toBe(false);
  });

  it("monthlyFeeが負数でparse失敗", () => {
    const result = updatePlanSchema.safeParse({
      planName: "standard",
      monthlyFee: -1,
    });
    expect(result.success).toBe(false);
  });

  it("monthlyFeeが小数でparse失敗（int制約）", () => {
    const result = updatePlanSchema.safeParse({
      planName: "standard",
      monthlyFee: 50000.5,
    });
    expect(result.success).toBe(false);
  });

  it("planName欠損でparse失敗", () => {
    const result = updatePlanSchema.safeParse({ monthlyFee: 50000 });
    expect(result.success).toBe(false);
  });

  it("monthlyFee欠損でparse失敗", () => {
    const result = updatePlanSchema.safeParse({ planName: "standard" });
    expect(result.success).toBe(false);
  });

  it("notesが500文字超でparse失敗", () => {
    const result = updatePlanSchema.safeParse({
      planName: "standard",
      monthlyFee: 50000,
      notes: "あ".repeat(501),
    });
    expect(result.success).toBe(false);
  });
});

// ---------- createInvoiceSchema ----------
describe("createInvoiceSchema", () => {
  const validInvoice = {
    tenantId: "550e8400-e29b-41d4-a716-446655440000",
    amount: 50000,
    billingPeriodStart: "2026-02-01",
    billingPeriodEnd: "2026-02-28",
  };

  it("正常値でparse成功（必須フィールドのみ）", () => {
    const result = createInvoiceSchema.safeParse(validInvoice);
    expect(result.success).toBe(true);
    if (result.success) {
      // taxAmountのデフォルト値
      expect(result.data.taxAmount).toBe(0);
    }
  });

  it("正常値でparse成功（全フィールド指定）", () => {
    const result = createInvoiceSchema.safeParse({
      ...validInvoice,
      taxAmount: 5000,
      notes: "2月分請求",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.taxAmount).toBe(5000);
    }
  });

  it("tenantIdがUUID形式でないとparse失敗", () => {
    const result = createInvoiceSchema.safeParse({
      ...validInvoice,
      tenantId: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("tenantIdが有効なUUIDでparse成功", () => {
    const result = createInvoiceSchema.safeParse({
      ...validInvoice,
      tenantId: "123e4567-e89b-12d3-a456-426614174000",
    });
    expect(result.success).toBe(true);
  });

  it("amountが負数でparse失敗", () => {
    const result = createInvoiceSchema.safeParse({
      ...validInvoice,
      amount: -1,
    });
    expect(result.success).toBe(false);
  });

  it("billingPeriodStartが日付形式でないとparse失敗", () => {
    const result = createInvoiceSchema.safeParse({
      ...validInvoice,
      billingPeriodStart: "not-a-date",
    });
    expect(result.success).toBe(false);
  });

  it("billingPeriodEndが日付形式でないとparse失敗", () => {
    const result = createInvoiceSchema.safeParse({
      ...validInvoice,
      billingPeriodEnd: "2026/02/28",
    });
    expect(result.success).toBe(false);
  });

  it("billingPeriodStartに有効な日付文字列でparse成功", () => {
    const result = createInvoiceSchema.safeParse({
      ...validInvoice,
      billingPeriodStart: "2026-01-01",
    });
    expect(result.success).toBe(true);
  });

  it("notesにnullを渡してparse成功（nullable）", () => {
    const result = createInvoiceSchema.safeParse({
      ...validInvoice,
      notes: null,
    });
    expect(result.success).toBe(true);
  });

  it("必須フィールド欠損でparse失敗", () => {
    const result = createInvoiceSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

// ---------- updateInvoiceStatusSchema ----------
describe("updateInvoiceStatusSchema", () => {
  it("全ステータスでparse成功", () => {
    const statuses = ["pending", "paid", "overdue", "cancelled"] as const;
    for (const status of statuses) {
      const result = updateInvoiceStatusSchema.safeParse({ status });
      expect(result.success).toBe(true);
    }
  });

  it("paidAtにdatetime文字列を渡してparse成功", () => {
    const result = updateInvoiceStatusSchema.safeParse({
      status: "paid",
      paidAt: "2026-02-23T10:00:00Z",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.paidAt).toBe("2026-02-23T10:00:00Z");
    }
  });

  it("paidAtにnullを渡してparse成功（nullable）", () => {
    const result = updateInvoiceStatusSchema.safeParse({
      status: "pending",
      paidAt: null,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.paidAt).toBeNull();
    }
  });

  it("paidAt省略でparse成功（optional）", () => {
    const result = updateInvoiceStatusSchema.safeParse({
      status: "overdue",
    });
    expect(result.success).toBe(true);
  });

  it("paidAtが無効なdatetime形式でparse失敗", () => {
    const result = updateInvoiceStatusSchema.safeParse({
      status: "paid",
      paidAt: "2026-02-23",
    });
    expect(result.success).toBe(false);
  });

  it("無効なstatusでparse失敗", () => {
    const result = updateInvoiceStatusSchema.safeParse({
      status: "refunded",
    });
    expect(result.success).toBe(false);
  });

  it("status欠損でparse失敗", () => {
    const result = updateInvoiceStatusSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
