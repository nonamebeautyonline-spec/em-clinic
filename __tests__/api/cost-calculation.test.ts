// __tests__/api/cost-calculation.test.ts
// 月次売上原価計算API テスト
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Supabase チェーンモック ---
function createChain(defaultResolve = { data: null, error: null }) {
  const chain: any = {};
  ["insert", "update", "delete", "select", "eq", "neq", "gt", "gte", "lt", "lte",
    "in", "is", "not", "order", "limit", "range", "single", "maybeSingle", "upsert",
    "ilike", "or", "count", "csv"].forEach(m => {
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

// --- リクエスト生成ヘルパー ---
function createMockRequest(method: string, url: string) {
  const req = new Request(url, { method });
  return req as any;
}

import { GET } from "@/app/api/admin/cost-calculation/route";

describe("月次原価計算 API - GET", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableChains = {};
    mockVerifyAdminAuth.mockResolvedValue(true);
  });

  it("認証なし → 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const req = createMockRequest("GET", "http://localhost/api/admin/cost-calculation?year_month=2026-02");
    const res = await GET(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("unauthorized");
  });

  it("year_month不正 → 400", async () => {
    const req = createMockRequest("GET", "http://localhost/api/admin/cost-calculation?year_month=2026-2");
    const res = await GET(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("invalid_year_month");
  });

  it("year_monthなし → 400", async () => {
    const req = createMockRequest("GET", "http://localhost/api/admin/cost-calculation");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("注文0件 → 全0値", async () => {
    const chain = getOrCreateChain("orders");
    // Promise.all で2回呼ばれる（カード決済 + 銀行振込）
    chain.then = vi.fn((resolve: any) => resolve({ data: [], error: null }));

    const req = createMockRequest("GET", "http://localhost/api/admin/cost-calculation?year_month=2026-02");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data.totalRevenue).toBe(0);
    expect(json.data.totalCost).toBe(0);
    expect(json.data.grossProfit).toBe(0);
    expect(json.data.orderCount).toBe(0);
    expect(json.data.processingFee).toBe(0);
  });

  it("カード決済+銀行振込の正常計算", async () => {
    const chain = getOrCreateChain("orders");
    let callCount = 0;
    chain.then = vi.fn((resolve: any) => {
      callCount++;
      if (callCount === 1) {
        // カード決済
        return resolve({
          data: [
            { id: "1", product_code: "MJL_2.5mg_1m", amount: 30000 },
            { id: "2", product_code: "MJL_5mg_1m", amount: 50000 },
          ],
          error: null,
        });
      }
      // 銀行振込
      return resolve({
        data: [
          { id: "3", product_code: "MJL_2.5mg_2m", amount: 55000 },
        ],
        error: null,
      });
    });

    const req = createMockRequest("GET", "http://localhost/api/admin/cost-calculation?year_month=2026-02");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);

    // 注文3件
    expect(json.data.orderCount).toBe(3);
    // 売上合計: 30000 + 50000 + 55000 = 135000
    expect(json.data.totalRevenue).toBe(135000);
    // カード決済売上: 30000 + 50000 = 80000
    expect(json.data.cardRevenue).toBe(80000);
    // カード手数料: 80000 * 0.036 = 2880
    expect(json.data.processingFee).toBe(2880);

    // 原価計算:
    // MJL_2.5mg_1m: (3848/2) * 4 * 1 = 7696
    // MJL_5mg_1m: (7696/2) * 4 * 1 = 15392
    // MJL_2.5mg_2m: (3848/2) * 8 * 1 = 15392
    // 合計: 7696 + 15392 + 15392 = 38480
    expect(json.data.totalCost).toBe(38480);

    // 粗利: 135000 - 38480 = 96520
    expect(json.data.grossProfit).toBe(96520);

    // 粗利率: 96520 / 135000 * 100 ≈ 71.5 → Math.round → 71
    expect(json.data.grossMargin).toBe(71);

    // 原価内訳: 3種
    expect(json.data.costBreakdown).toHaveLength(3);
  });

  it("products配列が売上降順でソートされる", async () => {
    const chain = getOrCreateChain("orders");
    let callCount = 0;
    chain.then = vi.fn((resolve: any) => {
      callCount++;
      if (callCount === 1) {
        return resolve({
          data: [
            { id: "1", product_code: "MJL_2.5mg_1m", amount: 10000 },
            { id: "2", product_code: "MJL_5mg_1m", amount: 50000 },
          ],
          error: null,
        });
      }
      return resolve({ data: [], error: null });
    });

    const req = createMockRequest("GET", "http://localhost/api/admin/cost-calculation?year_month=2026-02");
    const res = await GET(req);
    const json = await res.json();
    // 売上降順
    expect(json.data.products[0].code).toBe("MJL_5mg_1m");
    expect(json.data.products[1].code).toBe("MJL_2.5mg_1m");
  });
});
