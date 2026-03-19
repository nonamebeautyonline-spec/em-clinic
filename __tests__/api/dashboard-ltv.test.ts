// __tests__/api/dashboard-ltv.test.ts
// LTV分析API テスト
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
  resolveTenantIdOrThrow: vi.fn(() => "test-tenant"),
  withTenant: vi.fn((q: unknown) => q),
  strictWithTenant: vi.fn((q: unknown) => q),
}));

import { GET } from "@/app/api/admin/dashboard-ltv/route";

describe("LTV分析API - GET", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableChains = {};
    tableCallIndex = {};
    mockVerifyAdminAuth.mockResolvedValue(true);
  });

  it("未認証の場合は401を返す", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const req = new Request("http://localhost/api/admin/dashboard-ltv");
    const res = await GET(req as any);
    expect(res.status).toBe(401);
  });

  it("データなしの場合はゼロ値のoverviewを返す", async () => {
    // orders と patient_segments の並列取得
    tableChains["orders"] = [createChain({ data: [], error: null })];
    tableChains["patient_segments"] = [createChain({ data: [], error: null })];

    const req = new Request("http://localhost/api/admin/dashboard-ltv");
    const res = await GET(req as any);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.overview.totalPatients).toBe(0);
    expect(json.overview.totalRevenue).toBe(0);
    expect(json.overview.avgLTV).toBe(0);
    expect(json.overview.medianLTV).toBe(0);
    expect(json.overview.top10AvgLTV).toBe(0);
    expect(json.distribution).toEqual([]);
    expect(json.segments).toEqual([]);
  });

  it("データありの場合にLTV統計が正しく計算される", async () => {
    const ordersData = [
      { patient_id: "p1", amount: 10000, created_at: "2026-01-01T00:00:00Z" },
      { patient_id: "p1", amount: 20000, created_at: "2026-02-01T00:00:00Z" },
      { patient_id: "p2", amount: 50000, created_at: "2026-01-15T00:00:00Z" },
      { patient_id: "p3", amount: 5000, created_at: "2026-01-20T00:00:00Z" },
    ];

    const segmentsData = [
      { patient_id: "p1", segment: "active" },
      { patient_id: "p2", segment: "vip" },
      { patient_id: "p3", segment: "new" },
    ];

    tableChains["orders"] = [createChain({ data: ordersData, error: null })];
    tableChains["patient_segments"] = [createChain({ data: segmentsData, error: null })];

    const req = new Request("http://localhost/api/admin/dashboard-ltv");
    const res = await GET(req as any);
    expect(res.status).toBe(200);

    const json = await res.json();

    // overview検証
    // p1: 30000, p2: 50000, p3: 5000
    expect(json.overview.totalPatients).toBe(3);
    expect(json.overview.totalRevenue).toBe(85000); // 30000 + 50000 + 5000
    expect(json.overview.avgLTV).toBe(Math.round(85000 / 3)); // 28333

    // distribution検証（ヒストグラム）
    expect(Array.isArray(json.distribution)).toBe(true);
    expect(json.distribution.length).toBeGreaterThan(0);

    // segments検証
    expect(Array.isArray(json.segments)).toBe(true);
    expect(json.segments.length).toBe(3); // active, vip, new

    // VIPセグメントの検証
    const vipSegment = json.segments.find((s: any) => s.segment === "vip");
    expect(vipSegment).toBeTruthy();
    expect(vipSegment.avgLTV).toBe(50000);
    expect(vipSegment.patientCount).toBe(1);
    expect(vipSegment.label).toBe("VIP");

    // activeセグメントの検証
    const activeSegment = json.segments.find((s: any) => s.segment === "active");
    expect(activeSegment).toBeTruthy();
    expect(activeSegment.avgLTV).toBe(30000);
    expect(activeSegment.label).toBe("アクティブ");

    // avgLTV降順でソートされていること
    for (let i = 1; i < json.segments.length; i++) {
      expect(json.segments[i - 1].avgLTV).toBeGreaterThanOrEqual(json.segments[i].avgLTV);
    }
  });

  it("セグメント未割当の患者はunknownに分類される", async () => {
    const ordersData = [
      { patient_id: "p1", amount: 10000, created_at: "2026-01-01T00:00:00Z" },
    ];

    // patient_segments にp1のデータなし
    tableChains["orders"] = [createChain({ data: ordersData, error: null })];
    tableChains["patient_segments"] = [createChain({ data: [], error: null })];

    const req = new Request("http://localhost/api/admin/dashboard-ltv");
    const res = await GET(req as any);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.segments.length).toBe(1);
    expect(json.segments[0].segment).toBe("unknown");
    expect(json.segments[0].label).toBe("未分類");
  });

  it("Supabaseエラー時は500を返す", async () => {
    const { strictWithTenant } = await import("@/lib/tenant");
    (strictWithTenant as Mock).mockRejectedValueOnce(new Error("DB接続エラー"));

    const req = new Request("http://localhost/api/admin/dashboard-ltv");
    const res = await GET(req as any);
    expect(res.status).toBe(500);
  });
});
