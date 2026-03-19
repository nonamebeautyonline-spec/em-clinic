// __tests__/api/daily-revenue.test.ts
// 日別売上データ取得API テスト（RPC版）
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- supabaseAdmin モック ---
const mockRpc = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
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
  tenantPayload: vi.fn(() => ({ tenant_id: "test-tenant" })),
}));

function createMockRequest(method: string, url: string) {
  const req = new Request(url, { method });
  return req as unknown as Request;
}

import { GET } from "@/app/api/admin/daily-revenue/route";

// 2月28日分の空データを生成するヘルパー
function emptyFeb2026Data() {
  const days = [];
  for (let d = 1; d <= 28; d++) {
    days.push({
      date: `2026-02-${String(d).padStart(2, "0")}`,
      square: 0, bank: 0, refund: 0, total: 0,
      squareCount: 0, bankCount: 0, firstCount: 0, reorderCount: 0,
    });
  }
  return days;
}

describe("日別売上 API - GET", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyAdminAuth.mockResolvedValue(true);
  });

  it("認証なし → 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const req = createMockRequest("GET", "http://localhost/api/admin/daily-revenue?year_month=2026-02");
    const res = await GET(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("UNAUTHORIZED");
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
    const emptyData = emptyFeb2026Data();
    mockRpc.mockResolvedValue({
      data: {
        data: emptyData,
        summary: {
          totalSquare: 0, totalBank: 0, totalRefund: 0, totalNet: 0,
          totalSquareCount: 0, totalBankCount: 0, totalCount: 0, avgOrderValue: 0,
        },
      },
      error: null,
    });

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
    const data = emptyFeb2026Data();
    // 2/15のデータを設定
    const feb15 = data.find(d => d.date === "2026-02-15")!;
    feb15.square = 80000;
    feb15.bank = 40000;
    feb15.refund = 10000;
    feb15.total = 110000;
    feb15.squareCount = 2;
    feb15.bankCount = 1;
    feb15.firstCount = 3;
    feb15.reorderCount = 0;

    mockRpc.mockResolvedValue({
      data: {
        data,
        summary: {
          totalSquare: 80000, totalBank: 40000, totalRefund: 10000, totalNet: 110000,
          totalSquareCount: 2, totalBankCount: 1, totalCount: 3, avgOrderValue: 40000,
        },
      },
      error: null,
    });

    const req = createMockRequest("GET", "http://localhost/api/admin/daily-revenue?year_month=2026-02");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();

    // 2/15のデータを確認
    const feb15Result = json.data.find((d: Record<string, unknown>) => d.date === "2026-02-15");
    expect(feb15Result).toBeDefined();
    expect(feb15Result.square).toBe(80000);
    expect(feb15Result.bank).toBe(40000);
    expect(feb15Result.refund).toBe(10000);
    expect(feb15Result.total).toBe(110000);

    // サマリー
    expect(json.summary.totalSquare).toBe(80000);
    expect(json.summary.totalBank).toBe(40000);
    expect(json.summary.totalRefund).toBe(10000);
    expect(json.summary.totalNet).toBe(110000);
    expect(json.summary.totalSquareCount).toBe(2);
    expect(json.summary.totalBankCount).toBe(1);
    expect(json.summary.totalCount).toBe(3);
    expect(json.summary.avgOrderValue).toBe(40000);
  });

  it("日付の昇順でソートされる", async () => {
    const days = [];
    for (let d = 1; d <= 31; d++) {
      days.push({
        date: `2026-01-${String(d).padStart(2, "0")}`,
        square: 0, bank: 0, refund: 0, total: 0,
        squareCount: 0, bankCount: 0, firstCount: 0, reorderCount: 0,
      });
    }
    mockRpc.mockResolvedValue({
      data: {
        data: days,
        summary: {
          totalSquare: 0, totalBank: 0, totalRefund: 0, totalNet: 0,
          totalSquareCount: 0, totalBankCount: 0, totalCount: 0, avgOrderValue: 0,
        },
      },
      error: null,
    });

    const req = createMockRequest("GET", "http://localhost/api/admin/daily-revenue?year_month=2026-01");
    const res = await GET(req);
    const json = await res.json();
    expect(json.data).toHaveLength(31);
    expect(json.data[0].date).toBe("2026-01-01");
    expect(json.data[30].date).toBe("2026-01-31");
  });

  it("RPCエラー → 500", async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: "function not found", code: "42883" },
    });

    const req = createMockRequest("GET", "http://localhost/api/admin/daily-revenue?year_month=2026-02");
    const res = await GET(req);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("server_error");
  });

  it("RPCに正しいパラメータが渡される", async () => {
    mockRpc.mockResolvedValue({
      data: { data: [], summary: {} },
      error: null,
    });

    const req = createMockRequest("GET", "http://localhost/api/admin/daily-revenue?year_month=2026-03");
    await GET(req);

    expect(mockRpc).toHaveBeenCalledWith("daily_revenue_summary", {
      p_tenant_id: "test-tenant",
      p_start_date: "2026-03-01",
      p_end_date: "2026-03-31",
    });
  });
});
