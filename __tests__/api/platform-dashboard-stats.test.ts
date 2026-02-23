// __tests__/api/platform-dashboard-stats.test.ts
// プラットフォーム管理ダッシュボード統計API (app/api/platform/dashboard-stats/route.ts) の統合テスト
// プラットフォーム管理者認証、統計データ取得、テナントランキング、月別推移をテスト
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// --- モックチェーン ---
function createChain(defaultResolve: any = { data: null, error: null, count: 0 }) {
  const chain: any = {};
  [
    "insert", "update", "delete", "select", "eq", "neq", "gt", "gte",
    "lt", "lte", "in", "is", "not", "order", "limit", "range", "single",
    "maybeSingle", "upsert", "ilike", "or", "count", "csv", "like",
  ].forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.then = vi.fn((resolve: any) => resolve(defaultResolve));
  return chain;
}

vi.mock("@/lib/supabase", () => {
  return {
    supabaseAdmin: {
      from: vi.fn((...args: any[]) => {
        const chains = (globalThis as any).__testTableChains || {};
        const table = args[0];
        if (!chains[table]) {
          const c: any = {};
          [
            "insert", "update", "delete", "select", "eq", "neq", "gt", "gte",
            "lt", "lte", "in", "is", "not", "order", "limit", "range", "single",
            "maybeSingle", "upsert", "ilike", "or", "count", "csv", "like",
          ].forEach((m) => {
            c[m] = vi.fn().mockReturnValue(c);
          });
          c.then = vi.fn((resolve: any) => resolve({ data: null, error: null, count: 0 }));
          chains[table] = c;
        }
        return chains[table];
      }),
    },
  };
});

// プラットフォーム管理者認証モック
vi.mock("@/lib/platform-auth", () => ({
  verifyPlatformAdmin: vi.fn().mockResolvedValue({
    userId: "platform-admin-1",
    email: "admin@lope.jp",
    name: "プラットフォーム管理者",
    tenantId: null,
    platformRole: "platform_admin",
  }),
}));

// --- ルートインポート ---
import { GET } from "@/app/api/platform/dashboard-stats/route";
import { verifyPlatformAdmin } from "@/lib/platform-auth";

// --- ヘルパー ---
function createRequest() {
  return new NextRequest("http://localhost:3000/api/platform/dashboard-stats", {
    method: "GET",
  });
}

function setTableChain(table: string, chain: any) {
  (globalThis as any).__testTableChains[table] = chain;
}

describe("GET /api/platform/dashboard-stats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as any).__testTableChains = {};
  });

  // --- 認証テスト ---
  describe("認証", () => {
    it("プラットフォーム管理者でない場合は403を返す", async () => {
      vi.mocked(verifyPlatformAdmin).mockResolvedValue(null);

      const res = await GET(createRequest());
      const body = await res.json();

      expect(res.status).toBe(403);
      expect(body.ok).toBe(false);
      expect(body.error).toBe("権限がありません");
    });

    it("プラットフォーム管理者の場合は200を返す", async () => {
      vi.mocked(verifyPlatformAdmin).mockResolvedValue({
        userId: "admin-1",
        email: "admin@lope.jp",
        name: "管理者",
        tenantId: null,
        platformRole: "platform_admin",
      });

      // 全テーブルにデフォルトチェーンをセット
      setTableChain("tenants", createChain({ data: [], error: null, count: 0 }));
      setTableChain("patients", createChain({ data: null, error: null, count: 0 }));
      setTableChain("orders", createChain({ data: [], error: null }));
      setTableChain("reservations", createChain({ data: null, error: null, count: 0 }));

      const res = await GET(createRequest());
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.ok).toBe(true);
      expect(body).toHaveProperty("stats");
    });
  });

  // --- レスポンス構造テスト ---
  describe("レスポンス構造", () => {
    beforeEach(() => {
      vi.mocked(verifyPlatformAdmin).mockResolvedValue({
        userId: "admin-1",
        email: "admin@lope.jp",
        name: "管理者",
        tenantId: null,
        platformRole: "platform_admin",
      });
    });

    it("統計データに必要なフィールドが含まれる", async () => {
      setTableChain("tenants", createChain({ data: [], error: null, count: 5 }));
      setTableChain("patients", createChain({ data: null, error: null, count: 100 }));
      setTableChain("orders", createChain({ data: [], error: null }));
      setTableChain("reservations", createChain({ data: null, error: null, count: 50 }));

      const res = await GET(createRequest());
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.stats).toHaveProperty("totalTenants");
      expect(body.stats).toHaveProperty("totalPatients");
      expect(body.stats).toHaveProperty("monthlyRevenue");
      expect(body.stats).toHaveProperty("activeTenants");
      expect(body.stats).toHaveProperty("totalReservations");
      expect(body.stats).toHaveProperty("totalLineFriends");
      expect(body.stats).toHaveProperty("tenantRanking");
      expect(body.stats).toHaveProperty("monthlyTrend");
    });

    it("売上合計が正しく集計される", async () => {
      setTableChain("tenants", createChain({ data: [], error: null, count: 2 }));
      setTableChain("patients", createChain({ data: null, error: null, count: 10 }));
      // orders の data に売上データ
      setTableChain("orders", createChain({
        data: [
          { amount: 15000, tenant_id: "t-1" },
          { amount: 30000, tenant_id: "t-1" },
          { amount: 20000, tenant_id: "t-2" },
        ],
        error: null,
      }));
      setTableChain("reservations", createChain({ data: null, error: null, count: 5 }));

      const res = await GET(createRequest());
      const body = await res.json();

      expect(res.status).toBe(200);
      // revenueResult.data からの合計 = 15000 + 30000 + 20000 = 65000
      expect(body.stats.monthlyRevenue).toBe(65000);
    });

    it("アクティブテナント数はユニークなtenant_id数", async () => {
      setTableChain("tenants", createChain({ data: [], error: null, count: 3 }));
      setTableChain("patients", createChain({ data: null, error: null, count: 10 }));
      // ordersチェーンをカスタマイズ
      // activeTenantsResult 用には tenant_id を返す必要がある
      // ただしチェーンは共有なので、data に tenant_id 入りデータを設定
      setTableChain("orders", createChain({
        data: [
          { amount: 10000, tenant_id: "t-1" },
          { amount: 20000, tenant_id: "t-1" },
          { amount: 15000, tenant_id: "t-2" },
        ],
        error: null,
      }));
      setTableChain("reservations", createChain({ data: null, error: null, count: 0 }));

      const res = await GET(createRequest());
      const body = await res.json();

      expect(res.status).toBe(200);
      // ユニーク tenant_id: t-1, t-2 = 2
      expect(body.stats.activeTenants).toBe(2);
    });
  });

  // --- テナントランキングテスト ---
  describe("テナントランキング", () => {
    it("テナントが空の場合は空配列を返す", async () => {
      vi.mocked(verifyPlatformAdmin).mockResolvedValue({
        userId: "admin-1",
        email: "admin@lope.jp",
        name: "管理者",
        tenantId: null,
        platformRole: "platform_admin",
      });

      // tenantsが空
      setTableChain("tenants", createChain({ data: [], error: null, count: 0 }));
      setTableChain("patients", createChain({ data: null, error: null, count: 0 }));
      setTableChain("orders", createChain({ data: [], error: null }));
      setTableChain("reservations", createChain({ data: null, error: null, count: 0 }));

      const res = await GET(createRequest());
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.stats.tenantRanking).toEqual([]);
    });
  });

  // --- エラーハンドリング ---
  describe("エラーハンドリング", () => {
    it("DB問い合わせでエラーが発生した場合は500を返す", async () => {
      vi.mocked(verifyPlatformAdmin).mockResolvedValue({
        userId: "admin-1",
        email: "admin@lope.jp",
        name: "管理者",
        tenantId: null,
        platformRole: "platform_admin",
      });

      // テナントクエリで例外を投げる
      const tenantsChain = createChain({ data: null, error: null, count: 0 });
      tenantsChain.then = vi.fn(() => { throw new Error("DB接続エラー"); });
      setTableChain("tenants", tenantsChain);

      const res = await GET(createRequest());
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.ok).toBe(false);
      expect(body.error).toBe("統計データの取得に失敗しました");
    });
  });
});
