// __tests__/api/dashboard-stats-enhanced.test.ts
// ダッシュボード拡張統計API（RPC版）のテスト
// 対象: app/api/admin/dashboard-stats-enhanced/route.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// デフォルトのRPCレスポンス（空データ）
function createEmptyRpcResponse() {
  return {
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
}

let mockRpcResponse = createEmptyRpcResponse();
let mockRpcError: { message: string } | null = null;

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    rpc: vi.fn(() => ({
      data: mockRpcResponse,
      error: mockRpcError,
    })),
  },
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  resolveTenantIdOrThrow: vi.fn(() => "test-tenant"),
  withTenant: vi.fn((q: unknown) => q),
  strictWithTenant: vi.fn((q: unknown) => q),
}));

// jose モック（JWT検証）
vi.mock("jose", () => ({
  jwtVerify: vi.fn().mockResolvedValue({ payload: { userId: "user-1" } }),
}));

// NextRequest互換のモック
function createMockRequest(url: string, options: { cookie?: string; bearer?: string } = {}) {
  return {
    method: "GET",
    nextUrl: { searchParams: new URL(url).searchParams },
    cookies: {
      get: vi.fn((name: string) => {
        if (name === "admin_session" && options.cookie) {
          return { value: options.cookie };
        }
        return undefined;
      }),
    },
    headers: {
      get: vi.fn((name: string) => {
        if (name === "authorization" && options.bearer) {
          return `Bearer ${options.bearer}`;
        }
        return null;
      }),
    },
  };
}

import { GET } from "@/app/api/admin/dashboard-stats-enhanced/route";

describe("ダッシュボード拡張統計API (dashboard-stats-enhanced/route.ts)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRpcResponse = createEmptyRpcResponse();
    mockRpcError = null;
  });

  // === 認証テスト ===
  describe("認証", () => {
    it("クッキーもBearerもない場合 → 401", async () => {
      const req = createMockRequest("http://localhost/api/admin/dashboard-stats-enhanced");
      const res = await GET(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe("UNAUTHORIZED");
    });

    it("有効なクッキー認証 → 200", async () => {
      const req = createMockRequest(
        "http://localhost/api/admin/dashboard-stats-enhanced",
        { cookie: "valid-token" },
      );
      const res = await GET(req);
      expect(res.status).toBe(200);
    });

    it("Bearerトークン認証 → 200", async () => {
      // ADMIN_TOKEN 環境変数をセット
      process.env.ADMIN_TOKEN = "test-admin-token";
      const req = createMockRequest(
        "http://localhost/api/admin/dashboard-stats-enhanced",
        { bearer: "test-admin-token" },
      );
      const res = await GET(req);
      expect(res.status).toBe(200);
    });
  });

  // === 正常系: レスポンス構造確認 ===
  describe("正常系: レスポンス構造", () => {
    it("range=today（デフォルト）でレスポンス構造が正しい", async () => {
      const req = createMockRequest(
        "http://localhost/api/admin/dashboard-stats-enhanced",
        { cookie: "valid-token" },
      );
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();

      // トップレベルキー確認
      expect(json).toHaveProperty("reservations");
      expect(json).toHaveProperty("shipping");
      expect(json).toHaveProperty("revenue");
      expect(json).toHaveProperty("products");
      expect(json).toHaveProperty("patients");
      expect(json).toHaveProperty("bankTransfer");
      expect(json).toHaveProperty("kpi");
      expect(json).toHaveProperty("dailyOrders");
      expect(json).toHaveProperty("dailyBreakdown");
    });

    it("reservationsセクションの構造が正しい", async () => {
      const req = createMockRequest(
        "http://localhost/api/admin/dashboard-stats-enhanced",
        { cookie: "valid-token" },
      );
      const res = await GET(req);
      const json = await res.json();

      expect(json.reservations).toHaveProperty("total");
      expect(json.reservations).toHaveProperty("completed");
      expect(json.reservations).toHaveProperty("cancelled");
      expect(json.reservations).toHaveProperty("cancelRate");
      expect(json.reservations).toHaveProperty("consultationCompletionRate");
    });

    it("revenueセクションの構造が正しい", async () => {
      const req = createMockRequest(
        "http://localhost/api/admin/dashboard-stats-enhanced",
        { cookie: "valid-token" },
      );
      const res = await GET(req);
      const json = await res.json();

      expect(json.revenue).toHaveProperty("square");
      expect(json.revenue).toHaveProperty("bankTransfer");
      expect(json.revenue).toHaveProperty("gross");
      expect(json.revenue).toHaveProperty("refunded");
      expect(json.revenue).toHaveProperty("refundCount");
      expect(json.revenue).toHaveProperty("total");
      expect(json.revenue).toHaveProperty("avgOrderAmount");
      expect(json.revenue).toHaveProperty("totalOrders");
      expect(json.revenue).toHaveProperty("reorderOrders");
    });

    it("kpiセクションの構造が正しい", async () => {
      const req = createMockRequest(
        "http://localhost/api/admin/dashboard-stats-enhanced",
        { cookie: "valid-token" },
      );
      const res = await GET(req);
      const json = await res.json();

      expect(json.kpi).toHaveProperty("paymentRateAfterConsultation");
      expect(json.kpi).toHaveProperty("reservationRateAfterIntake");
      expect(json.kpi).toHaveProperty("consultationCompletionRate");
      expect(json.kpi).toHaveProperty("lineRegisteredCount");
      expect(json.kpi).toHaveProperty("todayActiveReservations");
      expect(json.kpi).toHaveProperty("todayNewReservations");
      expect(json.kpi).toHaveProperty("todayPaidCount");
    });
  });

  // === DB空の場合: 0値の確認 ===
  describe("DB空の場合: 全値が0", () => {
    it("全てのカウント・金額が0で返る", async () => {
      const req = createMockRequest(
        "http://localhost/api/admin/dashboard-stats-enhanced",
        { cookie: "valid-token" },
      );
      const res = await GET(req);
      const json = await res.json();

      // 予約
      expect(json.reservations.total).toBe(0);
      expect(json.reservations.completed).toBe(0);
      expect(json.reservations.cancelled).toBe(0);
      expect(json.reservations.cancelRate).toBe(0);

      // 配送
      expect(json.shipping.total).toBe(0);
      expect(json.shipping.first).toBe(0);
      expect(json.shipping.reorder).toBe(0);

      // 売上
      expect(json.revenue.square).toBe(0);
      expect(json.revenue.bankTransfer).toBe(0);
      expect(json.revenue.gross).toBe(0);
      expect(json.revenue.total).toBe(0);
      expect(json.revenue.refunded).toBe(0);
      expect(json.revenue.avgOrderAmount).toBe(0);

      // 患者
      expect(json.patients.total).toBe(0);
      expect(json.patients.active).toBe(0);
      expect(json.patients.new).toBe(0);
      expect(json.patients.repeatRate).toBe(0);

      // 銀行振込
      expect(json.bankTransfer.pending).toBe(0);
      expect(json.bankTransfer.confirmed).toBe(0);

      // 商品・日別データ
      expect(json.products).toEqual([]);
      expect(json.dailyOrders).toEqual([]);
      expect(json.dailyBreakdown).toEqual([]);
    });
  });

  // === range パラメータ分岐テスト ===
  describe("range パラメータ", () => {
    const ranges = ["today", "yesterday", "this_week", "last_week", "this_month", "last_month"];

    ranges.forEach(range => {
      it(`range=${range} で正常レスポンス`, async () => {
        const req = createMockRequest(
          `http://localhost/api/admin/dashboard-stats-enhanced?range=${range}`,
          { cookie: "valid-token" },
        );
        const res = await GET(req);
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.reservations).toBeDefined();
      });
    });

    it("range=custom（start/end指定）で正常レスポンス", async () => {
      const req = createMockRequest(
        "http://localhost/api/admin/dashboard-stats-enhanced?range=custom&start=2026-01-01&end=2026-01-31",
        { cookie: "valid-token" },
      );
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.reservations).toBeDefined();
    });

    it("range=custom（start/end未指定）→ 今日をデフォルト", async () => {
      const req = createMockRequest(
        "http://localhost/api/admin/dashboard-stats-enhanced?range=custom",
        { cookie: "valid-token" },
      );
      const res = await GET(req);
      expect(res.status).toBe(200);
    });
  });

  // === データありの場合の集計テスト ===
  describe("データありの集計", () => {
    it("売上集計が正しく計算される", async () => {
      mockRpcResponse = {
        ...createEmptyRpcResponse(),
        revenue: { square: 10000, bankTransfer: 5000, gross: 15000, refunded: 1000, refundCount: 1, total: 14000, avgOrderAmount: 7500, totalOrders: 2, reorderOrders: 0 },
      };

      const req = createMockRequest(
        "http://localhost/api/admin/dashboard-stats-enhanced",
        { cookie: "valid-token" },
      );
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.revenue.total).toBe(14000);
      expect(json.revenue.avgOrderAmount).toBe(7500);
      expect(typeof json.revenue.total).toBe("number");
      expect(typeof json.revenue.avgOrderAmount).toBe("number");
    });

    it("productsが空配列で返る（注文なし）", async () => {
      const req = createMockRequest(
        "http://localhost/api/admin/dashboard-stats-enhanced",
        { cookie: "valid-token" },
      );
      const res = await GET(req);
      const json = await res.json();
      expect(Array.isArray(json.products)).toBe(true);
      expect(json.products.length).toBe(0);
    });

    it("商品名がマッピングされる", async () => {
      mockRpcResponse = {
        ...createEmptyRpcResponse(),
        products: [{ code: "MJL_2.5mg_1m", name: "MJL_2.5mg_1m", count: 3, revenue: 30000 }],
      };

      const req = createMockRequest(
        "http://localhost/api/admin/dashboard-stats-enhanced",
        { cookie: "valid-token" },
      );
      const res = await GET(req);
      const json = await res.json();
      expect(json.products[0].name).toBe("マンジャロ 2.5mg 1ヶ月");
    });

    it("patientsセクションの数値型が正しい", async () => {
      const req = createMockRequest(
        "http://localhost/api/admin/dashboard-stats-enhanced",
        { cookie: "valid-token" },
      );
      const res = await GET(req);
      const json = await res.json();
      expect(typeof json.patients.total).toBe("number");
      expect(typeof json.patients.active).toBe("number");
      expect(typeof json.patients.new).toBe("number");
      expect(typeof json.patients.repeatRate).toBe("number");
      expect(typeof json.patients.repeatPatients).toBe("number");
      expect(typeof json.patients.totalOrderPatients).toBe("number");
    });

    it("日別集計が正しく計算される", async () => {
      mockRpcResponse = {
        ...createEmptyRpcResponse(),
        squareOrders: [
          { amount: 10000, patient_id: "p1", product_code: "MJL_2.5mg_1m", paid_at: "2026-03-19T10:00:00.000Z" },
          { amount: 20000, patient_id: "p2", product_code: "MJL_5mg_1m", paid_at: "2026-03-19T12:00:00.000Z" },
        ],
        btOrders: [
          { amount: 15000, patient_id: "p3", product_code: "MJL_2.5mg_2m", created_at: "2026-03-19T08:00:00.000Z" },
        ],
        prevPaidPatientIds: ["p1"],
      };

      const req = createMockRequest(
        "http://localhost/api/admin/dashboard-stats-enhanced",
        { cookie: "valid-token" },
      );
      const res = await GET(req);
      const json = await res.json();
      expect(json.dailyOrders.length).toBeGreaterThan(0);
      expect(json.dailyBreakdown.length).toBeGreaterThan(0);
      // p1はprevPaidPatientIdsにあるのでreorder
      const day = json.dailyOrders[0];
      expect(day).toHaveProperty("date");
      expect(day).toHaveProperty("first");
      expect(day).toHaveProperty("reorder");
    });
  });

  // === RPC エラー ===
  describe("RPCエラー", () => {
    it("RPC関数がエラーを返した場合 → 500", async () => {
      mockRpcError = { message: "RPC function failed" };

      const req = createMockRequest(
        "http://localhost/api/admin/dashboard-stats-enhanced",
        { cookie: "valid-token" },
      );
      const res = await GET(req);
      expect(res.status).toBe(500);
    });
  });

  // === JWT検証失敗 ===
  describe("JWT検証失敗", () => {
    it("無効なJWT + Bearerトークンなし → 401", async () => {
      const { jwtVerify } = await import("jose");
      vi.mocked(jwtVerify).mockRejectedValueOnce(new Error("invalid token"));

      const req = createMockRequest(
        "http://localhost/api/admin/dashboard-stats-enhanced",
        { cookie: "invalid-jwt" },
      );
      const res = await GET(req);
      expect(res.status).toBe(401);
    });
  });

  // === RPC呼び出しの検証 ===
  describe("RPC呼び出し", () => {
    it("正しいパラメータでRPC関数が呼ばれる", async () => {
      const { supabaseAdmin } = await import("@/lib/supabase");

      const req = createMockRequest(
        "http://localhost/api/admin/dashboard-stats-enhanced?range=today",
        { cookie: "valid-token" },
      );
      await GET(req);

      expect(supabaseAdmin.rpc).toHaveBeenCalledWith("dashboard_enhanced_stats", expect.objectContaining({
        p_tenant_id: "test-tenant",
        p_start_iso: expect.any(String),
        p_end_iso: expect.any(String),
        p_prev_start_iso: expect.any(String),
        p_prev_end_iso: expect.any(String),
        p_reservation_start_date: expect.any(String),
        p_reservation_end_date: expect.any(String),
        p_shipping_start_date: expect.any(String),
        p_shipping_end_date: expect.any(String),
      }));
    });
  });
});
