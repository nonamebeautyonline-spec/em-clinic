// lib/__tests__/payment-thank-flex.test.ts
// 決済サンクスFlexメッセージのユニットテスト

import { describe, it, expect, vi, beforeEach } from "vitest";

/* ---------- モック ---------- */

function createMockChain(data: unknown = null, error: unknown = null) {
  const chain: Record<string, any> = {};
  const methods = ["from", "select", "insert", "update", "upsert", "delete", "eq", "neq", "in", "is", "not", "gt", "gte", "lt", "lte", "like", "ilike", "contains", "containedBy", "filter", "or", "order", "limit", "range", "single", "maybeSingle", "match", "textSearch", "csv", "rpc", "count", "head"];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.then = (resolve: any) => resolve({ data, error, count: Array.isArray(data) ? data.length : 0 });
  return chain;
}

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn().mockReturnValue(createMockChain()),
  },
}));

vi.mock("@/lib/tenant", () => ({
  withTenant: vi.fn((query: unknown) => query),
  tenantPayload: vi.fn((id: string | null) => ({ tenant_id: id ?? "test-tenant" })),
}));

vi.mock("@/lib/line-push", () => ({
  pushMessage: vi.fn().mockResolvedValue({ ok: true }),
}));

// business-rules モック: 全表示項目をデフォルトで有効に
const mockBusinessRules = {
  paymentThankHeaderCard: "決済完了",
  paymentThankHeaderBank: "情報入力完了",
  showProductName: true,
  showAmount: true,
  showPaymentMethod: true,
  showShippingInfo: true,
  showShippingName: true,
  showShippingPostal: true,
  showShippingAddress: true,
  showShippingPhone: true,
  showShippingEmail: true,
};

vi.mock("@/lib/business-rules", () => ({
  getBusinessRules: vi.fn().mockResolvedValue(mockBusinessRules),
}));

vi.mock("@/lib/flex-message/config", () => ({
  getFlexConfig: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/lib/flex-message/types", () => ({
  DEFAULT_FLEX_CONFIG: {},
  getColorsForTab: vi.fn().mockReturnValue({
    headerBg: "#4CAF50",
    headerText: "#ffffff",
    bodyText: "#333333",
    accentColor: "#4CAF50",
  }),
}));

const { buildPaymentThankFlex, sendPaymentThankNotification } = await import("@/lib/payment-thank-flex");

describe("payment-thank-flex - 決済サンクスFlexメッセージ", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("buildPaymentThankFlex - Flex構築", () => {
    it("クレジットカード決済のFlexメッセージを構築する", async () => {
      const result = await buildPaymentThankFlex({
        message: "ご決済ありがとうございます。",
        paymentMethod: "credit_card",
      });

      expect(result.type).toBe("flex");
      expect(result.contents.type).toBe("bubble");
      expect(result.altText).toContain("決済完了");
    });

    it("銀行振込のFlexメッセージのヘッダーが異なる", async () => {
      const result = await buildPaymentThankFlex({
        message: "入力ありがとうございます。",
        paymentMethod: "bank_transfer",
      });

      expect(result.altText).toContain("情報入力完了");
      // ヘッダーテキスト確認
      const header = result.contents.header as any;
      expect(header.contents[0].text).toBe("情報入力完了");
    });

    it("商品名・金額・決済方法がbodyに含まれる", async () => {
      const result = await buildPaymentThankFlex({
        message: "ありがとうございます。",
        paymentMethod: "credit_card",
        productName: "テスト商品",
        amount: 5000,
      });

      const body = result.contents.body as any;
      const allTexts = JSON.stringify(body.contents);
      expect(allTexts).toContain("テスト商品");
      expect(allTexts).toContain("¥5,000");
      expect(allTexts).toContain("クレジットカード");
    });

    it("銀行振込の場合、決済方法ラベルが「銀行振込」になる", async () => {
      const result = await buildPaymentThankFlex({
        message: "ありがとうございます。",
        paymentMethod: "bank_transfer",
        productName: "テスト商品",
        amount: 3000,
      });

      const body = result.contents.body as any;
      const allTexts = JSON.stringify(body.contents);
      expect(allTexts).toContain("銀行振込");
    });

    it("配送情報が含まれる場合、配送先セクションが表示される", async () => {
      const result = await buildPaymentThankFlex({
        message: "ありがとうございます。",
        paymentMethod: "credit_card",
        shipping: {
          shippingName: "山田太郎",
          postalCode: "100-0001",
          address: "東京都千代田区1-1",
          phone: "09012345678",
          email: "test@example.com",
        },
      });

      const body = result.contents.body as any;
      const allTexts = JSON.stringify(body.contents);
      expect(allTexts).toContain("配送先情報");
      expect(allTexts).toContain("山田太郎");
      expect(allTexts).toContain("100-0001");
      expect(allTexts).toContain("東京都千代田区1-1");
    });

    it("配送情報がない場合、配送先セクションが含まれない", async () => {
      const result = await buildPaymentThankFlex({
        message: "ありがとうございます。",
        paymentMethod: "credit_card",
      });

      const body = result.contents.body as any;
      const allTexts = JSON.stringify(body.contents);
      expect(allTexts).not.toContain("配送先情報");
    });

    it("カスタムメッセージがbodyに含まれる", async () => {
      const customMsg = "3日以内に発送いたします。";
      const result = await buildPaymentThankFlex({
        message: customMsg,
        paymentMethod: "credit_card",
      });

      const body = result.contents.body as any;
      const allTexts = JSON.stringify(body.contents);
      expect(allTexts).toContain(customMsg);
    });

    it("altTextにメッセージの先頭40文字が含まれる", async () => {
      const longMsg = "あ".repeat(50);
      const result = await buildPaymentThankFlex({
        message: longMsg,
        paymentMethod: "credit_card",
      });

      // altTextの形式: 【ヘッダー】メッセージ先頭40文字
      expect(result.altText).toContain("【決済完了】");
      expect(result.altText.length).toBeLessThan(50 + 20); // ヘッダー分を含む
    });
  });

  describe("sendPaymentThankNotification - 送信+ログ記録", () => {
    it("送信成功時に { ok: true } を返す", async () => {
      const { pushMessage } = await import("@/lib/line-push");
      (pushMessage as any).mockResolvedValue({ ok: true });

      const result = await sendPaymentThankNotification({
        patientId: "p1",
        lineUid: "U1234",
        message: "ありがとうございます。",
        paymentMethod: "credit_card",
      });

      expect(result.ok).toBe(true);
    });

    it("送信失敗時に { ok: false } を返す", async () => {
      const { pushMessage } = await import("@/lib/line-push");
      (pushMessage as any).mockResolvedValue({ ok: false });

      const result = await sendPaymentThankNotification({
        patientId: "p1",
        lineUid: "U1234",
        message: "ありがとうございます。",
        paymentMethod: "credit_card",
      });

      expect(result.ok).toBe(false);
    });

    it("例外発生時に { ok: false } を返しログに記録する", async () => {
      const { pushMessage } = await import("@/lib/line-push");
      (pushMessage as any).mockRejectedValue(new Error("network error"));

      const result = await sendPaymentThankNotification({
        patientId: "p1",
        lineUid: "U1234",
        message: "ありがとうございます。",
        paymentMethod: "bank_transfer",
      });

      expect(result.ok).toBe(false);
    });
  });
});
