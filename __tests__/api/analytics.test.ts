// __tests__/api/analytics.test.ts
// 売上分析・LTV・コホートAPI（219行）のテスト
// 対象: app/api/admin/analytics/route.ts
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

const ordersChain = createChain();

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn(() => ordersChain),
  },
}));

vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  withTenant: vi.fn((q: any) => q),
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
  } as any;
}

import { GET } from "@/app/api/admin/analytics/route";
import { verifyAdminAuth } from "@/lib/admin-auth";

describe("売上分析API (analytics/route.ts)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (verifyAdminAuth as any).mockResolvedValue(true);

    // チェーンリセット
    [
      "insert", "update", "delete", "select", "eq", "neq", "gt", "gte", "lt", "lte",
      "in", "is", "not", "order", "limit", "range", "single", "maybeSingle", "upsert",
      "ilike", "or", "count", "csv",
    ].forEach(m => {
      ordersChain[m] = vi.fn().mockReturnValue(ordersChain);
    });
    ordersChain.then = vi.fn((resolve: any) => resolve({ data: [], error: null, count: 0 }));
  });

  // === 認証テスト ===
  describe("認証", () => {
    it("認証失敗 → 401", async () => {
      (verifyAdminAuth as any).mockResolvedValue(false);
      const req = createMockRequest("http://localhost/api/admin/analytics?type=daily");
      const res = await GET(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe("Unauthorized");
    });
  });

  // === type パラメータ分岐 ===
  describe("type パラメータ分岐", () => {
    it("不明なtype → 400", async () => {
      const req = createMockRequest("http://localhost/api/admin/analytics?type=unknown");
      const res = await GET(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain("不明");
    });

    it("type未指定（デフォルト=overview）→ 400", async () => {
      const req = createMockRequest("http://localhost/api/admin/analytics");
      const res = await GET(req);
      expect(res.status).toBe(400);
    });
  });

  // ========================================
  // type=daily: 日別売上推移
  // ========================================
  describe("type=daily: 日別売上推移", () => {
    it("データなし → daily空配列", async () => {
      ordersChain.then = vi.fn((resolve: any) => resolve({ data: [], error: null }));

      const req = createMockRequest("http://localhost/api/admin/analytics?type=daily");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.daily).toEqual([]);
    });

    it("data=null → daily空配列", async () => {
      ordersChain.then = vi.fn((resolve: any) => resolve({ data: null, error: null }));

      const req = createMockRequest("http://localhost/api/admin/analytics?type=daily");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.daily).toEqual([]);
    });

    it("注文データあり → 日別で集計される", async () => {
      ordersChain.then = vi.fn((resolve: any) => resolve({
        data: [
          { amount: 10000, paid_at: "2026-02-20T10:00:00Z", refund_status: null, refunded_amount: null },
          { amount: 15000, paid_at: "2026-02-20T14:00:00Z", refund_status: null, refunded_amount: null },
          { amount: 20000, paid_at: "2026-02-21T09:00:00Z", refund_status: "COMPLETED", refunded_amount: 5000 },
        ],
        error: null,
      }));

      const req = createMockRequest("http://localhost/api/admin/analytics?type=daily");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();

      expect(json.daily).toHaveLength(2);
      // 日付でソートされている
      expect(json.daily[0].date).toBe("2026-02-20");
      expect(json.daily[1].date).toBe("2026-02-21");

      // 2/20: 10000 + 15000 = 25000（返金なし）
      expect(json.daily[0].gross).toBe(25000);
      expect(json.daily[0].refunds).toBe(0);
      expect(json.daily[0].revenue).toBe(25000);
      expect(json.daily[0].count).toBe(2);

      // 2/21: 20000 - 5000（返金差引）
      expect(json.daily[1].gross).toBe(20000);
      expect(json.daily[1].refunds).toBe(5000);
      expect(json.daily[1].revenue).toBe(15000);
      expect(json.daily[1].count).toBe(1);
    });

    it("from/to パラメータが適用される", async () => {
      ordersChain.then = vi.fn((resolve: any) => resolve({ data: [], error: null }));

      const req = createMockRequest("http://localhost/api/admin/analytics?type=daily&from=2026-01-01&to=2026-01-31");
      const res = await GET(req);
      expect(res.status).toBe(200);
      // gteとlteが呼ばれていることを確認
      expect(ordersChain.gte).toHaveBeenCalled();
      expect(ordersChain.lte).toHaveBeenCalled();
    });
  });

  // ========================================
  // type=ltv: LTV分析
  // ========================================
  describe("type=ltv: 患者LTV", () => {
    it("データなし → 空LTV", async () => {
      ordersChain.then = vi.fn((resolve: any) => resolve({ data: [], error: null }));

      const req = createMockRequest("http://localhost/api/admin/analytics?type=ltv");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ltv.avgLtv).toBe(0);
      expect(json.ltv.avgOrders).toBe(0);
      expect(json.ltv.totalPatients).toBe(0);
      expect(json.ltv.totalRevenue).toBe(0);
    });

    it("data=null → 空LTVオブジェクト", async () => {
      ordersChain.then = vi.fn((resolve: any) => resolve({ data: null, error: null }));

      const req = createMockRequest("http://localhost/api/admin/analytics?type=ltv");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ltv).toEqual({});
    });

    it("注文データあり → LTV・分布・リピーター分布が計算される", async () => {
      ordersChain.then = vi.fn((resolve: any) => resolve({
        data: [
          // 患者A: 2回購入、合計30000
          { patient_id: "pa", amount: 10000, paid_at: "2026-01-10T00:00:00Z", refund_status: null, refunded_amount: null },
          { patient_id: "pa", amount: 20000, paid_at: "2026-02-10T00:00:00Z", refund_status: null, refunded_amount: null },
          // 患者B: 1回購入、15000（返金5000で実質10000）
          { patient_id: "pb", amount: 15000, paid_at: "2026-01-15T00:00:00Z", refund_status: "COMPLETED", refunded_amount: 5000 },
          // 患者C: 3回購入、合計45000
          { patient_id: "pc", amount: 15000, paid_at: "2026-01-01T00:00:00Z", refund_status: null, refunded_amount: null },
          { patient_id: "pc", amount: 15000, paid_at: "2026-01-20T00:00:00Z", refund_status: null, refunded_amount: null },
          { patient_id: "pc", amount: 15000, paid_at: "2026-02-20T00:00:00Z", refund_status: null, refunded_amount: null },
        ],
        error: null,
      }));

      const req = createMockRequest("http://localhost/api/admin/analytics?type=ltv");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();

      expect(json.ltv.totalPatients).toBe(3);
      // pa=30000, pb=10000, pc=45000 → 合計85000
      expect(json.ltv.totalRevenue).toBe(85000);
      // 平均LTV = 85000 / 3 ≒ 28333
      expect(json.ltv.avgLtv).toBe(Math.round(85000 / 3));
      // 平均注文数 = (2+1+3)/3 = 2.0
      expect(json.ltv.avgOrders).toBe(2);

      // LTV分布（distributionフィールド）の存在確認
      expect(json.ltv.distribution).toBeDefined();
      expect(Array.isArray(json.ltv.distribution)).toBe(true);
      expect(json.ltv.distribution.length).toBeGreaterThan(0);

      // リピーター分布
      expect(json.ltv.repeatDist).toBeDefined();
      expect(json.ltv.repeatDist).toHaveLength(4);
      // 1回: pb=1人
      expect(json.ltv.repeatDist[0].label).toBe("1回");
      expect(json.ltv.repeatDist[0].count).toBe(1);
      // 2回: pa=1人
      expect(json.ltv.repeatDist[1].label).toBe("2回");
      expect(json.ltv.repeatDist[1].count).toBe(1);
      // 3回: pc=1人
      expect(json.ltv.repeatDist[2].label).toBe("3回");
      expect(json.ltv.repeatDist[2].count).toBe(1);
      // 4回以上: 0人
      expect(json.ltv.repeatDist[3].label).toBe("4回以上");
      expect(json.ltv.repeatDist[3].count).toBe(0);
    });

    it("patient_id=null の注文は無視される", async () => {
      ordersChain.then = vi.fn((resolve: any) => resolve({
        data: [
          { patient_id: null, amount: 10000, paid_at: "2026-01-10T00:00:00Z", refund_status: null, refunded_amount: null },
          { patient_id: "pa", amount: 20000, paid_at: "2026-02-10T00:00:00Z", refund_status: null, refunded_amount: null },
        ],
        error: null,
      }));

      const req = createMockRequest("http://localhost/api/admin/analytics?type=ltv");
      const res = await GET(req);
      const json = await res.json();
      // patient_id=null は無視されるので1人
      expect(json.ltv.totalPatients).toBe(1);
    });
  });

  // ========================================
  // type=cohort: コホート分析
  // ========================================
  describe("type=cohort: コホート分析", () => {
    it("データなし → cohort空配列", async () => {
      ordersChain.then = vi.fn((resolve: any) => resolve({ data: [], error: null }));

      const req = createMockRequest("http://localhost/api/admin/analytics?type=cohort");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.cohort).toEqual([]);
    });

    it("data=null → cohort空配列", async () => {
      ordersChain.then = vi.fn((resolve: any) => resolve({ data: null, error: null }));

      const req = createMockRequest("http://localhost/api/admin/analytics?type=cohort");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.cohort).toEqual([]);
    });

    it("注文データあり → コホートとリテンション率が計算される", async () => {
      ordersChain.then = vi.fn((resolve: any) => resolve({
        data: [
          // 患者A: 2026-01に初回、2026-02にリピート
          { patient_id: "pa", paid_at: "2026-01-05T00:00:00Z" },
          { patient_id: "pa", paid_at: "2026-02-10T00:00:00Z" },
          // 患者B: 2026-01に初回のみ
          { patient_id: "pb", paid_at: "2026-01-15T00:00:00Z" },
          // 患者C: 2026-02に初回
          { patient_id: "pc", paid_at: "2026-02-01T00:00:00Z" },
        ],
        error: null,
      }));

      const req = createMockRequest("http://localhost/api/admin/analytics?type=cohort");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();

      expect(json.cohort.length).toBeGreaterThanOrEqual(2);

      // 2026-01コホート: pa, pb = 2人
      const jan = json.cohort.find((c: any) => c.month === "2026-01");
      expect(jan).toBeDefined();
      expect(jan.size).toBe(2);
      // month=0（初月）: 2人とも購入 → 100%
      expect(jan.retention[0].monthOffset).toBe(0);
      expect(jan.retention[0].rate).toBe(100);
      // month=1: paのみリピート → 50%
      expect(jan.retention[1].monthOffset).toBe(1);
      expect(jan.retention[1].rate).toBe(50);

      // 2026-02コホート: pc = 1人（paは2026-01が初回なのでここには含まれない）
      const feb = json.cohort.find((c: any) => c.month === "2026-02");
      expect(feb).toBeDefined();
      expect(feb.size).toBe(1);
    });

    it("patient_id=null の注文は無視される", async () => {
      ordersChain.then = vi.fn((resolve: any) => resolve({
        data: [
          { patient_id: null, paid_at: "2026-01-05T00:00:00Z" },
          { patient_id: "pa", paid_at: "2026-01-10T00:00:00Z" },
        ],
        error: null,
      }));

      const req = createMockRequest("http://localhost/api/admin/analytics?type=cohort");
      const res = await GET(req);
      const json = await res.json();
      // 1コホート（2026-01）、1人のみ
      expect(json.cohort).toHaveLength(1);
      expect(json.cohort[0].size).toBe(1);
    });

    it("最大12ヶ月分のコホートに制限される", async () => {
      // 15ヶ月分のデータを生成
      const orders: any[] = [];
      for (let i = 0; i < 15; i++) {
        const month = String(i + 1).padStart(2, "0");
        const year = i < 12 ? "2025" : "2026";
        const m = i < 12 ? String(i + 1).padStart(2, "0") : String(i - 11).padStart(2, "0");
        orders.push({
          patient_id: `p-${i}`,
          paid_at: `${year}-${m}-10T00:00:00Z`,
        });
      }

      ordersChain.then = vi.fn((resolve: any) => resolve({ data: orders, error: null }));

      const req = createMockRequest("http://localhost/api/admin/analytics?type=cohort");
      const res = await GET(req);
      const json = await res.json();
      // slice(-12) で最大12ヶ月
      expect(json.cohort.length).toBeLessThanOrEqual(12);
    });
  });

  // ========================================
  // type=products: 商品別売上内訳
  // ========================================
  describe("type=products: 商品別売上内訳", () => {
    it("データなし → products空配列", async () => {
      ordersChain.then = vi.fn((resolve: any) => resolve({ data: [], error: null }));

      const req = createMockRequest("http://localhost/api/admin/analytics?type=products");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.products).toEqual([]);
    });

    it("data=null → products空配列", async () => {
      ordersChain.then = vi.fn((resolve: any) => resolve({ data: null, error: null }));

      const req = createMockRequest("http://localhost/api/admin/analytics?type=products");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.products).toEqual([]);
    });

    it("注文データあり → 商品コード別に集計され売上降順", async () => {
      ordersChain.then = vi.fn((resolve: any) => resolve({
        data: [
          { product_code: "MJL_2.5mg_1m", amount: 10000, refund_status: null, refunded_amount: null },
          { product_code: "MJL_2.5mg_1m", amount: 10000, refund_status: null, refunded_amount: null },
          { product_code: "MJL_5mg_1m", amount: 25000, refund_status: null, refunded_amount: null },
          { product_code: "MJL_5mg_1m", amount: 25000, refund_status: "COMPLETED", refunded_amount: 5000 },
        ],
        error: null,
      }));

      const req = createMockRequest("http://localhost/api/admin/analytics?type=products");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();

      expect(json.products).toHaveLength(2);
      // 売上降順: MJL_5mg_1m (25000+20000=45000) > MJL_2.5mg_1m (20000)
      expect(json.products[0].code).toBe("MJL_5mg_1m");
      expect(json.products[0].revenue).toBe(45000); // 25000 + (25000-5000)
      expect(json.products[0].count).toBe(2);

      expect(json.products[1].code).toBe("MJL_2.5mg_1m");
      expect(json.products[1].revenue).toBe(20000);
      expect(json.products[1].count).toBe(2);
    });

    it("product_code=null → '不明' として集計", async () => {
      ordersChain.then = vi.fn((resolve: any) => resolve({
        data: [
          { product_code: null, amount: 5000, refund_status: null, refunded_amount: null },
        ],
        error: null,
      }));

      const req = createMockRequest("http://localhost/api/admin/analytics?type=products");
      const res = await GET(req);
      const json = await res.json();
      expect(json.products[0].code).toBe("不明");
    });

    it("from/to パラメータが適用される", async () => {
      ordersChain.then = vi.fn((resolve: any) => resolve({ data: [], error: null }));

      const req = createMockRequest("http://localhost/api/admin/analytics?type=products&from=2026-01-01&to=2026-01-31");
      const res = await GET(req);
      expect(res.status).toBe(200);
      expect(ordersChain.gte).toHaveBeenCalled();
      expect(ordersChain.lte).toHaveBeenCalled();
    });

    it("全額返金の場合 → revenue=0", async () => {
      ordersChain.then = vi.fn((resolve: any) => resolve({
        data: [
          { product_code: "TEST", amount: 10000, refund_status: "COMPLETED", refunded_amount: 10000 },
        ],
        error: null,
      }));

      const req = createMockRequest("http://localhost/api/admin/analytics?type=products");
      const res = await GET(req);
      const json = await res.json();
      expect(json.products[0].revenue).toBe(0);
    });
  });
});
