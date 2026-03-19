// __tests__/api/dashboard-stats.test.ts
// ダッシュボード統計API テスト
import { describe, it, expect, vi, beforeEach } from "vitest";

import type { Mock } from "vitest";

// --- Supabase チェーンモック ---
type SupabaseChain = Record<string, Mock> & { then: Mock };

function createChain(defaultResolve = { data: [], error: null, count: 0 }): SupabaseChain {
  const chain = {} as SupabaseChain;
  ["insert", "update", "delete", "select", "eq", "neq", "gt", "gte", "lt", "lte",
    "in", "is", "not", "order", "limit", "range", "single", "maybeSingle", "upsert",
    "ilike", "or", "count", "csv", "head"].forEach(m => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.then = vi.fn((resolve: (val: unknown) => unknown) => resolve(defaultResolve));
  return chain;
}

let tableChains: Record<string, SupabaseChain> = {};
function getOrCreateChain(table: string) {
  if (!tableChains[table]) tableChains[table] = createChain();
  return tableChains[table];
}

// RPC モック
const mockRpc = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => getOrCreateChain(table)),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn((table: string) => getOrCreateChain(table)),
    rpc: (...args: unknown[]) => mockRpc(...args),
  })),
}));

const mockVerifyAdminAuth = vi.fn();
vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: (...args: unknown[]) => mockVerifyAdminAuth(...args),
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  resolveTenantIdOrThrow: vi.fn(() => "test-tenant"),
  strictWithTenant: vi.fn((q: unknown) => q),
  withTenant: vi.fn((q: unknown) => q),
  tenantPayload: vi.fn(() => ({ tenant_id: "test-tenant" })),
}));

function createMockRequest(method: string, url: string) {
  const req = new Request(url, { method });
  return req as unknown as Request;
}

import { GET } from "@/app/api/admin/dashboard-stats/route";

describe("ダッシュボード統計 API - GET", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableChains = {};
    mockVerifyAdminAuth.mockResolvedValue(true);
    // デフォルトRPCモック
    mockRpc.mockResolvedValue({ data: [{ total_count: 0, first_order_count: 0, reorder_count: 0, total_patients: 0, repeat_patients: 0, repeat_rate: 0 }], error: null });
  });

  it("認証なし → 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const req = createMockRequest("GET", "http://localhost/api/admin/dashboard-stats");
    const res = await GET(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("UNAUTHORIZED");
  });

  it("DB空 → 全0値を返す", async () => {
    // reservationsチェーン
    const resChain = getOrCreateChain("reservations");
    resChain.then = vi.fn((resolve: (val: unknown) => unknown) => resolve({ data: null, error: null, count: 0 }));

    // ordersチェーン: fetchAll が range を呼ぶので空配列を返す
    const ordChain = getOrCreateChain("orders");
    ordChain.then = vi.fn((resolve: (val: unknown) => unknown) => resolve({ data: [], error: null, count: 0 }));

    // intakeチェーン
    const intChain = getOrCreateChain("intake");
    intChain.then = vi.fn((resolve: (val: unknown) => unknown) => resolve({ data: null, error: null, count: 0 }));

    // RPCモック: 配送統計・リピート率ともに0
    mockRpc.mockImplementation((name: string) => {
      if (name === "get_today_shipping_stats") {
        return Promise.resolve({ data: [{ total_count: 0, first_order_count: 0, reorder_count: 0 }], error: null });
      }
      if (name === "get_monthly_repeat_rate") {
        return Promise.resolve({ data: [{ total_patients: 0, repeat_patients: 0, repeat_rate: 0 }], error: null });
      }
      return Promise.resolve({ data: [], error: null });
    });

    const req = createMockRequest("GET", "http://localhost/api/admin/dashboard-stats");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.todayReservations).toBe(0);
    expect(json.todayShipping.total).toBe(0);
    expect(json.todayShipping.first).toBe(0);
    expect(json.todayShipping.reorder).toBe(0);
    expect(json.todayRevenue.total).toBe(0);
    expect(json.repeatRate).toBe(0);
    expect(json.monthlyStats.totalPatients).toBe(0);
    expect(json.monthlyStats.activePatients).toBe(0);
    expect(json.monthlyStats.newPatients).toBe(0);
  });

  it("正常データ → 集計結果を返す", async () => {
    // reservations: 予約2件
    const resChain = getOrCreateChain("reservations");
    resChain.then = vi.fn((resolve: (val: unknown) => unknown) => resolve({ data: null, error: null, count: 2 }));

    // orders: 売上クエリ用（fetchAll）
    const ordChain = getOrCreateChain("orders");
    ordChain.then = vi.fn((resolve: (val: unknown) => unknown) => resolve({ data: [], error: null, count: 0 }));

    // intake
    const intChain = getOrCreateChain("intake");
    intChain.then = vi.fn((resolve: (val: unknown) => unknown) => resolve({ data: null, error: null, count: 10 }));

    // RPCモック: 配送3件（新規1、リピート2）、リピート率40%
    mockRpc.mockImplementation((name: string) => {
      if (name === "get_today_shipping_stats") {
        return Promise.resolve({ data: [{ total_count: 3, first_order_count: 1, reorder_count: 2 }], error: null });
      }
      if (name === "get_monthly_repeat_rate") {
        return Promise.resolve({ data: [{ total_patients: 5, repeat_patients: 2, repeat_rate: 40 }], error: null });
      }
      return Promise.resolve({ data: [], error: null });
    });

    const req = createMockRequest("GET", "http://localhost/api/admin/dashboard-stats");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.todayReservations).toBe(2);
    expect(json.todayShipping.total).toBe(3);
    expect(json.todayShipping.first).toBe(1);
    expect(json.todayShipping.reorder).toBe(2);
    expect(json.repeatRate).toBe(40);
    // monthlyStats
    expect(json.monthlyStats.totalPatients).toBe(10);
  });

  it("RPC呼び出しパラメータが正しいこと", async () => {
    // 基本チェーンセットアップ
    const resChain = getOrCreateChain("reservations");
    resChain.then = vi.fn((resolve: (val: unknown) => unknown) => resolve({ data: null, error: null, count: 0 }));
    const ordChain = getOrCreateChain("orders");
    ordChain.then = vi.fn((resolve: (val: unknown) => unknown) => resolve({ data: [], error: null, count: 0 }));
    const intChain = getOrCreateChain("intake");
    intChain.then = vi.fn((resolve: (val: unknown) => unknown) => resolve({ data: null, error: null, count: 0 }));

    mockRpc.mockImplementation((name: string) => {
      if (name === "get_today_shipping_stats") {
        return Promise.resolve({ data: [{ total_count: 0, first_order_count: 0, reorder_count: 0 }], error: null });
      }
      if (name === "get_monthly_repeat_rate") {
        return Promise.resolve({ data: [{ total_patients: 0, repeat_patients: 0, repeat_rate: 0 }], error: null });
      }
      return Promise.resolve({ data: [], error: null });
    });

    const req = createMockRequest("GET", "http://localhost/api/admin/dashboard-stats");
    await GET(req);

    // get_today_shipping_stats が呼ばれたことを確認
    expect(mockRpc).toHaveBeenCalledWith("get_today_shipping_stats", expect.objectContaining({
      p_tenant_id: "test-tenant",
    }));

    // get_monthly_repeat_rate が呼ばれたことを確認
    expect(mockRpc).toHaveBeenCalledWith("get_monthly_repeat_rate", expect.objectContaining({
      p_tenant_id: "test-tenant",
    }));
  });
});
