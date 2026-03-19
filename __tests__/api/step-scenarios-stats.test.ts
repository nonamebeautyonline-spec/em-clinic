// ステップ配信統計API（step-scenarios/stats）のテスト
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// --- モック設定 ---
const mockVerifyAdminAuth = vi.fn().mockResolvedValue(true);
vi.mock("@/lib/admin-auth", () => ({ verifyAdminAuth: (...a: unknown[]) => mockVerifyAdminAuth(...a) }));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  resolveTenantIdOrThrow: vi.fn(() => "test-tenant"),
  withTenant: vi.fn((query: unknown) => query),
  strictWithTenant: vi.fn((query: unknown) => query),
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

// テーブルごとに返却データを制御
let scenarioResult: { data: unknown; error: unknown } = { data: null, error: null };
let enrollmentResult: { data: unknown; error: unknown } = { data: [], error: null };
let stepItemResult: { data: unknown; error: unknown } = { data: [], error: null };

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === "step_scenarios") return createTableChain(() => scenarioResult);
      if (table === "step_enrollments") return createTableChain(() => enrollmentResult);
      if (table === "step_items") return createTableChain(() => stepItemResult);
      return createTableChain(() => ({ data: null, error: null }));
    },
  },
}));

// テスト対象のインポート
import { GET } from "@/app/api/admin/line/step-scenarios/stats/route";

function makeReq(url: string) {
  return new NextRequest(new URL(url, "http://localhost"));
}

describe("GET /api/admin/line/step-scenarios/stats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    scenarioResult = { data: null, error: null };
    enrollmentResult = { data: [], error: null };
    stepItemResult = { data: [], error: null };
  });

  // --- 認証NGテスト ---
  it("未認証の場合401を返す", async () => {
    mockVerifyAdminAuth.mockResolvedValueOnce(false);
    const res = await GET(makeReq("http://localhost/api/admin/line/step-scenarios/stats"));
    expect(res.status).toBe(401);
  });

  // --- 全シナリオサマリー（データなし） ---
  it("scenario_id なし＆データなしの場合、空のサマリーを返す", async () => {
    scenarioResult = { data: [], error: null };
    enrollmentResult = { data: [], error: null };

    const res = await GET(makeReq("http://localhost/api/admin/line/step-scenarios/stats"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.scenarios).toEqual([]);
    expect(body.monthly_trend).toBeDefined();
    expect(body.monthly_trend.length).toBe(12);
  });

  // --- 全シナリオサマリー（データあり） ---
  it("scenario_id なし＆データありの場合、シナリオ別の統計を返す", async () => {
    scenarioResult = {
      data: [
        { id: 1, name: "シナリオA", total_enrolled: 10, total_completed: 5, is_enabled: true, created_at: "2026-01-01" },
      ],
      error: null,
    };
    enrollmentResult = {
      data: [
        { scenario_id: 1, status: "completed", enrolled_at: "2026-03-01T00:00:00Z" },
        { scenario_id: 1, status: "active", enrolled_at: "2026-03-02T00:00:00Z" },
        { scenario_id: 1, status: "exited", enrolled_at: "2026-03-03T00:00:00Z" },
      ],
      error: null,
    };

    const res = await GET(makeReq("http://localhost/api/admin/line/step-scenarios/stats"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.scenarios).toHaveLength(1);

    const s = body.scenarios[0];
    expect(s.id).toBe(1);
    expect(s.total_enrolled).toBe(3);
    expect(s.completed).toBe(1);
    expect(s.exited).toBe(1);
    expect(s.active).toBe(1);
    // 完了率 = 1/3 = 33%
    expect(s.completion_rate).toBe(33);
    // 離脱率 = 1/3 = 33%
    expect(s.exit_rate).toBe(33);
  });

  // --- 不正なscenario_id ---
  it("scenario_id が不正な値の場合、400を返す", async () => {
    const res = await GET(makeReq("http://localhost/api/admin/line/step-scenarios/stats?scenario_id=abc"));
    expect(res.status).toBe(400);
  });

  // --- 特定シナリオ詳細統計 ---
  it("scenario_id 指定でファネル・離脱理由・月別推移を返す", async () => {
    scenarioResult = {
      data: { id: 1, name: "シナリオA", total_enrolled: 10, total_completed: 5, is_enabled: true, created_at: "2026-01-01" },
      error: null,
    };
    enrollmentResult = {
      data: [
        { id: 1, status: "completed", current_step_order: 3, enrolled_at: "2026-03-01T00:00:00Z", completed_at: "2026-03-05T00:00:00Z", exited_at: null, exit_reason: null },
        { id: 2, status: "active", current_step_order: 2, enrolled_at: "2026-03-02T00:00:00Z", completed_at: null, exited_at: null, exit_reason: null },
        { id: 3, status: "exited", current_step_order: 1, enrolled_at: "2026-03-03T00:00:00Z", completed_at: null, exited_at: "2026-03-04T00:00:00Z", exit_reason: "unfollow" },
      ],
      error: null,
    };
    stepItemResult = {
      data: [
        { id: 10, sort_order: 1, step_type: "send_text", delay_type: "minutes", delay_value: 5, content: "ようこそ", template_id: null },
        { id: 11, sort_order: 2, step_type: "send_template", delay_type: "days", delay_value: 1, content: null, template_id: 100 },
        { id: 12, sort_order: 3, step_type: "tag_add", delay_type: "days", delay_value: 3, content: null, template_id: null },
      ],
      error: null,
    };

    const res = await GET(makeReq("http://localhost/api/admin/line/step-scenarios/stats?scenario_id=1"));
    expect(res.status).toBe(200);
    const body = await res.json();

    // シナリオ情報
    expect(body.scenario.id).toBe(1);
    expect(body.scenario.name).toBe("シナリオA");

    // サマリー
    expect(body.summary.total_enrolled).toBe(3);
    expect(body.summary.completed).toBe(1);
    expect(body.summary.exited).toBe(1);
    expect(body.summary.active).toBe(1);
    expect(body.summary.completion_rate).toBe(33);
    expect(body.summary.exit_rate).toBe(33);

    // ファネル（各ステップの到達人数）
    expect(body.funnel).toHaveLength(3);
    // ステップ1: completed(通過)+active(order2>=1)+exited(order1>=1) = 3
    expect(body.funnel[0].reached).toBe(3);
    // ステップ2: completed(通過)+active(order2>=2) = 2
    expect(body.funnel[1].reached).toBe(2);
    // ステップ3: completed(通過) = 1
    expect(body.funnel[2].reached).toBe(1);

    // 離脱理由
    expect(body.exit_reasons).toEqual({ unfollow: 1 });

    // 月別推移（12ヶ月分）
    expect(body.monthly_trend).toHaveLength(12);
  });
});
