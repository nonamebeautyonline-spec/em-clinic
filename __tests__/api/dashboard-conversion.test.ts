// __tests__/api/dashboard-conversion.test.ts
// 初診→再診転換率API テスト（RPC版）
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

import { GET } from "@/app/api/admin/dashboard-conversion/route";

describe("初診→再診転換率API - GET（RPC版）", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyAdminAuth.mockResolvedValue(true);
  });

  it("未認証の場合は401を返す", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const req = new Request("http://localhost/api/admin/dashboard-conversion");
    const res = await GET(req as any);
    expect(res.status).toBe(401);
  });

  it("データなしの場合はゼロ値のコホートを返す", async () => {
    // 13ヶ月分のゼロ値コホートを生成
    const now = new Date();
    const jstOffset = 9 * 60 * 60 * 1000;
    const jstNow = new Date(now.getTime() + jstOffset);
    const year = jstNow.getUTCFullYear();
    const month = jstNow.getUTCMonth();

    const cohorts = [];
    for (let i = 12; i >= 0; i--) {
      const m = new Date(Date.UTC(year, month - i, 1));
      const period = `${m.getUTCFullYear()}-${String(m.getUTCMonth() + 1).padStart(2, "0")}`;
      cohorts.push({
        period,
        label: `${m.getUTCFullYear()}/${m.getUTCMonth() + 1}`,
        newPatients: 0,
        returnedPatients: 0,
        conversionRate: 0,
        avgDaysToReturn: null,
      });
    }

    mockRpc.mockResolvedValue({
      data: {
        cohorts,
        overall: { totalNew: 0, totalReturned: 0, conversionRate: 0 },
      },
      error: null,
    });

    const req = new Request("http://localhost/api/admin/dashboard-conversion");
    const res = await GET(req as any);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(Array.isArray(json.cohorts)).toBe(true);
    expect(json.cohorts.length).toBe(13);
    for (const c of json.cohorts) {
      expect(c.newPatients).toBe(0);
      expect(c.returnedPatients).toBe(0);
      expect(c.conversionRate).toBe(0);
    }
    expect(json.overall.totalNew).toBe(0);
    expect(json.overall.totalReturned).toBe(0);
    expect(json.overall.conversionRate).toBe(0);

    // RPC呼び出しパラメータの検証
    expect(mockRpc).toHaveBeenCalledWith("dashboard_conversion_cohorts", {
      p_tenant_id: "test-tenant",
      p_months: 12,
    });
  });

  it("データありの場合にコホート転換率が正しく返される", async () => {
    const now = new Date();
    const jstOffset = 9 * 60 * 60 * 1000;
    const jstNow = new Date(now.getTime() + jstOffset);
    const year = jstNow.getUTCFullYear();
    const month = jstNow.getUTCMonth();
    const currentKey = `${year}-${String(month + 1).padStart(2, "0")}`;

    const cohorts = [{
      period: currentKey,
      label: `${year}/${month + 1}`,
      newPatients: 2,
      returnedPatients: 1,
      conversionRate: 50,
      avgDaysToReturn: 14,
    }];

    mockRpc.mockResolvedValue({
      data: {
        cohorts,
        overall: { totalNew: 2, totalReturned: 1, conversionRate: 50 },
      },
      error: null,
    });

    const req = new Request("http://localhost/api/admin/dashboard-conversion");
    const res = await GET(req as any);
    expect(res.status).toBe(200);

    const json = await res.json();
    const currentCohort = json.cohorts.find((c: any) => c.period === currentKey);
    expect(currentCohort).toBeTruthy();
    expect(currentCohort.newPatients).toBe(2);
    expect(currentCohort.returnedPatients).toBe(1);
    expect(currentCohort.conversionRate).toBe(50);

    expect(json.overall.totalNew).toBe(2);
    expect(json.overall.totalReturned).toBe(1);
    expect(json.overall.conversionRate).toBe(50);
  });

  it("reordersの決済済み患者も再診としてカウントされる（RPC内部で処理）", async () => {
    const now = new Date();
    const jstOffset = 9 * 60 * 60 * 1000;
    const jstNow = new Date(now.getTime() + jstOffset);
    const year = jstNow.getUTCFullYear();
    const month = jstNow.getUTCMonth();
    const currentKey = `${year}-${String(month + 1).padStart(2, "0")}`;

    mockRpc.mockResolvedValue({
      data: {
        cohorts: [{
          period: currentKey,
          label: `${year}/${month + 1}`,
          newPatients: 2,
          returnedPatients: 1,
          conversionRate: 50,
          avgDaysToReturn: 19,
        }],
        overall: { totalNew: 2, totalReturned: 1, conversionRate: 50 },
      },
      error: null,
    });

    const req = new Request("http://localhost/api/admin/dashboard-conversion");
    const res = await GET(req as any);
    expect(res.status).toBe(200);

    const json = await res.json();
    const currentCohort = json.cohorts.find((c: any) => c.period === currentKey);
    expect(currentCohort).toBeTruthy();
    expect(currentCohort.newPatients).toBe(2);
    expect(currentCohort.returnedPatients).toBe(1);
    expect(currentCohort.conversionRate).toBe(50);
  });

  it("RPCエラー時は500を返す", async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: "DB接続エラー" },
    });

    const req = new Request("http://localhost/api/admin/dashboard-conversion");
    const res = await GET(req as any);
    expect(res.status).toBe(500);
  });

  it("例外スロー時は500を返す", async () => {
    mockRpc.mockRejectedValue(new Error("Unexpected error"));

    const req = new Request("http://localhost/api/admin/dashboard-conversion");
    const res = await GET(req as any);
    expect(res.status).toBe(500);
  });
});
