// __tests__/api/daily-revenue.test.ts
// 日別売上データ取得API テスト
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

function createMockRequest(method: string, url: string) {
  const req = new Request(url, { method });
  return req as any;
}

import { GET } from "@/app/api/admin/daily-revenue/route";

describe("日別売上 API - GET", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableChains = {};
    mockVerifyAdminAuth.mockResolvedValue(true);
  });

  it("認証なし → 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const req = createMockRequest("GET", "http://localhost/api/admin/daily-revenue?year_month=2026-02");
    const res = await GET(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("unauthorized");
  });

  it("year_month不正 → 400", async () => {
    const req = createMockRequest("GET", "http://localhost/api/admin/daily-revenue?year_month=invalid");
    const res = await GET(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("invalid_year_month");
  });

  it("year_monthなし → 400", async () => {
    const req = createMockRequest("GET", "http://localhost/api/admin/daily-revenue");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("データなし → 全日が0値で返る", async () => {
    const chain = getOrCreateChain("orders");
    // Promise.all で3回呼ばれる（カード、銀行振込、返金）
    chain.then = vi.fn((resolve: any) => resolve({ data: [], error: null }));

    const req = createMockRequest("GET", "http://localhost/api/admin/daily-revenue?year_month=2026-02");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    // 2026年2月は28日
    expect(json.data).toHaveLength(28);
    expect(json.summary.totalSquare).toBe(0);
    expect(json.summary.totalBank).toBe(0);
    expect(json.summary.totalRefund).toBe(0);
    expect(json.summary.totalNet).toBe(0);
    expect(json.summary.totalCount).toBe(0);
    expect(json.summary.avgOrderValue).toBe(0);
  });

  it("カード決済+銀行振込+返金の正常集計", async () => {
    const chain = getOrCreateChain("orders");
    let callCount = 0;
    chain.then = vi.fn((resolve: any) => {
      callCount++;
      if (callCount === 1) {
        // カード決済（paid_at を JST 2/15 にする）
        // JSTの2/15は UTCでは2/14 15:00
        return resolve({
          data: [
            { id: "1", amount: 30000, paid_at: "2026-02-14T15:00:00.000Z" },
            { id: "2", amount: 50000, paid_at: "2026-02-14T15:00:00.000Z" },
          ],
          error: null,
        });
      }
      if (callCount === 2) {
        // 銀行振込（created_at を JST 2/15 にする）
        return resolve({
          data: [
            { id: "3", amount: 40000, created_at: "2026-02-14T15:00:00.000Z" },
          ],
          error: null,
        });
      }
      // 返金（refunded_at を JST 2/15 にする）
      return resolve({
        data: [
          { id: "4", refunded_amount: 10000, amount: 30000, refunded_at: "2026-02-14T15:00:00.000Z" },
        ],
        error: null,
      });
    });

    const req = createMockRequest("GET", "http://localhost/api/admin/daily-revenue?year_month=2026-02");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();

    // 2/15のデータを確認
    const feb15 = json.data.find((d: any) => d.date === "2026-02-15");
    expect(feb15).toBeDefined();
    expect(feb15.square).toBe(80000); // 30000 + 50000
    expect(feb15.bank).toBe(40000);
    expect(feb15.refund).toBe(10000); // refunded_amount優先
    // 純売上: 80000 + 40000 - 10000 = 110000
    expect(feb15.total).toBe(110000);

    // サマリー
    expect(json.summary.totalSquare).toBe(80000);
    expect(json.summary.totalBank).toBe(40000);
    expect(json.summary.totalRefund).toBe(10000);
    expect(json.summary.totalNet).toBe(110000);
    expect(json.summary.totalSquareCount).toBe(2);
    expect(json.summary.totalBankCount).toBe(1);
    expect(json.summary.totalCount).toBe(3);
    // 平均注文額: (80000+40000) / 3 = 40000
    expect(json.summary.avgOrderValue).toBe(40000);
  });

  it("日付の昇順でソートされる", async () => {
    const chain = getOrCreateChain("orders");
    chain.then = vi.fn((resolve: any) => resolve({ data: [], error: null }));

    const req = createMockRequest("GET", "http://localhost/api/admin/daily-revenue?year_month=2026-01");
    const res = await GET(req);
    const json = await res.json();
    // 2026年1月は31日
    expect(json.data).toHaveLength(31);
    expect(json.data[0].date).toBe("2026-01-01");
    expect(json.data[30].date).toBe("2026-01-31");
  });
});
