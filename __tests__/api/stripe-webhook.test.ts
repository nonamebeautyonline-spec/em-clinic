// __tests__/api/stripe-webhook.test.ts
// Stripe Webhook API テスト

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// モック設定
vi.mock("@/lib/stripe", () => ({
  verifyWebhookSignature: vi.fn(),
}));

vi.mock("@/lib/idempotency", () => ({
  checkIdempotency: vi.fn(),
}));

// 再帰的にチェーン可能なモック
function chainMock(): Record<string, ReturnType<typeof vi.fn>> {
  const mock: Record<string, ReturnType<typeof vi.fn>> = {};
  const handler = {
    get: (_: unknown, prop: string) => {
      if (prop === "then") return undefined; // Promiseチェーン防止
      if (!mock[prop]) {
        mock[prop] = vi.fn(() => new Proxy({}, handler));
      }
      return mock[prop];
    },
  };
  return new Proxy({}, handler) as Record<string, ReturnType<typeof vi.fn>>;
}

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn(() => chainMock()),
  },
}));

import { verifyWebhookSignature } from "@/lib/stripe";
import { checkIdempotency } from "@/lib/idempotency";
import { POST } from "@/app/api/stripe/webhook/route";

const mockVerify = verifyWebhookSignature as ReturnType<typeof vi.fn>;
const mockCheckIdempotency = checkIdempotency as ReturnType<typeof vi.fn>;

function createRequest(body: string, sig = "test_sig"): NextRequest {
  return new NextRequest("http://localhost/api/stripe/webhook", {
    method: "POST",
    body,
    headers: { "stripe-signature": sig },
  });
}

describe("POST /api/stripe/webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("署名なしの場合400を返す", async () => {
    const req = new NextRequest("http://localhost/api/stripe/webhook", {
      method: "POST",
      body: "{}",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("署名");
  });

  it("署名検証失敗時は400を返す", async () => {
    mockVerify.mockResolvedValue(null);
    const req = createRequest("{}");
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("重複イベントはスキップ", async () => {
    mockVerify.mockResolvedValue({ id: "evt_123", type: "test" });
    mockCheckIdempotency.mockResolvedValue({
      duplicate: true,
      markCompleted: vi.fn(),
      markFailed: vi.fn(),
    });

    const req = createRequest("{}");
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.duplicate).toBe(true);
  });

  it("未知のイベントタイプでも200を返す", async () => {
    mockVerify.mockResolvedValue({ id: "evt_456", type: "unknown.event" });
    const markCompleted = vi.fn();
    mockCheckIdempotency.mockResolvedValue({
      duplicate: false,
      markCompleted,
      markFailed: vi.fn(),
    });

    const req = createRequest("{}");
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(markCompleted).toHaveBeenCalled();
  });

  it("invoice.payment_succeeded イベントを処理", async () => {
    const mockEvent = {
      id: "evt_inv_1",
      type: "invoice.payment_succeeded",
      data: {
        object: {
          customer: "cus_123",
          subscription: "sub_123",
          period_start: Math.floor(Date.now() / 1000),
          period_end: Math.floor(Date.now() / 1000) + 2592000,
          amount_paid: 17000,
          tax: 1700,
          number: "INV-001",
          id: "inv_123",
        },
      },
    };

    mockVerify.mockResolvedValue(mockEvent);
    const markCompleted = vi.fn();
    mockCheckIdempotency.mockResolvedValue({
      duplicate: false,
      markCompleted,
      markFailed: vi.fn(),
    });

    const req = createRequest(JSON.stringify(mockEvent));
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(markCompleted).toHaveBeenCalled();
  });

  it("invoice.payment_failed イベントを処理", async () => {
    const mockEvent = {
      id: "evt_inv_fail",
      type: "invoice.payment_failed",
      data: {
        object: {
          customer: "cus_456",
          subscription: "sub_456",
        },
      },
    };

    mockVerify.mockResolvedValue(mockEvent);
    const markCompleted = vi.fn();
    mockCheckIdempotency.mockResolvedValue({
      duplicate: false,
      markCompleted,
      markFailed: vi.fn(),
    });

    const req = createRequest(JSON.stringify(mockEvent));
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(markCompleted).toHaveBeenCalled();
  });

  it("customer.subscription.updated イベントを処理", async () => {
    const mockEvent = {
      id: "evt_sub_upd",
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_789",
          customer: "cus_789",
          status: "active",
          current_period_end: Math.floor(Date.now() / 1000) + 2592000,
        },
      },
    };

    mockVerify.mockResolvedValue(mockEvent);
    const markCompleted = vi.fn();
    mockCheckIdempotency.mockResolvedValue({
      duplicate: false,
      markCompleted,
      markFailed: vi.fn(),
    });

    const req = createRequest(JSON.stringify(mockEvent));
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(markCompleted).toHaveBeenCalled();
  });

  it("customer.subscription.deleted イベントを処理", async () => {
    const mockEvent = {
      id: "evt_sub_del",
      type: "customer.subscription.deleted",
      data: {
        object: {
          id: "sub_del",
          customer: "cus_del",
        },
      },
    };

    mockVerify.mockResolvedValue(mockEvent);
    const markCompleted = vi.fn();
    mockCheckIdempotency.mockResolvedValue({
      duplicate: false,
      markCompleted,
      markFailed: vi.fn(),
    });

    const req = createRequest(JSON.stringify(mockEvent));
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(markCompleted).toHaveBeenCalled();
  });
});
