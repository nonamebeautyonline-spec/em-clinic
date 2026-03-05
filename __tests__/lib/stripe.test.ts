// __tests__/lib/stripe.test.ts
// lib/stripe.ts のテスト

import { describe, it, expect, vi, beforeEach } from "vitest";

// モック
const mockRetrieve = vi.fn();
const mockConstructEvent = vi.fn();

vi.mock("stripe", () => {
  // class-like constructor mock
  function MockStripe() {
    return {
      accounts: { retrieve: mockRetrieve },
      webhooks: { constructEvent: mockConstructEvent },
    };
  }
  return { default: MockStripe };
});

vi.mock("@/lib/supabase", () => {
  const mockSingle = vi.fn();
  return {
    supabaseAdmin: {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({ single: mockSingle })),
        })),
      })),
    },
    __mockSingle: mockSingle,
  };
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabaseMod = await import("@/lib/supabase") as any;

describe("lib/stripe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 環境変数をクリア
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
  });

  describe("getStripeClient", () => {
    it("キー設定済みの場合、クライアントを返す", async () => {
      supabaseMod.__mockSingle.mockResolvedValue({
        data: { value: "sk_test_xxx" },
        error: null,
      });

      const { getStripeClient } = await import("@/lib/stripe");
      const client = await getStripeClient();
      expect(client).not.toBeNull();
    });

    it("キー未設定でenv変数もない場合nullを返す", async () => {
      supabaseMod.__mockSingle.mockResolvedValue({
        data: null,
        error: null,
      });

      const { getStripeClient } = await import("@/lib/stripe");
      const client = await getStripeClient();
      expect(client).toBeNull();
    });

    it("DB接続エラー時は環境変数にフォールバック", async () => {
      supabaseMod.__mockSingle.mockRejectedValue(new Error("DB error"));
      process.env.STRIPE_SECRET_KEY = "sk_test_env_key";

      const { getStripeClient } = await import("@/lib/stripe");
      const client = await getStripeClient();
      expect(client).not.toBeNull();
    });
  });

  describe("testStripeConnection", () => {
    it("接続成功時はokとアカウント名を返す", async () => {
      supabaseMod.__mockSingle.mockResolvedValue({
        data: { value: "sk_test_conn" },
        error: null,
      });
      mockRetrieve.mockResolvedValue({
        id: "acct_123",
        settings: { dashboard: { display_name: "Test Clinic" } },
      });

      const { testStripeConnection } = await import("@/lib/stripe");
      const result = await testStripeConnection();
      expect(result.ok).toBe(true);
      expect(result.accountName).toBe("Test Clinic");
    });

    it("Stripe APIエラー時はエラーメッセージを返す", async () => {
      supabaseMod.__mockSingle.mockResolvedValue({
        data: { value: "sk_test_fail" },
        error: null,
      });
      mockRetrieve.mockRejectedValue(new Error("Invalid API Key"));

      const { testStripeConnection } = await import("@/lib/stripe");
      const result = await testStripeConnection();
      expect(result.ok).toBe(false);
      expect(result.error).toContain("Invalid API Key");
    });

    it("キー未設定時はエラーを返す", async () => {
      supabaseMod.__mockSingle.mockResolvedValue({
        data: null,
        error: null,
      });

      const { testStripeConnection } = await import("@/lib/stripe");
      const result = await testStripeConnection();
      expect(result.ok).toBe(false);
      expect(result.error).toContain("APIキー");
    });
  });

  describe("verifyWebhookSignature", () => {
    it("署名検証成功時はイベントを返す", async () => {
      supabaseMod.__mockSingle
        .mockResolvedValueOnce({ data: { value: "sk_test_wh" }, error: null })
        .mockResolvedValueOnce({ data: { value: "whsec_test" }, error: null });

      const mockEvent = { id: "evt_1", type: "test" };
      mockConstructEvent.mockReturnValue(mockEvent);

      const { verifyWebhookSignature } = await import("@/lib/stripe");
      const result = await verifyWebhookSignature("body", "sig");
      expect(result).toEqual(mockEvent);
    });

    it("署名検証失敗時はnullを返す", async () => {
      supabaseMod.__mockSingle
        .mockResolvedValueOnce({ data: { value: "sk_test_wh2" }, error: null })
        .mockResolvedValueOnce({ data: { value: "whsec_test" }, error: null });

      mockConstructEvent.mockImplementation(() => {
        throw new Error("Invalid signature");
      });

      const { verifyWebhookSignature } = await import("@/lib/stripe");
      const result = await verifyWebhookSignature("body", "bad_sig");
      expect(result).toBeNull();
    });

    it("Webhook Secret未設定時はnullを返す", async () => {
      supabaseMod.__mockSingle
        .mockResolvedValueOnce({ data: { value: "sk_test_wh3" }, error: null })
        .mockResolvedValueOnce({ data: null, error: null });

      const { verifyWebhookSignature } = await import("@/lib/stripe");
      const result = await verifyWebhookSignature("body", "sig");
      expect(result).toBeNull();
    });
  });

  describe("simpleHash (internal)", () => {
    it("同じ入力には同じハッシュを返す（キャッシュテスト）", async () => {
      supabaseMod.__mockSingle.mockResolvedValue({
        data: { value: "sk_test_same_key" },
        error: null,
      });

      const { getStripeClient } = await import("@/lib/stripe");
      const client1 = await getStripeClient();
      const client2 = await getStripeClient();
      // キャッシュにより同じインスタンスが返される
      expect(client1).toBe(client2);
    });
  });
});
