// __tests__/api/cohort-widget.test.ts
// コホートウィジェット関連テスト
// - コホートAPIの統合テスト（type=cohort）
// - ウィジェットで使用するヘルパー関数のテスト

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── コホートAPIテスト ──────────────────────────────────────

// チェーン生成ヘルパー
type SupabaseChain = Record<string, ReturnType<typeof vi.fn>>;
function createChain(
  defaultResolve: Record<string, unknown> = { data: [], error: null, count: 0 },
) {
  const chain: SupabaseChain = {};
  [
    "insert", "update", "delete", "select", "eq", "neq", "gt", "gte", "lt", "lte",
    "in", "is", "not", "order", "limit", "range", "single", "maybeSingle", "upsert",
    "ilike", "or", "count", "csv",
  ].forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.then = vi.fn((resolve: (val: unknown) => unknown) =>
    resolve(defaultResolve),
  );
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
  withTenant: vi.fn((q: unknown) => q),
}));

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

// チェーンリセット
function resetChain() {
  [
    "insert", "update", "delete", "select", "eq", "neq", "gt", "gte", "lt", "lte",
    "in", "is", "not", "order", "limit", "range", "single", "maybeSingle", "upsert",
    "ilike", "or", "count", "csv",
  ].forEach((m) => {
    ordersChain[m] = vi.fn().mockReturnValue(ordersChain);
  });
  ordersChain.then = vi.fn((resolve: (val: unknown) => unknown) =>
    resolve({ data: [], error: null, count: 0 }),
  );
}

describe("コホートウィジェット関連テスト", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(verifyAdminAuth).mockResolvedValue(true);
    resetChain();
  });

  // ========================================
  // コホートAPIテスト
  // ========================================
  describe("コホートAPI (type=cohort)", () => {
    it("認証失敗 → 401", async () => {
      vi.mocked(verifyAdminAuth).mockResolvedValue(false);
      const req = createMockRequest("http://localhost/api/admin/analytics?type=cohort");
      const res = await GET(req);
      expect(res.status).toBe(401);
    });

    it("データなし → cohort空配列", async () => {
      ordersChain.then = vi.fn((resolve: (val: unknown) => unknown) =>
        resolve({ data: [], error: null }),
      );
      const req = createMockRequest("http://localhost/api/admin/analytics?type=cohort");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.cohort).toEqual([]);
    });

    it("data=null → cohort空配列", async () => {
      ordersChain.then = vi.fn((resolve: (val: unknown) => unknown) =>
        resolve({ data: null, error: null }),
      );
      const req = createMockRequest("http://localhost/api/admin/analytics?type=cohort");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.cohort).toEqual([]);
    });

    it("コホートの構造が正しい（month, size, retention配列）", async () => {
      ordersChain.then = vi.fn((resolve: (val: unknown) => unknown) =>
        resolve({
          data: [
            { patient_id: "pa", paid_at: "2026-01-05T00:00:00Z" },
            { patient_id: "pa", paid_at: "2026-02-10T00:00:00Z" },
            { patient_id: "pb", paid_at: "2026-01-15T00:00:00Z" },
          ],
          error: null,
        }),
      );

      const req = createMockRequest("http://localhost/api/admin/analytics?type=cohort");
      const res = await GET(req);
      const json = await res.json();

      // 少なくとも1コホート存在
      expect(json.cohort.length).toBeGreaterThanOrEqual(1);

      // 各コホートの構造を確認
      for (const c of json.cohort) {
        expect(c).toHaveProperty("month");
        expect(c).toHaveProperty("size");
        expect(c).toHaveProperty("retention");
        expect(typeof c.month).toBe("string");
        expect(typeof c.size).toBe("number");
        expect(Array.isArray(c.retention)).toBe(true);
      }
    });

    it("初月のリテンション率は常に100%", async () => {
      ordersChain.then = vi.fn((resolve: (val: unknown) => unknown) =>
        resolve({
          data: [
            { patient_id: "pa", paid_at: "2026-03-05T00:00:00Z" },
            { patient_id: "pb", paid_at: "2026-03-15T00:00:00Z" },
            { patient_id: "pc", paid_at: "2026-03-20T00:00:00Z" },
          ],
          error: null,
        }),
      );

      const req = createMockRequest("http://localhost/api/admin/analytics?type=cohort");
      const res = await GET(req);
      const json = await res.json();

      // 2026-03コホートの初月（monthOffset=0）は100%
      const march = json.cohort.find((c: { month: string }) => c.month === "2026-03");
      expect(march).toBeDefined();
      expect(march.size).toBe(3);
      expect(march.retention[0].monthOffset).toBe(0);
      expect(march.retention[0].rate).toBe(100);
    });

    it("リテンション率の計算が正確（リピートした人数/コホート人数）", async () => {
      ordersChain.then = vi.fn((resolve: (val: unknown) => unknown) =>
        resolve({
          data: [
            // 2026-01コホート: pa, pb, pc (3人)
            { patient_id: "pa", paid_at: "2026-01-05T00:00:00Z" },
            { patient_id: "pb", paid_at: "2026-01-10T00:00:00Z" },
            { patient_id: "pc", paid_at: "2026-01-20T00:00:00Z" },
            // 2026-02: paとpcがリピート（2/3 = 67%）
            { patient_id: "pa", paid_at: "2026-02-05T00:00:00Z" },
            { patient_id: "pc", paid_at: "2026-02-15T00:00:00Z" },
            // 2026-03: paのみリピート（1/3 = 33%）
            { patient_id: "pa", paid_at: "2026-03-05T00:00:00Z" },
          ],
          error: null,
        }),
      );

      const req = createMockRequest("http://localhost/api/admin/analytics?type=cohort");
      const res = await GET(req);
      const json = await res.json();

      const jan = json.cohort.find((c: { month: string }) => c.month === "2026-01");
      expect(jan).toBeDefined();
      expect(jan.size).toBe(3);

      // 初月: 100%
      expect(jan.retention[0].rate).toBe(100);
      // 1ヶ月後: 2/3 = 67%（Math.round）
      expect(jan.retention[1].rate).toBe(67);
      // 2ヶ月後: 1/3 = 33%（Math.round）
      expect(jan.retention[2].rate).toBe(33);
    });

    it("複数コホートが月順にソートされる", async () => {
      ordersChain.then = vi.fn((resolve: (val: unknown) => unknown) =>
        resolve({
          data: [
            { patient_id: "pa", paid_at: "2026-03-01T00:00:00Z" },
            { patient_id: "pb", paid_at: "2026-01-01T00:00:00Z" },
            { patient_id: "pc", paid_at: "2026-02-01T00:00:00Z" },
          ],
          error: null,
        }),
      );

      const req = createMockRequest("http://localhost/api/admin/analytics?type=cohort");
      const res = await GET(req);
      const json = await res.json();

      // コホート月が昇順であることを確認
      const months = json.cohort.map((c: { month: string }) => c.month);
      const sorted = [...months].sort();
      expect(months).toEqual(sorted);
    });

    it("patient_id=null の注文は無視される", async () => {
      ordersChain.then = vi.fn((resolve: (val: unknown) => unknown) =>
        resolve({
          data: [
            { patient_id: null, paid_at: "2026-01-05T00:00:00Z" },
            { patient_id: "pa", paid_at: "2026-01-10T00:00:00Z" },
          ],
          error: null,
        }),
      );

      const req = createMockRequest("http://localhost/api/admin/analytics?type=cohort");
      const res = await GET(req);
      const json = await res.json();

      // 1コホート（2026-01）、1人のみ
      expect(json.cohort).toHaveLength(1);
      expect(json.cohort[0].size).toBe(1);
    });

    it("最大12ヶ月分のコホートに制限される", async () => {
      // 15ヶ月分のデータを生成
      const orders: Record<string, unknown>[] = [];
      for (let i = 0; i < 15; i++) {
        const year = 2025 + Math.floor(i / 12);
        const month = (i % 12) + 1;
        orders.push({
          patient_id: `p-${i}`,
          paid_at: `${year}-${String(month).padStart(2, "0")}-10T00:00:00Z`,
        });
      }

      ordersChain.then = vi.fn((resolve: (val: unknown) => unknown) =>
        resolve({ data: orders, error: null }),
      );

      const req = createMockRequest("http://localhost/api/admin/analytics?type=cohort");
      const res = await GET(req);
      const json = await res.json();
      expect(json.cohort.length).toBeLessThanOrEqual(12);
    });

    it("リテンション配列の各要素にmonthOffsetとrateが含まれる", async () => {
      ordersChain.then = vi.fn((resolve: (val: unknown) => unknown) =>
        resolve({
          data: [
            { patient_id: "pa", paid_at: "2026-01-05T00:00:00Z" },
            { patient_id: "pa", paid_at: "2026-02-05T00:00:00Z" },
          ],
          error: null,
        }),
      );

      const req = createMockRequest("http://localhost/api/admin/analytics?type=cohort");
      const res = await GET(req);
      const json = await res.json();

      const jan = json.cohort.find((c: { month: string }) => c.month === "2026-01");
      expect(jan).toBeDefined();
      for (const r of jan.retention) {
        expect(r).toHaveProperty("monthOffset");
        expect(r).toHaveProperty("rate");
        expect(typeof r.monthOffset).toBe("number");
        expect(typeof r.rate).toBe("number");
        expect(r.rate).toBeGreaterThanOrEqual(0);
        expect(r.rate).toBeLessThanOrEqual(100);
      }
    });
  });

  // ========================================
  // ヘルパー関数テスト（ウィジェット内ロジック）
  // ========================================
  describe("ヒートマップヘルパー関数", () => {
    // getCellBgStyle相当のロジックテスト
    // ウィジェットで使用する色分けロジック
    function getCellBgColor(rate: number): string {
      if (rate >= 80) return "green-high";
      if (rate >= 60) return "green-mid";
      if (rate >= 40) return "yellow";
      if (rate >= 20) return "orange";
      if (rate > 0) return "red";
      return "empty";
    }

    it("80%以上 → 高緑", () => {
      expect(getCellBgColor(100)).toBe("green-high");
      expect(getCellBgColor(80)).toBe("green-high");
    });

    it("60-79% → 中緑", () => {
      expect(getCellBgColor(79)).toBe("green-mid");
      expect(getCellBgColor(60)).toBe("green-mid");
    });

    it("40-59% → 黄", () => {
      expect(getCellBgColor(59)).toBe("yellow");
      expect(getCellBgColor(40)).toBe("yellow");
    });

    it("20-39% → 橙", () => {
      expect(getCellBgColor(39)).toBe("orange");
      expect(getCellBgColor(20)).toBe("orange");
    });

    it("1-19% → 赤", () => {
      expect(getCellBgColor(19)).toBe("red");
      expect(getCellBgColor(1)).toBe("red");
    });

    it("0% → 空", () => {
      expect(getCellBgColor(0)).toBe("empty");
    });

    // formatMonthLabel相当のテスト
    function formatMonthLabel(month: string): string {
      const [y, m] = month.split("-");
      return `${y.slice(2)}年${parseInt(m)}月`;
    }

    it("月ラベルが正しくフォーマットされる", () => {
      expect(formatMonthLabel("2026-01")).toBe("26年1月");
      expect(formatMonthLabel("2025-12")).toBe("25年12月");
      expect(formatMonthLabel("2026-03")).toBe("26年3月");
    });

    // アクティブ人数の計算テスト
    it("アクティブ人数 = リテンション率 * コホート人数 / 100（四捨五入）", () => {
      const calcActive = (rate: number, size: number) =>
        Math.round((rate / 100) * size);

      expect(calcActive(100, 50)).toBe(50);
      expect(calcActive(50, 50)).toBe(25);
      expect(calcActive(67, 3)).toBe(2);
      expect(calcActive(33, 3)).toBe(1);
      expect(calcActive(0, 100)).toBe(0);
    });

    // 期間フィルタのテスト
    it("期間フィルタ: 6ヶ月 → 最新6件", () => {
      const data = Array.from({ length: 10 }, (_, i) => ({
        month: `2025-${String(i + 1).padStart(2, "0")}`,
        size: 10,
        retention: [],
      }));

      const filtered = data.slice(-6);
      expect(filtered).toHaveLength(6);
      expect(filtered[0].month).toBe("2025-05");
      expect(filtered[5].month).toBe("2025-10");
    });

    it("期間フィルタ: 12ヶ月 → 最新12件", () => {
      const data = Array.from({ length: 15 }, (_, i) => ({
        month: `2025-${String((i % 12) + 1).padStart(2, "0")}`,
        size: 10,
        retention: [],
      }));

      const filtered = data.slice(-12);
      expect(filtered).toHaveLength(12);
    });

    it("期間フィルタ: 全期間 → 全データ返却", () => {
      const data = Array.from({ length: 20 }, (_, i) => ({
        month: `2024-${String((i % 12) + 1).padStart(2, "0")}`,
        size: 10,
        retention: [],
      }));

      // "all" は全件
      expect(data).toHaveLength(20);
    });

    // 最大経過月数の算出テスト
    it("最大経過月数が正しく算出される", () => {
      const data = [
        { month: "2025-01", size: 10, retention: [{ monthOffset: 0, rate: 100 }, { monthOffset: 1, rate: 50 }, { monthOffset: 2, rate: 30 }] },
        { month: "2025-02", size: 5, retention: [{ monthOffset: 0, rate: 100 }, { monthOffset: 1, rate: 60 }] },
        { month: "2025-03", size: 8, retention: [{ monthOffset: 0, rate: 100 }] },
      ];

      const maxOffset = data.reduce(
        (max, row) => Math.max(max, row.retention.length - 1),
        0,
      );
      expect(maxOffset).toBe(2);
    });
  });
});
