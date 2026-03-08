// AI返信統計API（ai-reply-stats）のテスト
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// --- モック設定 ---
const mockVerifyAdminAuth = vi.fn().mockResolvedValue(true);
vi.mock("@/lib/admin-auth", () => ({ verifyAdminAuth: (...a: unknown[]) => mockVerifyAdminAuth(...a) }));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  withTenant: vi.fn((query: unknown) => query),
}));

// Supabaseチェーンモック
function createTableChain(getResult: () => { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};
  ["select", "eq", "neq", "gt", "gte", "lt", "lte", "in", "is", "not",
   "order", "limit", "range", "single", "maybeSingle", "or", "ilike",
   "insert", "update", "delete", "upsert", "count", "csv"].forEach(m => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.then = vi.fn((resolve: (v: unknown) => void) => resolve(getResult()));
  return chain;
}

let draftsResult: { data: unknown; error: unknown } = { data: [], error: null };

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === "ai_reply_drafts") return createTableChain(() => draftsResult);
      return createTableChain(() => ({ data: null, error: null }));
    },
  },
}));

// テスト対象のインポート
import { GET } from "@/app/api/admin/line/ai-reply-stats/route";

function makeReq(url: string) {
  return new NextRequest(new URL(url, "http://localhost"));
}

describe("GET /api/admin/line/ai-reply-stats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    draftsResult = { data: [], error: null };
  });

  // --- 認証NGテスト ---
  it("未認証の場合401を返す", async () => {
    mockVerifyAdminAuth.mockResolvedValueOnce(false);
    const res = await GET(makeReq("http://localhost/api/admin/line/ai-reply-stats"));
    expect(res.status).toBe(401);
  });

  // --- データなしの場合 ---
  it("ドラフトが0件の場合、KPIが全て0で返る", async () => {
    draftsResult = { data: [], error: null };
    const res = await GET(makeReq("http://localhost/api/admin/line/ai-reply-stats"));
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.kpi.total).toBe(0);
    expect(body.kpi.approvalRate).toBe(0);
    expect(body.kpi.rejectionRate).toBe(0);
    expect(body.kpi.avgConfidence).toBe(0);
    expect(body.kpi.totalTokens).toBe(0);
    expect(body.kpi.avgResponseTimeSec).toBe(0);
    expect(body.categoryStats).toEqual([]);
    expect(body.recentDrafts).toEqual([]);
    expect(body.period).toBe(30); // デフォルト期間
  });

  // --- データありの場合のKPI算出 ---
  it("ドラフトデータからKPI・カテゴリ・直近一覧を正しく算出する", async () => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    draftsResult = {
      data: [
        {
          id: 1, status: "sent", ai_category: "operational", confidence: 0.9,
          input_tokens: 500, output_tokens: 100,
          created_at: `${todayStr}T10:00:00Z`, sent_at: `${todayStr}T10:00:05Z`,
          original_message: "予約したい", draft_reply: "ご予約を承ります", model_used: "gpt-4o-mini",
        },
        {
          id: 2, status: "rejected", ai_category: "medical", confidence: 0.3,
          input_tokens: 600, output_tokens: 150,
          created_at: `${todayStr}T11:00:00Z`, sent_at: null,
          original_message: "薬の副作用について", draft_reply: "医師にご相談ください", model_used: "gpt-4o-mini",
        },
        {
          id: 3, status: "sent", ai_category: "operational", confidence: 0.85,
          input_tokens: 400, output_tokens: 80,
          created_at: `${todayStr}T12:00:00Z`, sent_at: `${todayStr}T12:00:10Z`,
          original_message: "営業時間は？", draft_reply: "10時〜19時です", model_used: "gpt-4o-mini",
        },
      ],
      error: null,
    };

    const res = await GET(makeReq("http://localhost/api/admin/line/ai-reply-stats?period=30"));
    expect(res.status).toBe(200);
    const body = await res.json();

    // KPI検証
    expect(body.kpi.total).toBe(3);
    // 承認率: 2/3 = 66.7%
    expect(body.kpi.approvalRate).toBeCloseTo(66.7, 1);
    // 拒否率: 1/3 = 33.3%
    expect(body.kpi.rejectionRate).toBeCloseTo(33.3, 1);
    // 平均信頼度: (0.9 + 0.3 + 0.85) / 3 = 0.683
    expect(body.kpi.avgConfidence).toBeCloseTo(0.683, 2);
    // トークン合計: (500+600+400) + (100+150+80) = 1830
    expect(body.kpi.totalTokens).toBe(1830);
    expect(body.kpi.totalInputTokens).toBe(1500);
    expect(body.kpi.totalOutputTokens).toBe(330);
    // 平均応答時間: (5+10)/2 = 7.5 → Math.round = 8秒
    expect(body.kpi.avgResponseTimeSec).toBe(8);

    // カテゴリ別件数（件数降順）
    expect(body.categoryStats[0]).toEqual({ category: "operational", count: 2 });
    expect(body.categoryStats[1]).toEqual({ category: "medical", count: 1 });

    // 直近ドラフト一覧
    expect(body.recentDrafts).toHaveLength(3);
    expect(body.recentDrafts[0].id).toBe(1);
  });

  // --- DBエラーの場合 ---
  it("DBエラー時は500を返す", async () => {
    draftsResult = { data: null, error: { message: "DB error" } };
    const res = await GET(makeReq("http://localhost/api/admin/line/ai-reply-stats"));
    expect(res.status).toBe(500);
  });

  // --- period パラメータのバリデーション ---
  it("不正なperiodはデフォルト30に補正される", async () => {
    draftsResult = { data: [], error: null };
    const res = await GET(makeReq("http://localhost/api/admin/line/ai-reply-stats?period=999"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.period).toBe(30);
  });
});
