// __tests__/api/dashboard-trends.test.ts
// 売上トレンドAPI テスト（RPC版）
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRpc = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    rpc: mockRpc,
  })),
}));

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: { rpc: (...args: unknown[]) => mockRpc(...args) },
}));

const mockVerifyAdminAuth = vi.fn();
vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: (...args: unknown[]) => mockVerifyAdminAuth(...args),
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  resolveTenantIdOrThrow: vi.fn(() => "test-tenant"),
  withTenant: vi.fn((q: unknown) => q),
  strictWithTenant: vi.fn((q: unknown) => q),
}));

import { NextRequest } from "next/server";
import { GET } from "@/app/api/admin/dashboard-trends/route";

function createNextRequest(url: string) {
  return new NextRequest(new Request(url));
}

describe("売上トレンドAPI - GET（RPC版）", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyAdminAuth.mockResolvedValue(true);
  });

  it("未認証の場合は401を返す", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const req = createNextRequest("http://localhost/api/admin/dashboard-trends");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("月別トレンド: データなしの場合は空のトレンド配列を返す", async () => {
    const now = new Date();
    const jstOffset = 9 * 60 * 60 * 1000;
    const jstNow = new Date(now.getTime() + jstOffset);
    const year = jstNow.getUTCFullYear();
    const month = jstNow.getUTCMonth();

    const trends = [];
    for (let i = 12; i >= 0; i--) {
      const m = new Date(Date.UTC(year, month - i, 1));
      trends.push({
        period: `${m.getUTCFullYear()}-${String(m.getUTCMonth() + 1).padStart(2, "0")}`,
        label: `${m.getUTCFullYear()}/${m.getUTCMonth() + 1}`,
        square: 0,
        bankTransfer: 0,
        total: 0,
        gross: 0,
        refunded: 0,
        orderCount: 0,
        uniquePatients: 0,
      });
    }

    mockRpc.mockResolvedValue({
      data: {
        granularity: "monthly",
        trends,
        comparison: { mom: null, yoy: null },
        currentPeriod: trends[trends.length - 1],
      },
      error: null,
    });

    const req = createNextRequest("http://localhost/api/admin/dashboard-trends");
    const res = await GET(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.granularity).toBe("monthly");
    expect(Array.isArray(json.trends)).toBe(true);
    expect(json.trends.length).toBe(13);
    for (const t of json.trends) {
      expect(t.total).toBe(0);
      expect(t.square).toBe(0);
      expect(t.bankTransfer).toBe(0);
    }
    expect(json.currentPeriod).toBeTruthy();

    // RPC呼び出しパラメータの検証
    expect(mockRpc).toHaveBeenCalledWith("dashboard_revenue_trends", {
      p_tenant_id: "test-tenant",
      p_mode: "monthly",
      p_months: 12,
    });
  });

  it("月別トレンド: データありの場合に正しく返される", async () => {
    const now = new Date();
    const jstOffset = 9 * 60 * 60 * 1000;
    const jstNow = new Date(now.getTime() + jstOffset);
    const year = jstNow.getUTCFullYear();
    const month = jstNow.getUTCMonth();
    const currentKey = `${year}-${String(month + 1).padStart(2, "0")}`;

    const currentPeriod = {
      period: currentKey,
      label: `${year}/${month + 1}`,
      square: 30000,
      bankTransfer: 5000,
      total: 32000,
      gross: 35000,
      refunded: 3000,
      orderCount: 3,
      uniquePatients: 3,
    };

    mockRpc.mockResolvedValue({
      data: {
        granularity: "monthly",
        trends: [currentPeriod],
        comparison: { mom: null, yoy: null },
        currentPeriod,
      },
      error: null,
    });

    const req = createNextRequest("http://localhost/api/admin/dashboard-trends");
    const res = await GET(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.granularity).toBe("monthly");

    const current = json.currentPeriod;
    expect(current.square).toBe(30000);
    expect(current.bankTransfer).toBe(5000);
    expect(current.gross).toBe(35000);
    expect(current.refunded).toBe(3000);
    expect(current.total).toBe(32000);
    expect(current.orderCount).toBe(3);
    expect(current.uniquePatients).toBe(3);
  });

  it("年別トレンド: granularity=yearlyを指定すると年別データを返す", async () => {
    const now = new Date();
    const jstOffset = 9 * 60 * 60 * 1000;
    const jstNow = new Date(now.getTime() + jstOffset);
    const currentYear = jstNow.getUTCFullYear();

    const trends = [];
    for (let y = currentYear - 5; y <= currentYear; y++) {
      trends.push({
        period: String(y),
        label: `${y}年`,
        square: 0,
        bankTransfer: 0,
        total: 0,
        gross: 0,
        refunded: 0,
        orderCount: 0,
        uniquePatients: 0,
      });
    }

    mockRpc.mockResolvedValue({
      data: {
        granularity: "yearly",
        trends,
        comparison: { yoy: null },
        currentPeriod: trends[trends.length - 1],
      },
      error: null,
    });

    const req = createNextRequest("http://localhost/api/admin/dashboard-trends?granularity=yearly");
    const res = await GET(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.granularity).toBe("yearly");
    expect(Array.isArray(json.trends)).toBe(true);
    expect(json.trends.length).toBe(6);
    for (const t of json.trends) {
      expect(t.label).toMatch(/^\d{4}年$/);
    }

    // RPC呼び出しパラメータの検証（yearlyモード）
    expect(mockRpc).toHaveBeenCalledWith("dashboard_revenue_trends", {
      p_tenant_id: "test-tenant",
      p_mode: "yearly",
      p_months: 12,
    });
  });

  it("RPCエラー時は500を返す", async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: "DB接続エラー" },
    });

    const req = createNextRequest("http://localhost/api/admin/dashboard-trends");
    const res = await GET(req);
    expect(res.status).toBe(500);
  });

  it("例外スロー時は500を返す", async () => {
    mockRpc.mockRejectedValue(new Error("Unexpected error"));

    const req = createNextRequest("http://localhost/api/admin/dashboard-trends");
    const res = await GET(req);
    expect(res.status).toBe(500);
  });
});
