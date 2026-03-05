// __tests__/api/stripe-checkout.test.ts
// Stripe Checkout Session API テスト

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// モック
vi.mock("@/lib/platform-auth", () => ({
  verifyPlatformAdmin: vi.fn(),
}));

vi.mock("@/lib/stripe", () => ({
  getStripeClient: vi.fn(),
}));

const mockSingle = vi.fn();
const mockUpdateEq = vi.fn();
vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: mockSingle,
        })),
      })),
      update: vi.fn(() => ({
        eq: mockUpdateEq,
      })),
    })),
  },
}));

vi.mock("@/lib/plan-config", () => ({
  getPlanByKey: vi.fn((key: string) => {
    if (key === "premium") {
      return {
        key: "premium",
        label: "プレミアム",
        messageQuota: 100000,
        monthlyPrice: 50000,
        overageUnitPrice: 0.5,
        stripePriceId: "price_premium_123",
      };
    }
    return {
      key: "standard",
      label: "スタンダード",
      messageQuota: 30000,
      monthlyPrice: 17000,
      overageUnitPrice: 0.7,
      stripePriceId: "",
    };
  }),
}));

import { verifyPlatformAdmin } from "@/lib/platform-auth";
import { getStripeClient } from "@/lib/stripe";
import { POST } from "@/app/api/stripe/checkout/route";

const mockAuth = verifyPlatformAdmin as ReturnType<typeof vi.fn>;
const mockGetStripe = getStripeClient as ReturnType<typeof vi.fn>;

function createRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/stripe/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json", origin: "http://localhost:3000" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/stripe/checkout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("未認証の場合403を返す", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(createRequest({ tenantId: "t1" }));
    expect(res.status).toBe(403);
  });

  it("Stripe未設定の場合400を返す", async () => {
    mockAuth.mockResolvedValue({ userId: "u1" });
    mockGetStripe.mockResolvedValue(null);
    const res = await POST(createRequest({ tenantId: "t1" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.message).toContain("Stripe");
  });

  it("tenantId未指定の場合400を返す", async () => {
    mockAuth.mockResolvedValue({ userId: "u1" });
    mockGetStripe.mockResolvedValue({});
    const res = await POST(createRequest({}));
    expect(res.status).toBe(400);
  });

  it("テナント未発見の場合404を返す", async () => {
    mockAuth.mockResolvedValue({ userId: "u1" });
    mockGetStripe.mockResolvedValue({});
    mockSingle.mockResolvedValue({ data: null, error: null });

    const res = await POST(createRequest({ tenantId: "t1" }));
    expect(res.status).toBe(404);
  });

  it("正常系: price_dataで動的Checkout Session作成（Customer新規作成）", async () => {
    mockAuth.mockResolvedValue({ userId: "u1" });
    const mockSessionCreate = vi.fn().mockResolvedValue({ url: "https://checkout.stripe.com/session/xxx" });
    const mockCustomerCreate = vi.fn().mockResolvedValue({ id: "cus_new" });
    mockGetStripe.mockResolvedValue({
      customers: { create: mockCustomerCreate },
      checkout: { sessions: { create: mockSessionCreate } },
    });
    mockSingle.mockResolvedValue({
      data: {
        plan_name: "standard",
        stripe_customer_id: null,
        monthly_fee: 17000,
        tenants: { name: "Test Clinic" },
      },
      error: null,
    });

    const res = await POST(createRequest({ tenantId: "t1" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.url).toContain("stripe.com");
    expect(mockCustomerCreate).toHaveBeenCalled();
  });

  it("正常系: stripePriceId設定済みのCheckout Session作成", async () => {
    mockAuth.mockResolvedValue({ userId: "u1" });
    const mockSessionCreate = vi.fn().mockResolvedValue({ url: "https://checkout.stripe.com/session/yyy" });
    mockGetStripe.mockResolvedValue({
      checkout: { sessions: { create: mockSessionCreate } },
    });
    mockSingle.mockResolvedValue({
      data: {
        plan_name: "premium",
        stripe_customer_id: "cus_existing",
        monthly_fee: 50000,
        tenants: { name: "Premium Clinic" },
      },
      error: null,
    });

    const res = await POST(createRequest({ tenantId: "t1" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(mockSessionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [{ price: "price_premium_123", quantity: 1 }],
      }),
    );
  });

  it("Stripe APIエラー時500を返す", async () => {
    mockAuth.mockResolvedValue({ userId: "u1" });
    mockGetStripe.mockResolvedValue({
      checkout: { sessions: { create: vi.fn().mockRejectedValue(new Error("Stripe API error")) } },
    });
    mockSingle.mockResolvedValue({
      data: {
        plan_name: "standard",
        stripe_customer_id: "cus_123",
        monthly_fee: 17000,
        tenants: { name: "Clinic" },
      },
      error: null,
    });

    const res = await POST(createRequest({ tenantId: "t1" }));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.message).toContain("Stripe API error");
  });
});
