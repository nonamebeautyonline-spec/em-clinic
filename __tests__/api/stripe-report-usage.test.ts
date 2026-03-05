// __tests__/api/stripe-report-usage.test.ts
// 月次使用量Stripe報告Cron テスト

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// モック
vi.mock("@/lib/stripe", () => ({
  getStripeClient: vi.fn(),
}));

vi.mock("@/lib/distributed-lock", () => ({
  acquireLock: vi.fn(),
}));

const mockSelectData = vi.fn();
const mockUpdateEq = vi.fn();
vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => {
      if (table === "monthly_usage") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => mockSelectData()),
          })),
          update: vi.fn(() => ({
            eq: mockUpdateEq,
          })),
        };
      }
      // tenant_plans
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { stripe_customer_id: "cus_123", stripe_subscription_id: "sub_123" },
              error: null,
            }),
          })),
        })),
      };
    }),
  },
}));

import { getStripeClient } from "@/lib/stripe";
import { acquireLock } from "@/lib/distributed-lock";
import { GET } from "@/app/api/cron/report-usage/route";

const mockGetStripe = getStripeClient as ReturnType<typeof vi.fn>;
const mockAcquireLock = acquireLock as ReturnType<typeof vi.fn>;

function createRequest(): NextRequest {
  return new NextRequest("http://localhost/api/cron/report-usage", {
    method: "GET",
    headers: { authorization: `Bearer ${process.env.CRON_SECRET || "test-secret"}` },
  });
}

describe("GET /api/cron/report-usage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "test-secret";
  });

  it("認証なしの場合401を返す", async () => {
    const req = new NextRequest("http://localhost/api/cron/report-usage", {
      method: "GET",
      headers: { authorization: "Bearer wrong-secret" },
    });
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("ロック取得失敗時はスキップ", async () => {
    mockAcquireLock.mockResolvedValue({ acquired: false });
    const res = await GET(createRequest());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.skipped).toBe(true);
  });

  it("Stripe未設定時はスキップ", async () => {
    mockAcquireLock.mockResolvedValue({ acquired: true, release: vi.fn() });
    mockGetStripe.mockResolvedValue(null);
    const res = await GET(createRequest());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.skipped).toBe(true);
  });

  it("報告対象なしの場合reported=0", async () => {
    const mockRelease = vi.fn();
    mockAcquireLock.mockResolvedValue({ acquired: true, release: mockRelease });
    mockGetStripe.mockResolvedValue({});
    mockSelectData.mockResolvedValue({ data: [], error: null });

    const res = await GET(createRequest());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.reported).toBe(0);
    expect(mockRelease).toHaveBeenCalled();
  });

  it("使用量データ取得エラー時500を返す", async () => {
    mockAcquireLock.mockResolvedValue({ acquired: true, release: vi.fn() });
    mockGetStripe.mockResolvedValue({});
    mockSelectData.mockResolvedValue({ data: null, error: { message: "DB error" } });

    const res = await GET(createRequest());
    expect(res.status).toBe(500);
  });

  it("正常系: 使用量をStripeに報告", async () => {
    const mockRelease = vi.fn();
    mockAcquireLock.mockResolvedValue({ acquired: true, release: mockRelease });
    const mockMeterCreate = vi.fn().mockResolvedValue({});
    mockGetStripe.mockResolvedValue({
      billing: { meterEvents: { create: mockMeterCreate } },
    });
    mockSelectData.mockResolvedValue({
      data: [{ id: "u1", tenant_id: "t1", year_month: "2026-03", message_count: 500 }],
      error: null,
    });

    const res = await GET(createRequest());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.reported).toBe(1);
    expect(mockMeterCreate).toHaveBeenCalled();
    expect(mockRelease).toHaveBeenCalled();
  });
});
