// __tests__/api/analytics.test.ts
// 売上分析・LTV・コホートAPI（DB側RPC集計版）のテスト
// 対象: app/api/admin/analytics/route.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- チェーン生成ヘルパー（daily_metrics用） ---
type SupabaseChain = Record<string, ReturnType<typeof vi.fn>>;
function createChain(defaultResolve: Record<string, unknown> = { data: [], error: null, count: 0 }) {
  const chain: SupabaseChain = {};
  [
    "insert", "update", "delete", "select", "eq", "neq", "gt", "gte", "lt", "lte",
    "in", "is", "not", "order", "limit", "range", "single", "maybeSingle", "upsert",
    "ilike", "or", "count", "csv",
  ].forEach(m => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.then = vi.fn((resolve: (val: unknown) => unknown) => resolve(defaultResolve));
  return chain;
}

const metricsChain = createChain();
const rpcMock = vi.fn().mockResolvedValue({ data: null, error: null });

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn(() => metricsChain),
    rpc: (...args: unknown[]) => rpcMock(...args),
  },
}));

vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  resolveTenantIdOrThrow: vi.fn(() => "test-tenant"),
  withTenant: vi.fn((q: unknown) => q),
  strictWithTenant: vi.fn((q: unknown) => q),
}));

vi.mock("@/lib/products", () => ({
  getProductNamesMap: vi.fn().mockResolvedValue({}),
}));

// NextRequest互換のモック
function createMockRequest(url: string) {
  const parsedUrl = new URL(url);
  return {
    method: "GET",
    url,
    nextUrl: { searchParams: parsedUrl.searchParams },
    cookies: { get: vi.fn(() => undefined) },
    headers: { get: vi.fn(() => null) },
  } as unknown as import("next/server").NextRequest;
}

import { GET } from "@/app/api/admin/analytics/route";
import { verifyAdminAuth } from "@/lib/admin-auth";

describe("売上分析API (analytics/route.ts)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(verifyAdminAuth).mockResolvedValue(true);

    // metricsチェーンリセット
    [
      "insert", "update", "delete", "select", "eq", "neq", "gt", "gte", "lt", "lte",
      "in", "is", "not", "order", "limit", "range", "single", "maybeSingle", "upsert",
      "ilike", "or", "count", "csv",
    ].forEach(m => {
      metricsChain[m] = vi.fn().mockReturnValue(metricsChain);
    });
    metricsChain.then = vi.fn((resolve: (val: unknown) => unknown) => resolve({ data: [], error: null, count: 0 }));

    // RPCモックリセット
    rpcMock.mockResolvedValue({ data: null, error: null });
  });

  // === 認証テスト ===
  describe("認証", () => {
    it("認証失敗 → 401", async () => {
      vi.mocked(verifyAdminAuth).mockResolvedValue(false);
      const req = createMockRequest("http://localhost/api/admin/analytics?type=daily");
      const res = await GET(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe("UNAUTHORIZED");
    });
  });

  // === type パラメータ分岐 ===
  describe("type パラメータ分岐", () => {
    it("不明なtype → 400", async () => {
      const req = createMockRequest("http://localhost/api/admin/analytics?type=unknown");
      const res = await GET(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toContain("不明");
    });

    it("type未指定（デフォルト=overview）→ 400", async () => {
      const req = createMockRequest("http://localhost/api/admin/analytics");
      const res = await GET(req);
      expect(res.status).toBe(400);
    });
  });

  // ========================================
  // type=daily: 日別売上推移（daily_revenue_summary RPC使用）
  // ========================================
  describe("type=daily: 日別売上推移", () => {
    it("データなし（data.data=null） → daily空配列", async () => {
      rpcMock.mockResolvedValueOnce({ data: { data: null }, error: null });

      const req = createMockRequest("http://localhost/api/admin/analytics?type=daily");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.daily).toEqual([]);
    });

    it("RPCエラー → daily空配列", async () => {
      rpcMock.mockResolvedValueOnce({ data: null, error: { message: "RPC error" } });

      const req = createMockRequest("http://localhost/api/admin/analytics?type=daily");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.daily).toEqual([]);
    });

    it("RPC応答あり → フロント互換フォーマットに変換される", async () => {
      rpcMock.mockResolvedValueOnce({
        data: {
          data: [
            {
              date: "2026-02-20",
              square: 20000,
              bank: 5000,
              refund: 0,
              total: 25000,
              squareCount: 2,
              bankCount: 1,
            },
            {
              date: "2026-02-21",
              square: 15000,
              bank: 5000,
              refund: 5000,
              total: 15000,
              squareCount: 1,
              bankCount: 1,
            },
          ],
        },
        error: null,
      });

      const req = createMockRequest("http://localhost/api/admin/analytics?type=daily");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();

      expect(json.daily).toHaveLength(2);
      // 2/20: square 20000 + bank 5000 = 25000（返金0）
      expect(json.daily[0].date).toBe("2026-02-20");
      expect(json.daily[0].gross).toBe(25000);
      expect(json.daily[0].refunds).toBe(0);
      expect(json.daily[0].revenue).toBe(25000);
      expect(json.daily[0].count).toBe(3);

      // 2/21: square 15000 + bank 5000 = 20000, refund 5000, total 15000
      expect(json.daily[1].date).toBe("2026-02-21");
      expect(json.daily[1].gross).toBe(20000);
      expect(json.daily[1].refunds).toBe(5000);
      expect(json.daily[1].revenue).toBe(15000);
      expect(json.daily[1].count).toBe(2);
    });

    it("from/toパラメータがRPCに渡される", async () => {
      rpcMock.mockResolvedValueOnce({ data: { data: [] }, error: null });

      const req = createMockRequest("http://localhost/api/admin/analytics?type=daily&from=2026-01-01&to=2026-01-31");
      const res = await GET(req);
      expect(res.status).toBe(200);
      // RPCに正しいパラメータが渡されたことを確認
      expect(rpcMock).toHaveBeenCalledWith("daily_revenue_summary", {
        p_tenant_id: "test-tenant",
        p_start_date: "2026-01-01",
        p_end_date: "2026-01-31",
      });
    });
  });

  // ========================================
  // type=ltv: LTV分析（RPC呼び出し）
  // ========================================
  describe("type=ltv: 患者LTV", () => {
    it("RPC成功 → LTVデータを返す", async () => {
      const ltvResult = {
        avgLtv: 28333,
        avgOrders: 2,
        medianLtv: 30000,
        maxLtv: 45000,
        totalPatients: 3,
        totalRevenue: 85000,
        distribution: [
          { label: "¥0〜", count: 0 },
          { label: "¥5,000〜", count: 1 },
          { label: "¥10,000〜", count: 0 },
          { label: "¥20,000〜", count: 1 },
          { label: "¥30,000〜", count: 0 },
          { label: "¥50,000〜", count: 0 },
          { label: "¥100,000〜", count: 0 },
          { label: "20万〜", count: 0 },
        ],
        repeatDist: [
          { label: "1回", count: 1 },
          { label: "2回", count: 1 },
          { label: "3回", count: 1 },
          { label: "4回以上", count: 0 },
        ],
      };
      rpcMock.mockResolvedValue({ data: ltvResult, error: null });

      const req = createMockRequest("http://localhost/api/admin/analytics?type=ltv");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();

      expect(json.ltv.totalPatients).toBe(3);
      expect(json.ltv.totalRevenue).toBe(85000);
      expect(json.ltv.avgLtv).toBe(28333);
      expect(json.ltv.avgOrders).toBe(2);
      expect(json.ltv.distribution).toBeDefined();
      expect(Array.isArray(json.ltv.distribution)).toBe(true);
      expect(json.ltv.repeatDist).toHaveLength(4);
      expect(json.ltv.repeatDist[0].label).toBe("1回");
      expect(json.ltv.repeatDist[0].count).toBe(1);

      // RPC呼び出しパラメータの検証
      expect(rpcMock).toHaveBeenCalledWith("analytics_ltv", {
        p_tenant_id: "test-tenant",
        p_start_date: null,
        p_end_date: null,
      });
    });

    it("RPC失敗 → 空LTVオブジェクト", async () => {
      rpcMock.mockResolvedValue({ data: null, error: { message: "RPC error" } });

      const req = createMockRequest("http://localhost/api/admin/analytics?type=ltv");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ltv).toEqual({});
    });

    it("from/toパラメータがRPCに渡される", async () => {
      rpcMock.mockResolvedValue({ data: { avgLtv: 0, totalPatients: 0, totalRevenue: 0, distribution: [], repeatDist: [] }, error: null });

      const req = createMockRequest("http://localhost/api/admin/analytics?type=ltv&from=2026-01-01&to=2026-03-31");
      await GET(req);

      expect(rpcMock).toHaveBeenCalledWith("analytics_ltv", {
        p_tenant_id: "test-tenant",
        p_start_date: "2026-01-01",
        p_end_date: "2026-03-31",
      });
    });
  });

  // ========================================
  // type=cohort: コホート分析（RPC呼び出し）
  // ========================================
  describe("type=cohort: コホート分析", () => {
    it("RPC成功 → コホートデータを返す", async () => {
      const cohortResult = [
        {
          month: "2026-01",
          size: 2,
          retention: [
            { monthOffset: 0, rate: 100 },
            { monthOffset: 1, rate: 50 },
          ],
        },
        {
          month: "2026-02",
          size: 1,
          retention: [
            { monthOffset: 0, rate: 100 },
          ],
        },
      ];
      rpcMock.mockResolvedValue({ data: cohortResult, error: null });

      const req = createMockRequest("http://localhost/api/admin/analytics?type=cohort");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();

      expect(json.cohort.length).toBe(2);
      const jan = json.cohort.find((c: Record<string, unknown>) => c.month === "2026-01");
      expect(jan).toBeDefined();
      expect(jan.size).toBe(2);
      expect(jan.retention[0].monthOffset).toBe(0);
      expect(jan.retention[0].rate).toBe(100);
      expect(jan.retention[1].monthOffset).toBe(1);
      expect(jan.retention[1].rate).toBe(50);

      // RPC呼び出しパラメータの検証
      expect(rpcMock).toHaveBeenCalledWith("analytics_cohort", {
        p_tenant_id: "test-tenant",
        p_months: 12,
      });
    });

    it("RPC失敗 → cohort空配列", async () => {
      rpcMock.mockResolvedValue({ data: null, error: { message: "RPC error" } });

      const req = createMockRequest("http://localhost/api/admin/analytics?type=cohort");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.cohort).toEqual([]);
    });
  });

  // ========================================
  // type=products: 商品別売上内訳（ordersテーブルから直接集計）
  // ========================================
  describe("type=products: 商品別売上内訳", () => {
    it("注文データあり → 商品別に集計して返す", async () => {
      // ordersテーブルからの直接クエリ結果をモック
      metricsChain.then = vi.fn((resolve: (val: unknown) => unknown) => resolve({
        data: [
          { product_code: "MJL_5mg_1m", product_name: "マンジャロ5mg 1ヶ月", amount: 22500, refunded_amount: null, refund_status: null },
          { product_code: "MJL_5mg_1m", product_name: "マンジャロ5mg 1ヶ月", amount: 22500, refunded_amount: null, refund_status: null },
          { product_code: "MJL_2.5mg_1m", product_name: "マンジャロ2.5mg 1ヶ月", amount: 10000, refunded_amount: null, refund_status: null },
          { product_code: "MJL_2.5mg_1m", product_name: "マンジャロ2.5mg 1ヶ月", amount: 10000, refunded_amount: null, refund_status: null },
        ],
        error: null,
      }));

      const req = createMockRequest("http://localhost/api/admin/analytics?type=products");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();

      expect(json.products).toHaveLength(2);
      // revenue順でソート（降順）
      expect(json.products[0].revenue).toBe(45000);
      expect(json.products[0].count).toBe(2);
      expect(json.products[1].revenue).toBe(20000);
      expect(json.products[1].count).toBe(2);
    });

    it("注文データなし → products空配列", async () => {
      metricsChain.then = vi.fn((resolve: (val: unknown) => unknown) => resolve({
        data: null,
        error: { message: "query error" },
      }));

      const req = createMockRequest("http://localhost/api/admin/analytics?type=products");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.products).toEqual([]);
    });

    it("ordersテーブルから正しくクエリされる", async () => {
      metricsChain.then = vi.fn((resolve: (val: unknown) => unknown) => resolve({
        data: [],
        error: null,
      }));

      const req = createMockRequest("http://localhost/api/admin/analytics?type=products&from=2026-01-01&to=2026-01-31");
      await GET(req);

      // ordersテーブルが使われることを確認
      const { supabaseAdmin } = await import("@/lib/supabase");
      expect(supabaseAdmin.from).toHaveBeenCalledWith("orders");
    });
  });
});
