// __tests__/api/dashboard-ltv.test.ts
// LTV分析API テスト（RPC版）
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

import { GET } from "@/app/api/admin/dashboard-ltv/route";

describe("LTV分析API - GET（RPC版）", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyAdminAuth.mockResolvedValue(true);
  });

  it("未認証の場合は401を返す", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const req = new Request("http://localhost/api/admin/dashboard-ltv");
    const res = await GET(req as any);
    expect(res.status).toBe(401);
  });

  it("データなしの場合はゼロ値のoverviewを返す", async () => {
    mockRpc.mockResolvedValue({
      data: {
        overview: {
          totalPatients: 0,
          totalRevenue: 0,
          avgLTV: 0,
          medianLTV: 0,
          top10AvgLTV: 0,
        },
        distribution: [],
        segments: [],
      },
      error: null,
    });

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

    // RPC呼び出しパラメータの検証
    expect(mockRpc).toHaveBeenCalledWith("dashboard_ltv_stats", {
      p_tenant_id: "test-tenant",
    });
  });

  it("データありの場合にLTV統計が正しく返される", async () => {
    const rpcResult = {
      overview: {
        totalPatients: 3,
        totalRevenue: 85000,
        avgLTV: 28333,
        medianLTV: 30000,
        top10AvgLTV: 50000,
      },
      distribution: [
        { range: "〜1万", count: 1 },
        { range: "1〜3万", count: 1 },
        { range: "3〜5万", count: 1 },
      ],
      segments: [
        { segment: "vip", label: "VIP", avgLTV: 50000, totalRevenue: 50000, patientCount: 1, avgOrders: 1.0 },
        { segment: "active", label: "アクティブ", avgLTV: 30000, totalRevenue: 30000, patientCount: 1, avgOrders: 2.0 },
        { segment: "new", label: "新規", avgLTV: 5000, totalRevenue: 5000, patientCount: 1, avgOrders: 1.0 },
      ],
    };

    mockRpc.mockResolvedValue({ data: rpcResult, error: null });

    const req = new Request("http://localhost/api/admin/dashboard-ltv");
    const res = await GET(req as any);
    expect(res.status).toBe(200);

    const json = await res.json();

    expect(json.overview.totalPatients).toBe(3);
    expect(json.overview.totalRevenue).toBe(85000);
    expect(json.overview.avgLTV).toBe(28333);

    expect(Array.isArray(json.distribution)).toBe(true);
    expect(json.distribution.length).toBeGreaterThan(0);

    expect(Array.isArray(json.segments)).toBe(true);
    expect(json.segments.length).toBe(3);

    const vipSegment = json.segments.find((s: any) => s.segment === "vip");
    expect(vipSegment).toBeTruthy();
    expect(vipSegment.avgLTV).toBe(50000);
    expect(vipSegment.patientCount).toBe(1);
    expect(vipSegment.label).toBe("VIP");

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
    mockRpc.mockResolvedValue({
      data: {
        overview: {
          totalPatients: 1,
          totalRevenue: 10000,
          avgLTV: 10000,
          medianLTV: 10000,
          top10AvgLTV: 10000,
        },
        distribution: [{ range: "〜1万", count: 1 }],
        segments: [
          { segment: "unknown", label: "未分類", avgLTV: 10000, totalRevenue: 10000, patientCount: 1, avgOrders: 1.0 },
        ],
      },
      error: null,
    });

    const req = new Request("http://localhost/api/admin/dashboard-ltv");
    const res = await GET(req as any);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.segments.length).toBe(1);
    expect(json.segments[0].segment).toBe("unknown");
    expect(json.segments[0].label).toBe("未分類");
  });

  it("RPCエラー時は500を返す", async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: "DB接続エラー" },
    });

    const req = new Request("http://localhost/api/admin/dashboard-ltv");
    const res = await GET(req as any);
    expect(res.status).toBe(500);
  });

  it("例外スロー時は500を返す", async () => {
    mockRpc.mockRejectedValue(new Error("Unexpected error"));

    const req = new Request("http://localhost/api/admin/dashboard-ltv");
    const res = await GET(req as any);
    expect(res.status).toBe(500);
  });
});
