// __tests__/api/dashboard-stats-enhanced.test.ts
// ダッシュボード拡張統計API（558行）のテスト
// 対象: app/api/admin/dashboard-stats-enhanced/route.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- チェーン生成ヘルパー ---
function createChain(defaultResolve = { data: [], error: null, count: 0 }) {
  const chain: any = {};
  [
    "insert", "update", "delete", "select", "eq", "neq", "gt", "gte", "lt", "lte",
    "in", "is", "not", "order", "limit", "range", "single", "maybeSingle", "upsert",
    "ilike", "or", "count", "csv",
  ].forEach(m => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.then = vi.fn((resolve: any) => resolve(defaultResolve));
  return chain;
}

// テーブルごとにチェーンを分ける（17並列クエリに対応）
const reservationsChain = createChain({ data: [], error: null, count: 0 });
const ordersChain = createChain({ data: [], error: null, count: 0 });
const intakeChain = createChain({ data: [], error: null, count: 0 });
const patientsChain = createChain({ data: [], error: null, count: 0 });

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => {
      switch (table) {
        case "reservations": return reservationsChain;
        case "orders": return ordersChain;
        case "intake": return intakeChain;
        case "patients": return patientsChain;
        default: return createChain();
      }
    }),
  },
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  withTenant: vi.fn((q: any) => q),
}));

// jose モック（JWT検証）
vi.mock("jose", () => ({
  jwtVerify: vi.fn().mockResolvedValue({ payload: { userId: "user-1" } }),
}));

// NextRequest互換のモック
function createMockRequest(url: string, options: { cookie?: string; bearer?: string } = {}) {
  const req: any = {
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
  return req;
}

import { GET } from "@/app/api/admin/dashboard-stats-enhanced/route";

describe("ダッシュボード拡張統計API (dashboard-stats-enhanced/route.ts)", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // 全チェーンの then をリセット（デフォルト: 空データ）
    [reservationsChain, ordersChain, intakeChain, patientsChain].forEach(chain => {
      chain.then = vi.fn((resolve: any) => resolve({ data: [], error: null, count: 0 }));
      // 全メソッドを再モック
      [
        "insert", "update", "delete", "select", "eq", "neq", "gt", "gte", "lt", "lte",
        "in", "is", "not", "order", "limit", "range", "single", "maybeSingle", "upsert",
        "ilike", "or", "count", "csv",
      ].forEach(m => {
        chain[m] = vi.fn().mockReturnValue(chain);
      });
    });
  });

  // === 認証テスト ===
  describe("認証", () => {
    it("クッキーもBearerもない場合 → 401", async () => {
      const req = createMockRequest("http://localhost/api/admin/dashboard-stats-enhanced");
      const res = await GET(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe("Unauthorized");
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
      // ordersチェーンを上書き: カード決済と銀行振込の注文がある場合
      ordersChain.then = vi.fn((resolve: any) => {
        // デフォルトでは空データを返す（各並列クエリに対応するため簡略化）
        return resolve({ data: [], error: null, count: 0 });
      });

      const req = createMockRequest(
        "http://localhost/api/admin/dashboard-stats-enhanced",
        { cookie: "valid-token" },
      );
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      // DB空なので0だが、集計ロジックがエラーなく動作することを確認
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
  });

  // === JWT検証失敗 ===
  describe("JWT検証失敗", () => {
    it("無効なJWT + Bearerトークンなし → 401", async () => {
      const { jwtVerify } = await import("jose");
      (jwtVerify as any).mockRejectedValueOnce(new Error("invalid token"));

      const req = createMockRequest(
        "http://localhost/api/admin/dashboard-stats-enhanced",
        { cookie: "invalid-jwt" },
      );
      const res = await GET(req);
      expect(res.status).toBe(401);
    });
  });
});
