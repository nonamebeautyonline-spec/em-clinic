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

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(),
      })),
    })),
  },
}));

vi.mock("@/lib/plan-config", () => ({
  getPlanByKey: vi.fn(() => ({
    key: "standard",
    label: "スタンダード",
    messageQuota: 30000,
    monthlyPrice: 17000,
    overageUnitPrice: 0.7,
    stripePriceId: "",
  })),
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
    expect(data.error).toContain("Stripe");
  });

  it("tenantId未指定の場合400を返す", async () => {
    mockAuth.mockResolvedValue({ userId: "u1" });
    mockGetStripe.mockResolvedValue({});
    const res = await POST(createRequest({}));
    expect(res.status).toBe(400);
  });
});
