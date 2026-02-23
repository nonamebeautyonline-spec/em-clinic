// __tests__/api/dashboard-stats.test.ts
// ダッシュボード統計API テスト
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Supabase チェーンモック ---
function createChain(defaultResolve = { data: [], error: null, count: 0 }) {
  const chain: any = {};
  ["insert", "update", "delete", "select", "eq", "neq", "gt", "gte", "lt", "lte",
    "in", "is", "not", "order", "limit", "range", "single", "maybeSingle", "upsert",
    "ilike", "or", "count", "csv", "head"].forEach(m => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.then = vi.fn((resolve: any) => resolve(defaultResolve));
  return chain;
}

let tableChains: Record<string, any> = {};
function getOrCreateChain(table: string) {
  if (!tableChains[table]) tableChains[table] = createChain();
  return tableChains[table];
}

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn((table: string) => getOrCreateChain(table)),
  })),
}));

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: { from: vi.fn((table: string) => getOrCreateChain(table)) },
}));

const mockVerifyAdminAuth = vi.fn();
vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: (...args: any[]) => mockVerifyAdminAuth(...args),
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  withTenant: vi.fn((q: any) => q),
  tenantPayload: vi.fn(() => ({ tenant_id: "test-tenant" })),
}));

function createMockRequest(method: string, url: string) {
  const req = new Request(url, { method });
  return req as any;
}

import { GET } from "@/app/api/admin/dashboard-stats/route";

describe("ダッシュボード統計 API - GET", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableChains = {};
    mockVerifyAdminAuth.mockResolvedValue(true);
  });

  it("認証なし → 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const req = createMockRequest("GET", "http://localhost/api/admin/dashboard-stats");
    const res = await GET(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Unauthorized");
  });

  it("DB空 → 全0値を返す", async () => {
    // reservationsチェーン
    const resChain = getOrCreateChain("reservations");
    resChain.then = vi.fn((resolve: any) => resolve({ data: null, error: null, count: 0 }));

    // ordersチェーン: fetchAll が range を呼ぶので空配列を返す
    const ordChain = getOrCreateChain("orders");
    ordChain.then = vi.fn((resolve: any) => resolve({ data: [], error: null, count: 0 }));

    // intakeチェーン
    const intChain = getOrCreateChain("intake");
    intChain.then = vi.fn((resolve: any) => resolve({ data: null, error: null, count: 0 }));

    const req = createMockRequest("GET", "http://localhost/api/admin/dashboard-stats");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.todayReservations).toBe(0);
    expect(json.todayShipping.total).toBe(0);
    expect(json.todayRevenue.total).toBe(0);
    expect(json.repeatRate).toBe(0);
    expect(json.monthlyStats.totalPatients).toBe(0);
    expect(json.monthlyStats.activePatients).toBe(0);
    expect(json.monthlyStats.newPatients).toBe(0);
  });

  it("正常データ → 集計結果を返す", async () => {
    // reservations: 予約2件
    const resChain = getOrCreateChain("reservations");
    resChain.then = vi.fn((resolve: any) => resolve({ data: null, error: null, count: 2 }));

    // orders: 多数のクエリに対応
    const ordChain = getOrCreateChain("orders");
    let ordCallCount = 0;
    ordChain.then = vi.fn((resolve: any) => {
      ordCallCount++;
      // fetchAll は range を使う。最初のバッチで返してから空で終了
      // 配送データ（1回目の fetchAll）
      if (ordCallCount === 1) {
        return resolve({
          data: [
            { product_code: "MJL_2.5mg_1m", patient_id: "p1" },
            { product_code: "MJL_5mg_1m", patient_id: "p2" },
          ],
          error: null,
        });
      }
      // 以降の呼び出しは空データまたはcount=0で返す
      return resolve({ data: [], error: null, count: 0 });
    });

    // intake
    const intChain = getOrCreateChain("intake");
    intChain.then = vi.fn((resolve: any) => resolve({ data: null, error: null, count: 10 }));

    const req = createMockRequest("GET", "http://localhost/api/admin/dashboard-stats");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.todayReservations).toBe(2);
    expect(json.todayShipping.total).toBe(2);
    // monthlyStats
    expect(json.monthlyStats.totalPatients).toBe(10);
  });
});
