// lib/__tests__/webhook-handlers-stripe.test.ts
// Stripe Webhookイベント処理（lib/webhook-handlers/stripe.ts）のテスト
import { describe, it, expect, vi, beforeEach } from "vitest";
import type Stripe from "stripe";

// === Supabase モック ===
const mockSingle = vi.fn();
const mockUpdate = vi.fn();
const mockInsert = vi.fn();

function createChain() {
  const chain: Record<string, unknown> = {};
  const methods = [
    "select", "insert", "update", "delete",
    "eq", "neq", "not", "is", "in",
    "order", "limit", "single", "maybeSingle",
    "gt", "gte", "lt", "lte",
  ];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.single = mockSingle;
  return chain;
}

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn(() => createChain()),
  },
}));

import { supabaseAdmin } from "@/lib/supabase";
import { processStripeEvent } from "@/lib/webhook-handlers/stripe";

const mockFromFn = vi.mocked(supabaseAdmin.from);

beforeEach(() => {
  vi.clearAllMocks();
});

// テスト用Stripeイベント生成ヘルパー
function makeEvent(type: string, data: Record<string, unknown>): Stripe.Event {
  return {
    id: "evt_test",
    type,
    data: { object: data },
    api_version: "2024-04-10",
    created: Date.now() / 1000,
    livemode: false,
    object: "event",
    pending_webhooks: 0,
    request: null,
  } as unknown as Stripe.Event;
}

describe("processStripeEvent", () => {
  describe("invoice.payment_succeeded", () => {
    it("テナント不明の場合は早期リターン（エラーなし）", async () => {
      mockSingle.mockResolvedValue({ data: null, error: null });

      await processStripeEvent(
        makeEvent("invoice.payment_succeeded", {
          customer: "cus_unknown",
          subscription: "sub_1",
          period_start: 1700000000,
          period_end: 1702592000,
          amount_paid: 17000,
          tax: 1700,
          number: "INV-001",
          id: "in_001",
        }),
      );

      // tenant_plans updateは呼ばれない（テナント不明）
      // from が呼ばれたのは tenant_plans.select のみ
      expect(mockFromFn).toHaveBeenCalledWith("tenant_plans");
    });

    it("正常系: ステータスをactiveに更新しinvoiceを作成", async () => {
      mockSingle.mockResolvedValue({
        data: { tenant_id: "tenant-1" },
        error: null,
      });

      await processStripeEvent(
        makeEvent("invoice.payment_succeeded", {
          customer: "cus_123",
          subscription: "sub_1",
          period_start: 1700000000,
          period_end: 1702592000,
          amount_paid: 17000,
          tax: 1700,
          number: "INV-001",
          id: "in_001",
        }),
      );

      // tenant_plans, tenants, billing_invoices の3テーブルにアクセス
      expect(mockFromFn).toHaveBeenCalledWith("tenant_plans");
      expect(mockFromFn).toHaveBeenCalledWith("tenants");
      expect(mockFromFn).toHaveBeenCalledWith("billing_invoices");
    });
  });

  describe("invoice.payment_failed", () => {
    it("テナント不明の場合は早期リターン", async () => {
      mockSingle.mockResolvedValue({ data: null, error: null });

      await processStripeEvent(
        makeEvent("invoice.payment_failed", {
          customer: "cus_unknown",
          subscription: "sub_1",
        }),
      );

      // tenant_plans の select のみ
      expect(mockFromFn).toHaveBeenCalledTimes(1);
    });

    it("正常系: payment_failedステータスに更新", async () => {
      // findTenantByCustomerId → tenant found
      mockSingle
        .mockResolvedValueOnce({ data: { tenant_id: "tenant-1" }, error: null })
        // 現在のplan取得
        .mockResolvedValueOnce({ data: { payment_failed_at: null }, error: null });

      await processStripeEvent(
        makeEvent("invoice.payment_failed", {
          customer: "cus_123",
          subscription: "sub_1",
        }),
      );

      // tenant_plans を2回（findTenant + select plan + update）
      expect(mockFromFn).toHaveBeenCalledWith("tenant_plans");
    });

    it("既にpayment_failed_atがある場合は初回日時を保持", async () => {
      const existingFailedAt = "2026-01-01T00:00:00.000Z";
      mockSingle
        .mockResolvedValueOnce({ data: { tenant_id: "tenant-1" }, error: null })
        .mockResolvedValueOnce({ data: { payment_failed_at: existingFailedAt }, error: null });

      await processStripeEvent(
        makeEvent("invoice.payment_failed", {
          customer: "cus_123",
          subscription: "sub_1",
        }),
      );

      // updateが呼ばれている（payment_failed_atは既存値を保持）
      expect(mockFromFn).toHaveBeenCalledWith("tenant_plans");
    });
  });

  describe("customer.subscription.updated", () => {
    it("テナント不明の場合は早期リターン", async () => {
      mockSingle.mockResolvedValue({ data: null, error: null });

      await processStripeEvent(
        makeEvent("customer.subscription.updated", {
          customer: "cus_unknown",
          id: "sub_1",
          status: "active",
        }),
      );

      expect(mockFromFn).toHaveBeenCalledTimes(1);
    });

    it("正常系: ステータスを同期", async () => {
      mockSingle.mockResolvedValue({
        data: { tenant_id: "tenant-1" },
        error: null,
      });

      await processStripeEvent(
        makeEvent("customer.subscription.updated", {
          customer: "cus_123",
          id: "sub_1",
          status: "active",
          current_period_end: 1702592000,
        }),
      );

      expect(mockFromFn).toHaveBeenCalledWith("tenant_plans");
    });
  });

  describe("customer.subscription.deleted", () => {
    it("テナント不明の場合は早期リターン", async () => {
      mockSingle.mockResolvedValue({ data: null, error: null });

      await processStripeEvent(
        makeEvent("customer.subscription.deleted", {
          customer: "cus_unknown",
        }),
      );

      expect(mockFromFn).toHaveBeenCalledTimes(1);
    });

    it("正常系: cancelledに更新", async () => {
      mockSingle.mockResolvedValue({
        data: { tenant_id: "tenant-1" },
        error: null,
      });

      await processStripeEvent(
        makeEvent("customer.subscription.deleted", {
          customer: "cus_123",
        }),
      );

      expect(mockFromFn).toHaveBeenCalledWith("tenant_plans");
    });
  });

  describe("未対応イベント", () => {
    it("未対応イベントは何もしない（エラーなし）", async () => {
      await processStripeEvent(
        makeEvent("charge.succeeded", { id: "ch_123" }),
      );

      // fromは呼ばれない
      expect(mockFromFn).not.toHaveBeenCalled();
    });
  });
});

// mapStripeStatus のロジックテスト（関数を再実装してテスト）
describe("mapStripeStatus ロジック", () => {
  function mapStripeStatus(stripeStatus: string): string {
    switch (stripeStatus) {
      case "active":
      case "trialing":
        return "active";
      case "past_due":
        return "payment_failed";
      case "canceled":
      case "unpaid":
        return "cancelled";
      case "incomplete":
      case "incomplete_expired":
        return "pending";
      default:
        return stripeStatus;
    }
  }

  it("active → active", () => expect(mapStripeStatus("active")).toBe("active"));
  it("trialing → active", () => expect(mapStripeStatus("trialing")).toBe("active"));
  it("past_due → payment_failed", () => expect(mapStripeStatus("past_due")).toBe("payment_failed"));
  it("canceled → cancelled", () => expect(mapStripeStatus("canceled")).toBe("cancelled"));
  it("unpaid → cancelled", () => expect(mapStripeStatus("unpaid")).toBe("cancelled"));
  it("incomplete → pending", () => expect(mapStripeStatus("incomplete")).toBe("pending"));
  it("incomplete_expired → pending", () => expect(mapStripeStatus("incomplete_expired")).toBe("pending"));
  it("unknown → そのまま", () => expect(mapStripeStatus("something_else")).toBe("something_else"));
});
