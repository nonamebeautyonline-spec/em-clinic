// __tests__/api/stripe-portal.test.ts
// Stripe Customer Portal API テスト

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
vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: mockSingle,
        })),
      })),
    })),
  },
}));

import { verifyPlatformAdmin } from "@/lib/platform-auth";
import { getStripeClient } from "@/lib/stripe";
import { POST } from "@/app/api/stripe/portal/route";

const mockAuth = verifyPlatformAdmin as ReturnType<typeof vi.fn>;
const mockGetStripe = getStripeClient as ReturnType<typeof vi.fn>;

function createRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/stripe/portal", {
    method: "POST",
    headers: { "Content-Type": "application/json", origin: "http://localhost:3000" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/stripe/portal", () => {
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
    const data = await res.json();
    expect(data.message).toContain("tenantId");
  });

  it("Stripe Customer未作成の場合400を返す", async () => {
    mockAuth.mockResolvedValue({ userId: "u1" });
    mockGetStripe.mockResolvedValue({});
    mockSingle.mockResolvedValue({ data: { stripe_customer_id: null }, error: null });
    const res = await POST(createRequest({ tenantId: "t1" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.message).toContain("Customer");
  });

  it("正常系: Portal URLを返す", async () => {
    mockAuth.mockResolvedValue({ userId: "u1" });
    const mockPortalCreate = vi.fn().mockResolvedValue({ url: "https://billing.stripe.com/session/xxx" });
    mockGetStripe.mockResolvedValue({
      billingPortal: { sessions: { create: mockPortalCreate } },
    });
    mockSingle.mockResolvedValue({ data: { stripe_customer_id: "cus_123" }, error: null });

    const res = await POST(createRequest({ tenantId: "t1" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.url).toContain("stripe.com");
    expect(mockPortalCreate).toHaveBeenCalledWith({
      customer: "cus_123",
      return_url: "http://localhost:3000/platform/billing",
    });
  });

  it("Stripe APIエラー時500を返す", async () => {
    mockAuth.mockResolvedValue({ userId: "u1" });
    const mockPortalCreate = vi.fn().mockRejectedValue(new Error("Stripe error"));
    mockGetStripe.mockResolvedValue({
      billingPortal: { sessions: { create: mockPortalCreate } },
    });
    mockSingle.mockResolvedValue({ data: { stripe_customer_id: "cus_123" }, error: null });

    const res = await POST(createRequest({ tenantId: "t1" }));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.message).toContain("Stripe error");
  });
});
