// __tests__/api/admin-kpi-targets.test.ts
// KPI目標設定API テスト
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- モック定義 ---
const mockVerifyAdminAuth = vi.fn();
const mockGetAdminUserId = vi.fn();

vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: (...args: unknown[]) => mockVerifyAdminAuth(...args),
  getAdminUserId: (...args: unknown[]) => mockGetAdminUserId(...args),
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  withTenant: vi.fn((q: unknown) => q),
  tenantPayload: vi.fn(() => ({ tenant_id: "test-tenant" })),
}));

// Supabase モック
const mockSelect = vi.fn();
const mockUpsert = vi.fn();
const mockDelete = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();
const mockSingle = vi.fn();
const mockGte = vi.fn();
const mockLt = vi.fn();
const mockIn = vi.fn();
const mockLimit = vi.fn();

function createChainMock(finalData: unknown = [], finalError: unknown = null) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: finalData, error: finalError }),
    then: undefined as unknown,
  };
  // Promise-like resolution for awaitable chains
  (chain as unknown as { then: unknown }).then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve(resolve({ data: finalData, error: finalError, count: Array.isArray(finalData) ? finalData.length : 0 }));
  return chain;
}

const mockFrom = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

// --- リクエストヘルパー ---
function createRequest(method: string, url: string, body?: unknown) {
  const init: RequestInit = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body !== undefined) init.body = JSON.stringify(body);

  // NextRequest互換のモック
  const req = new Request(url, init);
  const parsedUrl = new URL(url);

  return Object.assign(req, {
    nextUrl: parsedUrl,
    cookies: {
      get: vi.fn(() => ({ value: "mock-session" })),
      getAll: vi.fn(() => []),
      has: vi.fn(() => true),
      set: vi.fn(),
      delete: vi.fn(),
      clear: vi.fn(),
      size: 1,
      [Symbol.iterator]: function* () { yield ["admin_session", { value: "mock-session" }]; },
      entries: vi.fn(),
      keys: vi.fn(),
      values: vi.fn(),
      forEach: vi.fn(),
    },
  });
}

import { GET, POST, DELETE } from "@/app/api/admin/kpi-targets/route";

describe("KPI目標設定 API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyAdminAuth.mockResolvedValue(true);
    mockGetAdminUserId.mockResolvedValue("admin-user-id");
  });

  // ─── GET テスト ───────────────────────────────────
  describe("GET", () => {
    it("認証なし → 401", async () => {
      mockVerifyAdminAuth.mockResolvedValue(false);
      const req = createRequest("GET", "http://localhost/api/admin/kpi-targets?year_month=2026-03");
      const res = await GET(req as never);
      expect(res.status).toBe(401);
    });

    it("目標一覧を取得", async () => {
      const mockTargets = [
        { id: "1", metric_type: "revenue", target_value: 1000000, year_month: "2026-03" },
        { id: "2", metric_type: "new_patients", target_value: 50, year_month: "2026-03" },
      ];

      const chain = createChainMock(mockTargets);
      mockFrom.mockReturnValue(chain);

      const req = createRequest("GET", "http://localhost/api/admin/kpi-targets?year_month=2026-03");
      const res = await GET(req as never);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.targets).toHaveLength(2);
    });

    it("with_actuals=true で実績付き取得", async () => {
      const mockTargets = [
        { id: "1", metric_type: "revenue", target_value: 1000000, year_month: "2026-03" },
      ];

      // 最初のfrom呼び出し（目標取得）
      const targetChain = createChainMock(mockTargets);
      // 後続のfrom呼び出し（実績取得）はすべて空配列を返す
      const emptyChain = createChainMock([]);

      mockFrom
        .mockReturnValueOnce(targetChain)
        // fetchActuals内の8つのクエリ
        .mockReturnValue(emptyChain);

      const req = createRequest(
        "GET",
        "http://localhost/api/admin/kpi-targets?year_month=2026-03&with_actuals=true",
      );
      const res = await GET(req as never);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.targets).toBeDefined();
      expect(json.actuals).toBeDefined();
    });

    it("year_month なしでも取得できる（全件）", async () => {
      const chain = createChainMock([]);
      mockFrom.mockReturnValue(chain);

      const req = createRequest("GET", "http://localhost/api/admin/kpi-targets");
      const res = await GET(req as never);
      expect(res.status).toBe(200);
    });
  });

  // ─── POST テスト ───────────────────────────────────
  describe("POST", () => {
    it("認証なし → 401", async () => {
      mockVerifyAdminAuth.mockResolvedValue(false);
      const req = createRequest("POST", "http://localhost/api/admin/kpi-targets", {
        metric_type: "revenue",
        target_value: 1000000,
        year_month: "2026-03",
      });
      const res = await POST(req as never);
      expect(res.status).toBe(401);
    });

    it("正常にupsert", async () => {
      const savedData = {
        id: "new-id",
        metric_type: "revenue",
        target_value: 1000000,
        year_month: "2026-03",
      };

      const chain = {
        upsert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: savedData, error: null }),
          }),
        }),
      };
      mockFrom.mockReturnValue(chain);

      const req = createRequest("POST", "http://localhost/api/admin/kpi-targets", {
        metric_type: "revenue",
        target_value: 1000000,
        year_month: "2026-03",
      });
      const res = await POST(req as never);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.target.metric_type).toBe("revenue");
    });

    it("無効なmetric_type → 400", async () => {
      const req = createRequest("POST", "http://localhost/api/admin/kpi-targets", {
        metric_type: "invalid_type",
        target_value: 100,
        year_month: "2026-03",
      });
      const res = await POST(req as never);
      expect(res.status).toBe(400);
    });

    it("負の目標値 → 400", async () => {
      const req = createRequest("POST", "http://localhost/api/admin/kpi-targets", {
        metric_type: "revenue",
        target_value: -100,
        year_month: "2026-03",
      });
      const res = await POST(req as never);
      expect(res.status).toBe(400);
    });

    it("不正なyear_month → 400", async () => {
      const req = createRequest("POST", "http://localhost/api/admin/kpi-targets", {
        metric_type: "revenue",
        target_value: 1000000,
        year_month: "2026-13",
      });
      const res = await POST(req as never);
      expect(res.status).toBe(400);
    });

    it("year_monthなし → 400", async () => {
      const req = createRequest("POST", "http://localhost/api/admin/kpi-targets", {
        metric_type: "revenue",
        target_value: 1000000,
      });
      const res = await POST(req as never);
      expect(res.status).toBe(400);
    });
  });

  // ─── DELETE テスト ───────────────────────────────────
  describe("DELETE", () => {
    it("認証なし → 401", async () => {
      mockVerifyAdminAuth.mockResolvedValue(false);
      const req = createRequest("DELETE", "http://localhost/api/admin/kpi-targets", {
        id: "target-id",
      });
      const res = await DELETE(req as never);
      expect(res.status).toBe(401);
    });

    it("正常に削除", async () => {
      const chain = {
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      };
      mockFrom.mockReturnValue(chain);

      const req = createRequest("DELETE", "http://localhost/api/admin/kpi-targets", {
        id: "target-id",
      });
      const res = await DELETE(req as never);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    });

    it("IDなし → 400", async () => {
      const req = createRequest("DELETE", "http://localhost/api/admin/kpi-targets", {});
      const res = await DELETE(req as never);
      expect(res.status).toBe(400);
    });
  });
});

// ─── バリデーション単体テスト ──────────────────────────
describe("KPI目標 バリデーション", () => {
  const validMetricTypes = [
    "revenue",
    "new_patients",
    "reservations",
    "paid_count",
    "repeat_rate",
    "payment_rate",
  ];

  it.each(validMetricTypes)("metric_type '%s' は有効", async (metricType) => {
    const savedData = {
      id: "id",
      metric_type: metricType,
      target_value: 100,
      year_month: "2026-03",
    };
    const chain = {
      upsert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: savedData, error: null }),
        }),
      }),
    };
    mockFrom.mockReturnValue(chain);

    const req = createRequest("POST", "http://localhost/api/admin/kpi-targets", {
      metric_type: metricType,
      target_value: 100,
      year_month: "2026-03",
    });
    const res = await POST(req as never);
    expect(res.status).toBe(200);
  });

  it.each(["2026-01", "2026-06", "2026-12", "2025-01"])("year_month '%s' は有効", async (ym) => {
    const savedData = { id: "id", metric_type: "revenue", target_value: 100, year_month: ym };
    const chain = {
      upsert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: savedData, error: null }),
        }),
      }),
    };
    mockFrom.mockReturnValue(chain);

    const req = createRequest("POST", "http://localhost/api/admin/kpi-targets", {
      metric_type: "revenue",
      target_value: 100,
      year_month: ym,
    });
    const res = await POST(req as never);
    expect(res.status).toBe(200);
  });

  it.each(["2026-00", "2026-13", "202603", "abc", ""])(
    "year_month '%s' は無効 → 400",
    async (ym) => {
      const req = createRequest("POST", "http://localhost/api/admin/kpi-targets", {
        metric_type: "revenue",
        target_value: 100,
        year_month: ym,
      });
      const res = await POST(req as never);
      expect(res.status).toBe(400);
    },
  );
});
