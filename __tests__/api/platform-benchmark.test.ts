// __tests__/api/platform-benchmark.test.ts
// プラットフォーム管理: クリニック間ベンチマークAPI テスト
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// --- モックチェーン ---
function createChain(defaultResolve: Record<string, unknown> = { data: null, error: null }) {
  const chain: Record<string, unknown> = {};
  [
    "insert", "update", "delete", "select", "eq", "neq", "gt", "gte",
    "lt", "lte", "in", "is", "not", "order", "limit", "range", "single",
    "maybeSingle", "upsert", "ilike", "or", "count", "csv", "like",
  ].forEach((m) => {
    (chain as Record<string, ReturnType<typeof vi.fn>>)[m] = vi.fn().mockReturnValue(chain);
  });
  chain.then = vi.fn((resolve: (v: unknown) => void) => resolve(defaultResolve));
  return chain;
}

vi.mock("@/lib/supabase", () => {
  return {
    supabaseAdmin: {
      from: vi.fn((...args: unknown[]) => {
        const g = globalThis as unknown as Record<string, Record<string, Record<string, unknown>>>;
        const chains = g.__testTableChains || {};
        const table = args[0] as string;
        if (!chains[table]) {
          const c: Record<string, unknown> = {};
          [
            "insert", "update", "delete", "select", "eq", "neq", "gt", "gte",
            "lt", "lte", "in", "is", "not", "order", "limit", "range", "single",
            "maybeSingle", "upsert", "ilike", "or", "count", "csv", "like",
          ].forEach((m) => {
            (c as Record<string, ReturnType<typeof vi.fn>>)[m] = vi.fn().mockReturnValue(c);
          });
          c.then = vi.fn((resolve: (v: unknown) => void) => resolve({ data: null, error: null }));
          chains[table] = c;
        }
        return chains[table];
      }),
      rpc: vi.fn().mockResolvedValue({
        data: {
          kpi: {
            reservationRateAfterIntake: 65,
            consultationCompletionRate: 80,
            paymentRateAfterConsultation: 90,
          },
          shipping: { total: 100, reorder: 30 },
        },
        error: null,
      }),
    },
  };
});

// プラットフォーム管理者認証モック
vi.mock("@/lib/platform-auth", () => ({
  verifyPlatformAdmin: vi.fn().mockResolvedValue({
    userId: "platform-admin-1",
    email: "admin@l-ope.jp",
    name: "プラットフォーム管理者",
    tenantId: null,
    platformRole: "platform_admin",
  }),
}));

// --- ルートインポート ---
import { GET } from "@/app/api/platform/benchmark/route";
import { verifyPlatformAdmin } from "@/lib/platform-auth";

// --- ヘルパー ---
function createRequest() {
  return new NextRequest("http://localhost:3000/api/platform/benchmark", {
    method: "GET",
  });
}

function setTableChain(table: string, chain: Record<string, unknown>) {
  const g = globalThis as unknown as Record<string, Record<string, Record<string, unknown>>>;
  g.__testTableChains[table] = chain;
}

// --- supabaseAdmin参照 ---
import { supabaseAdmin } from "@/lib/supabase";

describe("GET /api/platform/benchmark", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as unknown as Record<string, Record<string, unknown>>).__testTableChains = {};

    // clearAllMocksで消えるのでデフォルトモックを再設定
    vi.mocked(verifyPlatformAdmin).mockResolvedValue({
      userId: "platform-admin-1",
      email: "admin@l-ope.jp",
      name: "プラットフォーム管理者",
      tenantId: null,
      platformRole: "platform_admin",
    });

    vi.mocked(supabaseAdmin.rpc).mockResolvedValue({
      data: {
        kpi: {
          reservationRateAfterIntake: 65,
          consultationCompletionRate: 80,
          paymentRateAfterConsultation: 90,
        },
        shipping: { total: 100, reorder: 30 },
      },
      error: null,
    } as never);
  });

  // --- 認証テスト ---
  describe("認証", () => {
    it("プラットフォーム管理者でない場合は403を返す", async () => {
      vi.mocked(verifyPlatformAdmin).mockResolvedValue(null);

      const res = await GET(createRequest());
      const body = await res.json();

      expect(res.status).toBe(403);
      expect(body.ok).toBe(false);
      expect(body.message).toBe("権限がありません");
    });
  });

  // --- テナントなしの場合 ---
  describe("テナントなし", () => {
    it("アクティブテナントが0件の場合、空配列を返す", async () => {
      setTableChain("tenants", createChain({ data: [], error: null }));

      const res = await GET(createRequest());
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.ok).toBe(true);
      expect(body.tenants).toEqual([]);
      expect(body.benchmarks).toBeNull();
    });

    it("テナントデータがnullの場合、空配列を返す", async () => {
      setTableChain("tenants", createChain({ data: null, error: null }));

      const res = await GET(createRequest());
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.ok).toBe(true);
      expect(body.tenants).toEqual([]);
      expect(body.benchmarks).toBeNull();
    });
  });

  // --- 正常系 ---
  describe("正常系", () => {
    const mockTenants = [
      { id: "t-1", name: "クリニックA", slug: "clinic-a" },
      { id: "t-2", name: "クリニックB", slug: "clinic-b" },
      { id: "t-3", name: "クリニックC", slug: "clinic-c" },
    ];

    beforeEach(() => {
      setTableChain("tenants", createChain({ data: mockTenants, error: null }));

      // AI返信ドラフト
      setTableChain("ai_reply_drafts", createChain({
        data: [
          { status: "sent" },
          { status: "sent" },
          { status: "rejected" },
        ],
        error: null,
      }));

      // LINE日次統計
      setTableChain("line_daily_stats", createChain({
        data: [{ followers: 500, blocks: 25 }],
        error: null,
      }));

      // 注文
      setTableChain("orders", createChain({
        data: [
          { amount: 15000, patient_id: "p-1" },
          { amount: 30000, patient_id: "p-2" },
          { amount: 20000, patient_id: "p-1" },
        ],
        error: null,
      }));
    });

    it("テナント別KPIデータを返す", async () => {
      const res = await GET(createRequest());
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.ok).toBe(true);
      expect(body.tenants).toHaveLength(3);
    });

    it("各テナントに必要なKPIフィールドが含まれる", async () => {
      const res = await GET(createRequest());
      const body = await res.json();

      const tenant = body.tenants[0];
      // テナント基本情報
      expect(tenant).toHaveProperty("id");
      expect(tenant).toHaveProperty("name");
      expect(tenant).toHaveProperty("slug");

      // ファネル
      expect(tenant).toHaveProperty("funnel");
      expect(tenant.funnel).toHaveProperty("intakeToReservation");
      expect(tenant.funnel).toHaveProperty("reservationToConsultation");
      expect(tenant.funnel).toHaveProperty("consultationToPayment");

      // AI返信
      expect(tenant).toHaveProperty("aiReply");
      expect(tenant.aiReply).toHaveProperty("approvalRate");
      expect(tenant.aiReply).toHaveProperty("totalDrafts");

      // LINE
      expect(tenant).toHaveProperty("line");
      expect(tenant.line).toHaveProperty("blockRate");
      expect(tenant.line).toHaveProperty("followers");

      // 売上
      expect(tenant).toHaveProperty("revenue");
      expect(tenant.revenue).toHaveProperty("monthlyRevenue");
      expect(tenant.revenue).toHaveProperty("avgOrderAmount");
      expect(tenant.revenue).toHaveProperty("reorderRate");
      expect(tenant.revenue).toHaveProperty("orderCount");
    });

    it("ベンチマーク値が正しい構造を持つ", async () => {
      const res = await GET(createRequest());
      const body = await res.json();

      expect(body.benchmarks).not.toBeNull();
      const bm = body.benchmarks;

      // ファネルベンチマーク
      expect(bm.funnel.intakeToReservation).toHaveProperty("avg");
      expect(bm.funnel.intakeToReservation).toHaveProperty("top20");
      expect(bm.funnel.intakeToReservation).toHaveProperty("bottom20");

      // AI返信ベンチマーク
      expect(bm.aiReply.approvalRate).toHaveProperty("avg");

      // LINEベンチマーク
      expect(bm.line.blockRate).toHaveProperty("avg");

      // 売上ベンチマーク
      expect(bm.revenue.monthlyRevenue).toHaveProperty("avg");
      expect(bm.revenue.avgOrderAmount).toHaveProperty("avg");
      expect(bm.revenue.reorderRate).toHaveProperty("avg");
    });

    it("ファネル転換率はRPC結果から取得される", async () => {
      const res = await GET(createRequest());
      const body = await res.json();

      // RPCモックは全テナント同じ値を返すので、全テナント同じ値
      const tenant = body.tenants[0];
      expect(tenant.funnel.intakeToReservation).toBe(65);
      expect(tenant.funnel.reservationToConsultation).toBe(80);
      expect(tenant.funnel.consultationToPayment).toBe(90);
    });

    it("AI返信採用率が正しく計算される", async () => {
      const res = await GET(createRequest());
      const body = await res.json();

      // モック: sent=2, rejected=1, total=3 → 採用率 = 67%
      const tenant = body.tenants[0];
      expect(tenant.aiReply.approvalRate).toBe(67);
      expect(tenant.aiReply.totalDrafts).toBe(3);
    });

    it("ブロック率が正しく計算される", async () => {
      const res = await GET(createRequest());
      const body = await res.json();

      // モック: followers=500, blocks=25 → blockRate = 5.0%
      const tenant = body.tenants[0];
      expect(tenant.line.blockRate).toBe(5);
      expect(tenant.line.followers).toBe(500);
    });

    it("売上統計が正しく計算される", async () => {
      const res = await GET(createRequest());
      const body = await res.json();

      // モック: amount=[15000, 30000, 20000] → total=65000, count=3, avg=21667
      const tenant = body.tenants[0];
      expect(tenant.revenue.monthlyRevenue).toBe(65000);
      expect(tenant.revenue.orderCount).toBe(3);
      expect(tenant.revenue.avgOrderAmount).toBe(21667);
    });

    it("再処方率はRPC結果から計算される", async () => {
      const res = await GET(createRequest());
      const body = await res.json();

      // RPCモック: shipping.total=100, shipping.reorder=30 → reorderRate=30%
      const tenant = body.tenants[0];
      expect(tenant.revenue.reorderRate).toBe(30);
    });
  });

  // --- ベンチマーク計算テスト ---
  describe("ベンチマーク計算", () => {
    it("全テナント同一値の場合、avg=top20=bottom20になる", async () => {
      const mockTenants = [
        { id: "t-1", name: "A", slug: "a" },
        { id: "t-2", name: "B", slug: "b" },
      ];
      setTableChain("tenants", createChain({ data: mockTenants, error: null }));
      setTableChain("ai_reply_drafts", createChain({ data: [], error: null }));
      setTableChain("line_daily_stats", createChain({ data: [{ followers: 100, blocks: 10 }], error: null }));
      setTableChain("orders", createChain({ data: [], error: null }));

      const res = await GET(createRequest());
      const body = await res.json();

      // 同じモックデータなので全テナントの値は同一
      const bm = body.benchmarks;
      expect(bm.line.blockRate.avg).toBe(bm.line.blockRate.top20);
      expect(bm.line.blockRate.avg).toBe(bm.line.blockRate.bottom20);
    });
  });

  // --- エラーハンドリング ---
  describe("エラーハンドリング", () => {
    it("DBエラー時は500を返す", async () => {
      // tenantsクエリが例外をスローするようにセット
      const brokenChain = createChain({ data: null, error: null });
      brokenChain.then = vi.fn(() => { throw new Error("DB connection failed"); });
      setTableChain("tenants", brokenChain);

      const res = await GET(createRequest());
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.message).toBe("ベンチマークデータの取得に失敗しました");
    });
  });
});
