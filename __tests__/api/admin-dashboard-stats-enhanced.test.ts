// __tests__/api/admin-dashboard-stats-enhanced.test.ts
// ダッシュボード拡張統計API テスト

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: vi.fn(),
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  resolveTenantIdOrThrow: vi.fn(() => "test-tenant"),
}));

function createChain(resolvedValue: unknown = { data: null, error: null }) {
  const handler: ProxyHandler<object> = {
    get: (_target, prop) => {
      if (prop === "then") {
        return (resolve: (v: unknown) => void) => resolve(resolvedValue);
      }
      return vi.fn(() => new Proxy({}, handler));
    },
  };
  return new Proxy({}, handler);
}

const mockRpcResult = {
  reservations: { total: 0, completed: 0, cancelled: 0, cancelRate: 0, consultationCompletionRate: 0 },
  shipping: { total: 0, first: 0, reorder: 0 },
  revenue: { square: 0, bankTransfer: 0, gross: 0, refunded: 0, refundCount: 0, total: 0, avgOrderAmount: 0, totalOrders: 0, reorderOrders: 0 },
  products: [],
  patients: { total: 0, active: 0, new: 0, repeatRate: 0, repeatPatients: 0, totalOrderPatients: 0, prevPeriodPatients: 0 },
  bankTransfer: { pending: 0, confirmed: 0 },
  kpi: { paymentRateAfterConsultation: 0, reservationRateAfterIntake: 0, consultationCompletionRate: 0, lineRegisteredCount: 0, todayActiveReservations: 0, todayActiveOK: 0, todayActiveNG: 0, todayNoAnswer: 0, todayNewReservations: 0, todayPaidCount: 0 },
  squareOrders: [],
  btOrders: [],
  prevPaidPatientIds: [],
};

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn(() => createChain()),
    rpc: vi.fn(() => ({ data: mockRpcResult, error: null })),
  },
}));

import { verifyAdminAuth } from "@/lib/admin-auth";

const mockAuth = verifyAdminAuth as ReturnType<typeof vi.fn>;

describe("GET /api/admin/dashboard-stats-enhanced", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("未認証の場合401を返す", async () => {
    mockAuth.mockResolvedValue(false);
    const { GET } = await import("@/app/api/admin/dashboard-stats-enhanced/route");
    const req = new NextRequest("http://localhost/api/admin/dashboard-stats-enhanced");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("認証済み — rangeパラメータなし（デフォルトtoday）で200を返す", async () => {
    mockAuth.mockResolvedValue(true);
    const { GET } = await import("@/app/api/admin/dashboard-stats-enhanced/route");
    const req = new NextRequest("http://localhost/api/admin/dashboard-stats-enhanced");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("reservations");
    expect(body).toHaveProperty("revenue");
    expect(body).toHaveProperty("kpi");
  });

  it("range=this_monthでも正常に動作する", async () => {
    mockAuth.mockResolvedValue(true);
    const { GET } = await import("@/app/api/admin/dashboard-stats-enhanced/route");
    const req = new NextRequest("http://localhost/api/admin/dashboard-stats-enhanced?range=this_month");
    const res = await GET(req);
    expect(res.status).toBe(200);
  });

  it("range=customでstart/end指定時に正常動作", async () => {
    mockAuth.mockResolvedValue(true);
    const { GET } = await import("@/app/api/admin/dashboard-stats-enhanced/route");
    const req = new NextRequest("http://localhost/api/admin/dashboard-stats-enhanced?range=custom&start=2026-01-01&end=2026-01-31");
    const res = await GET(req);
    expect(res.status).toBe(200);
  });

  it("RPCエラー時に500を返す", async () => {
    mockAuth.mockResolvedValue(true);
    const { supabaseAdmin } = await import("@/lib/supabase");
    (supabaseAdmin.rpc as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      data: null,
      error: { message: "RPC失敗" },
    });
    const { GET } = await import("@/app/api/admin/dashboard-stats-enhanced/route");
    const req = new NextRequest("http://localhost/api/admin/dashboard-stats-enhanced");
    const res = await GET(req);
    expect(res.status).toBe(500);
  });
});
