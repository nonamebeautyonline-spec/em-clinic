// __tests__/api/platform-ai-insights.test.ts
// プラットフォーム管理: AI Insights API テスト
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
import { GET } from "@/app/api/platform/ai-insights/route";
import { verifyPlatformAdmin } from "@/lib/platform-auth";

// --- ヘルパー ---
function createRequest(section?: string) {
  const url = section
    ? `http://localhost:3000/api/platform/ai-insights?section=${section}`
    : "http://localhost:3000/api/platform/ai-insights";
  return new NextRequest(url, { method: "GET" });
}

function setTableChain(table: string, chain: Record<string, unknown>) {
  const g = globalThis as unknown as Record<string, Record<string, Record<string, unknown>>>;
  g.__testTableChains[table] = chain;
}

describe("GET /api/platform/ai-insights", () => {
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

  // --- stats セクション ---
  describe("section=stats（全体統計）", () => {
    it("デフォルトでstatsセクションを返す", async () => {
      // ai_reply_draftsのモック
      setTableChain("ai_reply_drafts", createChain({
        data: [
          { status: "sent", created_at: new Date().toISOString(), tenant_id: "t-1" },
          { status: "sent", created_at: new Date().toISOString(), tenant_id: "t-1" },
          { status: "rejected", created_at: new Date().toISOString(), tenant_id: "t-1" },
          { status: "expired", created_at: new Date().toISOString(), tenant_id: "t-2" },
        ],
        error: null,
      }));

      // ai_reply_examplesのモック（countクエリ）
      setTableChain("ai_reply_examples", createChain({ data: null, error: null, count: 25 }));

      const res = await GET(createRequest());
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.ok).toBe(true);
      expect(body.stats).toHaveProperty("totalDrafts");
      expect(body.stats).toHaveProperty("sentCount");
      expect(body.stats).toHaveProperty("rejectedCount");
      expect(body.stats).toHaveProperty("expiredCount");
      expect(body.stats).toHaveProperty("approvalRate");
      expect(body.stats).toHaveProperty("rejectionRate");
      expect(body.stats).toHaveProperty("exampleCount");
      expect(body).toHaveProperty("monthlyTrend");
    });

    it("統計値が正しく計算される", async () => {
      setTableChain("ai_reply_drafts", createChain({
        data: [
          { status: "sent", created_at: new Date().toISOString(), tenant_id: "t-1" },
          { status: "sent", created_at: new Date().toISOString(), tenant_id: "t-1" },
          { status: "sent", created_at: new Date().toISOString(), tenant_id: "t-1" },
          { status: "rejected", created_at: new Date().toISOString(), tenant_id: "t-1" },
          { status: "expired", created_at: new Date().toISOString(), tenant_id: "t-2" },
        ],
        error: null,
      }));
      setTableChain("ai_reply_examples", createChain({ data: null, error: null, count: 10 }));

      const res = await GET(createRequest("stats"));
      const body = await res.json();

      expect(body.stats.totalDrafts).toBe(5);
      expect(body.stats.sentCount).toBe(3);
      expect(body.stats.rejectedCount).toBe(1);
      expect(body.stats.expiredCount).toBe(1);
      expect(body.stats.approvalRate).toBe(60);  // 3/5 * 100 = 60
      expect(body.stats.rejectionRate).toBe(20);  // 1/5 * 100 = 20
      expect(body.stats.exampleCount).toBe(10);
    });

    it("ドラフトが0件の場合、率は0%になる", async () => {
      setTableChain("ai_reply_drafts", createChain({ data: [], error: null }));
      setTableChain("ai_reply_examples", createChain({ data: null, error: null, count: 0 }));

      const res = await GET(createRequest("stats"));
      const body = await res.json();

      expect(body.stats.totalDrafts).toBe(0);
      expect(body.stats.approvalRate).toBe(0);
      expect(body.stats.rejectionRate).toBe(0);
    });

    it("月別トレンドが6ヶ月分含まれる", async () => {
      setTableChain("ai_reply_drafts", createChain({ data: [], error: null }));
      setTableChain("ai_reply_examples", createChain({ data: null, error: null, count: 0 }));

      const res = await GET(createRequest("stats"));
      const body = await res.json();

      expect(body.monthlyTrend).toHaveLength(6);
      // 各月にmonth, total, sent, rejected, approvalRateがある
      const m = body.monthlyTrend[0];
      expect(m).toHaveProperty("month");
      expect(m).toHaveProperty("total");
      expect(m).toHaveProperty("sent");
      expect(m).toHaveProperty("rejected");
      expect(m).toHaveProperty("approvalRate");
    });
  });

  // --- reject-analysis セクション ---
  describe("section=reject-analysis（却下分析）", () => {
    it("却下理由の分布を返す", async () => {
      setTableChain("ai_reply_drafts", createChain({
        data: [
          { reject_category: "tone", tenant_id: "t-1" },
          { reject_category: "tone", tenant_id: "t-1" },
          { reject_category: "incorrect", tenant_id: "t-2" },
          { reject_category: null, tenant_id: "t-2" },
        ],
        error: null,
      }));
      setTableChain("tenants", createChain({
        data: [
          { id: "t-1", name: "クリニックA" },
          { id: "t-2", name: "クリニックB" },
        ],
        error: null,
      }));

      const res = await GET(createRequest("reject-analysis"));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.ok).toBe(true);
      expect(body.categories).toBeInstanceOf(Array);
      expect(body.tenantRejects).toBeInstanceOf(Array);
    });

    it("カテゴリが件数降順でソートされる", async () => {
      setTableChain("ai_reply_drafts", createChain({
        data: [
          { reject_category: "tone", tenant_id: "t-1" },
          { reject_category: "tone", tenant_id: "t-1" },
          { reject_category: "tone", tenant_id: "t-1" },
          { reject_category: "incorrect", tenant_id: "t-1" },
        ],
        error: null,
      }));
      setTableChain("tenants", createChain({ data: [], error: null }));

      const res = await GET(createRequest("reject-analysis"));
      const body = await res.json();

      expect(body.categories[0].category).toBe("tone");
      expect(body.categories[0].count).toBe(3);
      expect(body.categories[1].category).toBe("incorrect");
      expect(body.categories[1].count).toBe(1);
    });

    it("reject_categoryがnullの場合は「未分類」に分類される", async () => {
      setTableChain("ai_reply_drafts", createChain({
        data: [
          { reject_category: null, tenant_id: "t-1" },
          { reject_category: null, tenant_id: "t-1" },
        ],
        error: null,
      }));
      setTableChain("tenants", createChain({ data: [], error: null }));

      const res = await GET(createRequest("reject-analysis"));
      const body = await res.json();

      expect(body.categories[0].category).toBe("未分類");
      expect(body.categories[0].count).toBe(2);
    });

    it("却下データが0件の場合、空配列を返す", async () => {
      setTableChain("ai_reply_drafts", createChain({ data: [], error: null }));
      setTableChain("tenants", createChain({ data: [], error: null }));

      const res = await GET(createRequest("reject-analysis"));
      const body = await res.json();

      expect(body.categories).toEqual([]);
      expect(body.tenantRejects).toEqual([]);
    });
  });

  // --- quality-ranking セクション ---
  describe("section=quality-ranking（学習例ランキング）", () => {
    it("利用回数順で学習例を返す", async () => {
      setTableChain("ai_reply_examples", createChain({
        data: [
          { id: 1, question: "Q1", answer: "A1", source: "staff_edit", used_count: 10, tenant_id: "t-1", created_at: "2026-03-01T00:00:00Z" },
          { id: 2, question: "Q2", answer: "A2", source: "manual_reply", used_count: 5, tenant_id: "t-2", created_at: "2026-03-02T00:00:00Z" },
        ],
        error: null,
      }));
      setTableChain("tenants", createChain({
        data: [
          { id: "t-1", name: "クリニックA" },
          { id: "t-2", name: "クリニックB" },
        ],
        error: null,
      }));

      const res = await GET(createRequest("quality-ranking"));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.ok).toBe(true);
      expect(body.examples).toHaveLength(2);
      expect(body.examples[0]).toHaveProperty("id");
      expect(body.examples[0]).toHaveProperty("question");
      expect(body.examples[0]).toHaveProperty("answer");
      expect(body.examples[0]).toHaveProperty("source");
      expect(body.examples[0]).toHaveProperty("usedCount");
      expect(body.examples[0]).toHaveProperty("tenantName");
    });

    it("tenant_idがnullの学習例は「グローバル」と表示される", async () => {
      setTableChain("ai_reply_examples", createChain({
        data: [
          { id: 1, question: "Q", answer: "A", source: "manual_reply", used_count: 1, tenant_id: null, created_at: "2026-03-01T00:00:00Z" },
        ],
        error: null,
      }));
      setTableChain("tenants", createChain({ data: [], error: null }));

      const res = await GET(createRequest("quality-ranking"));
      const body = await res.json();

      expect(body.examples[0].tenantName).toBe("グローバル");
    });

    it("学習例が0件の場合、空配列を返す", async () => {
      setTableChain("ai_reply_examples", createChain({ data: [], error: null }));
      setTableChain("tenants", createChain({ data: [], error: null }));

      const res = await GET(createRequest("quality-ranking"));
      const body = await res.json();

      expect(body.examples).toEqual([]);
    });
  });

  // --- tenant-comparison セクション ---
  describe("section=tenant-comparison（テナント比較）", () => {
    it("テナント別のAI返信統計を返す", async () => {
      setTableChain("tenants", createChain({
        data: [
          { id: "t-1", name: "クリニックA", slug: "a" },
          { id: "t-2", name: "クリニックB", slug: "b" },
        ],
        error: null,
      }));
      setTableChain("ai_reply_drafts", createChain({
        data: [
          { status: "sent" },
          { status: "sent" },
          { status: "rejected" },
        ],
        error: null,
      }));
      setTableChain("ai_reply_examples", createChain({ data: null, error: null, count: 5 }));

      const res = await GET(createRequest("tenant-comparison"));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.ok).toBe(true);
      expect(body.tenants).toHaveLength(2);

      const t = body.tenants[0];
      expect(t).toHaveProperty("tenantId");
      expect(t).toHaveProperty("tenantName");
      expect(t).toHaveProperty("totalDrafts");
      expect(t).toHaveProperty("sentCount");
      expect(t).toHaveProperty("rejectedCount");
      expect(t).toHaveProperty("approvalRate");
      expect(t).toHaveProperty("exampleCount");
    });

    it("テナントが0件の場合、空配列を返す", async () => {
      setTableChain("tenants", createChain({ data: [], error: null }));

      const res = await GET(createRequest("tenant-comparison"));
      const body = await res.json();

      expect(body.tenants).toEqual([]);
    });
  });

  // --- 不正なセクション ---
  describe("不正なsectionパラメータ", () => {
    it("不正なsection値で400を返す", async () => {
      const res = await GET(createRequest("invalid-section"));
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.message).toBe("不正なsectionパラメータ");
    });
  });

  // --- エラーハンドリング ---
  describe("エラーハンドリング", () => {
    it("DBエラー時は500を返す", async () => {
      const brokenChain = createChain({ data: null, error: null });
      brokenChain.then = vi.fn(() => { throw new Error("DB connection failed"); });
      setTableChain("ai_reply_drafts", brokenChain);

      const res = await GET(createRequest("stats"));
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.message).toBe("AI Insightsデータの取得に失敗しました");
    });
  });
});
