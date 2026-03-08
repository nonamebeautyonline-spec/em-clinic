// __tests__/api/dashboard-conversion.test.ts
// 初診→再診転換率API テスト
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";

// --- Supabase チェーンモック ---
type SupabaseChain = Record<string, Mock> & { then: Mock };

function createChain(defaultResolve = { data: [], error: null }): SupabaseChain {
  const chain = {} as SupabaseChain;
  ["insert", "update", "delete", "select", "eq", "neq", "gt", "gte", "lt", "lte",
    "in", "is", "not", "order", "limit", "range", "single", "maybeSingle", "upsert",
    "ilike", "or", "count", "csv", "head"].forEach(m => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.then = vi.fn((resolve: (val: unknown) => unknown) => resolve(defaultResolve));
  return chain;
}

let tableChains: Record<string, SupabaseChain[]> = {};
let tableCallIndex: Record<string, number> = {};

function getNextChain(table: string) {
  if (!tableChains[table]) tableChains[table] = [createChain()];
  if (!tableCallIndex[table]) tableCallIndex[table] = 0;
  const idx = tableCallIndex[table];
  tableCallIndex[table]++;
  return tableChains[table][idx] || tableChains[table][0];
}

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn((table: string) => getNextChain(table)),
  })),
}));

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: { from: vi.fn((table: string) => getNextChain(table)) },
}));

const mockVerifyAdminAuth = vi.fn();
vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: (...args: unknown[]) => mockVerifyAdminAuth(...args),
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  withTenant: vi.fn((q: unknown) => q),
}));

import { GET } from "@/app/api/admin/dashboard-conversion/route";

describe("初診→再診転換率API - GET", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableChains = {};
    tableCallIndex = {};
    mockVerifyAdminAuth.mockResolvedValue(true);
  });

  it("未認証の場合は401を返す", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const req = new Request("http://localhost/api/admin/dashboard-conversion");
    const res = await GET(req as any);
    expect(res.status).toBe(401);
  });

  it("データなしの場合はゼロ値のコホートを返す", async () => {
    // allOrders, firstOrders の2回呼び出し
    tableChains["orders"] = [
      createChain({ data: [], error: null }),
      createChain({ data: [], error: null }),
    ];

    const req = new Request("http://localhost/api/admin/dashboard-conversion");
    const res = await GET(req as any);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(Array.isArray(json.cohorts)).toBe(true);
    // 13ヶ月分（過去12ヶ月 + 当月）
    expect(json.cohorts.length).toBe(13);
    // 全コホートが0であること
    for (const c of json.cohorts) {
      expect(c.newPatients).toBe(0);
      expect(c.returnedPatients).toBe(0);
      expect(c.conversionRate).toBe(0);
    }
    // overall も0
    expect(json.overall.totalNew).toBe(0);
    expect(json.overall.totalReturned).toBe(0);
    expect(json.overall.conversionRate).toBe(0);
  });

  it("データありの場合にコホート転換率が正しく計算される", async () => {
    const now = new Date();
    const jstOffset = 9 * 60 * 60 * 1000;
    const jstNow = new Date(now.getTime() + jstOffset);
    const year = jstNow.getUTCFullYear();
    const month = jstNow.getUTCMonth();

    // 当月1日と15日（JST）をUTCに変換
    const date1 = new Date(Date.UTC(year, month, 1, 3, 0, 0) - jstOffset);
    const date2 = new Date(Date.UTC(year, month, 15, 3, 0, 0) - jstOffset);

    // allOrders: 当月の注文（p1は2回、p2は1回）
    const allOrdersData = [
      { patient_id: "p1", paid_at: date1.toISOString(), created_at: date1.toISOString() },
      { patient_id: "p1", paid_at: date2.toISOString(), created_at: date2.toISOString() },
      { patient_id: "p2", paid_at: date1.toISOString(), created_at: date1.toISOString() },
    ];

    // firstOrders: 初回注文（created_at順）
    const firstOrdersData = [
      { patient_id: "p1", created_at: date1.toISOString() },
      { patient_id: "p2", created_at: date1.toISOString() },
    ];

    tableChains["orders"] = [
      createChain({ data: allOrdersData, error: null }),
      createChain({ data: firstOrdersData, error: null }),
    ];

    const req = new Request("http://localhost/api/admin/dashboard-conversion");
    const res = await GET(req as any);
    expect(res.status).toBe(200);

    const json = await res.json();

    // 当月のコホートを取得
    const currentKey = `${year}-${String(month + 1).padStart(2, "0")}`;
    const currentCohort = json.cohorts.find((c: any) => c.period === currentKey);

    expect(currentCohort).toBeTruthy();
    expect(currentCohort.newPatients).toBe(2); // p1, p2
    expect(currentCohort.returnedPatients).toBe(1); // p1のみ再診
    expect(currentCohort.conversionRate).toBe(50); // 1/2 = 50%

    // overall
    expect(json.overall.totalNew).toBe(2);
    expect(json.overall.totalReturned).toBe(1);
    expect(json.overall.conversionRate).toBe(50);
  });

  it("Supabaseエラー時は500を返す", async () => {
    const { withTenant } = await import("@/lib/tenant");
    (withTenant as Mock).mockRejectedValueOnce(new Error("DB接続エラー"));

    const req = new Request("http://localhost/api/admin/dashboard-conversion");
    const res = await GET(req as any);
    expect(res.status).toBe(500);
  });
});
