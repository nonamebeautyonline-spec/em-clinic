// __tests__/api/cohort-widget.test.ts
// コホートウィジェット関連テスト
// - コホートAPIの統合テスト（type=cohort）— RPC版
// - ウィジェットで使用するヘルパー関数のテスト

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── コホートAPIテスト（RPC版） ──────────────────────────────────────

// daily_metricsテーブル用チェーン生成ヘルパー
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

const metricsChain = createChain();

// RPC呼び出しのモック（コホート・LTV・商品別集計）
const rpcMock = vi.fn().mockResolvedValue({ data: [], error: null });

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

describe("コホートウィジェット関連テスト", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(verifyAdminAuth).mockResolvedValue(true);
    rpcMock.mockResolvedValue({ data: [], error: null });
  });

  // ========================================
  // コホートAPIテスト（RPC版）
  // ========================================
  describe("コホートAPI (type=cohort)", () => {
    it("認証失敗 → 401", async () => {
      vi.mocked(verifyAdminAuth).mockResolvedValue(false);
      const req = createMockRequest("http://localhost/api/admin/analytics?type=cohort");
      const res = await GET(req);
      expect(res.status).toBe(401);
    });

    it("RPCがanalytics_cohortを呼び出す", async () => {
      rpcMock.mockResolvedValue({ data: [], error: null });
      const req = createMockRequest("http://localhost/api/admin/analytics?type=cohort");
      await GET(req);
      expect(rpcMock).toHaveBeenCalledWith("analytics_cohort", {
        p_tenant_id: "test-tenant",
        p_months: 12,
      });
    });

    it("データなし → cohort空配列", async () => {
      rpcMock.mockResolvedValue({ data: [], error: null });
      const req = createMockRequest("http://localhost/api/admin/analytics?type=cohort");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.cohort).toEqual([]);
    });

    it("data=null → cohort空配列", async () => {
      rpcMock.mockResolvedValue({ data: null, error: null });
      const req = createMockRequest("http://localhost/api/admin/analytics?type=cohort");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.cohort).toEqual([]);
    });

    it("RPCエラー → cohort空配列", async () => {
      rpcMock.mockResolvedValue({ data: null, error: { message: "RPC失敗" } });
      const req = createMockRequest("http://localhost/api/admin/analytics?type=cohort");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.cohort).toEqual([]);
    });

    it("RPCの結果がそのまま返される", async () => {
      // DB側RPC関数が返すコホートデータ形式
      const cohortData = [
        {
          month: "2026-01",
          size: 3,
          retention: [
            { monthOffset: 0, rate: 100 },
            { monthOffset: 1, rate: 67 },
            { monthOffset: 2, rate: 33 },
          ],
        },
        {
          month: "2026-02",
          size: 2,
          retention: [
            { monthOffset: 0, rate: 100 },
            { monthOffset: 1, rate: 50 },
          ],
        },
      ];
      rpcMock.mockResolvedValue({ data: cohortData, error: null });

      const req = createMockRequest("http://localhost/api/admin/analytics?type=cohort");
      const res = await GET(req);
      const json = await res.json();

      // RPCの結果がそのまま返される
      expect(json.cohort).toEqual(cohortData);
      expect(json.cohort).toHaveLength(2);
    });

    it("コホートの構造が正しい（month, size, retention配列）", async () => {
      const cohortData = [
        {
          month: "2026-01",
          size: 3,
          retention: [
            { monthOffset: 0, rate: 100 },
            { monthOffset: 1, rate: 67 },
          ],
        },
      ];
      rpcMock.mockResolvedValue({ data: cohortData, error: null });

      const req = createMockRequest("http://localhost/api/admin/analytics?type=cohort");
      const res = await GET(req);
      const json = await res.json();

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

    it("リテンション配列の各要素にmonthOffsetとrateが含まれる", async () => {
      const cohortData = [
        {
          month: "2026-01",
          size: 1,
          retention: [
            { monthOffset: 0, rate: 100 },
            { monthOffset: 1, rate: 50 },
          ],
        },
      ];
      rpcMock.mockResolvedValue({ data: cohortData, error: null });

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
