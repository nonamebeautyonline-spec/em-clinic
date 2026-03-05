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
  });

  describe("testStripeConnection", () => {
    it("関数がエクスポートされている", async () => {
      const { testStripeConnection } = await import("@/lib/stripe");
      expect(typeof testStripeConnection).toBe("function");
    });
  });

  describe("verifyWebhookSignature", () => {
    it("関数がエクスポートされている", async () => {
      const { verifyWebhookSignature } = await import("@/lib/stripe");
      expect(typeof verifyWebhookSignature).toBe("function");
    });
  });

  describe("simpleHash (internal)", () => {
    it("同じ入力には同じハッシュを返す", async () => {
      // simpleHashは内部関数だがキャッシュの同一性テスト
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
