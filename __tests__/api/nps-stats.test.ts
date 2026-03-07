// __tests__/api/nps-stats.test.ts — NPS推移トレンド比較API テスト
import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

// Supabaseチェーンモック
type SupabaseChain = Record<string, Mock> & { then: Mock };

function createChain(defaultResolve = { data: null, error: null }): SupabaseChain {
  const chain = {} as SupabaseChain;
  [
    "insert", "update", "delete", "select", "eq", "neq", "gt", "gte", "lt", "lte",
    "in", "not", "order", "limit", "range", "single", "maybeSingle", "upsert",
    "ilike", "or", "count", "csv", "head", "is",
  ].forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.then = vi.fn((resolve: (val: unknown) => unknown) => resolve(defaultResolve));
  return chain;
}

let tableChains: Record<string, SupabaseChain> = {};
function getOrCreateChain(table: string) {
  if (!tableChains[table]) tableChains[table] = createChain();
  return tableChains[table];
}

const mockVerifyAdminAuth = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => getOrCreateChain(table)),
  },
}));

vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: (...args: unknown[]) => mockVerifyAdminAuth(...args),
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  withTenant: vi.fn((query: unknown) => query),
  tenantPayload: vi.fn((tid: unknown) => (tid ? { tenant_id: tid } : {})),
}));

function createReq(method: string, url: string) {
  const req = new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
  }) as Request & { nextUrl: URL };
  req.nextUrl = new URL(url);
  return req;
}

import { GET } from "@/app/api/admin/line/nps/stats/route";

beforeEach(() => {
  vi.clearAllMocks();
  tableChains = {};
  mockVerifyAdminAuth.mockResolvedValue(true);
});

describe("GET /api/admin/line/nps/stats", () => {
  it("認証失敗で401を返す", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const req = createReq("GET", "http://localhost/api/admin/line/nps/stats");
    const res = await GET(req as never);
    expect(res.status).toBe(401);
  });

  it("回答データなしでも正常にレスポンスを返す", async () => {
    tableChains["nps_surveys"] = createChain({ data: [], error: null });
    tableChains["nps_responses"] = createChain({ data: [], error: null });

    const req = createReq("GET", "http://localhost/api/admin/line/nps/stats");
    const res = await GET(req as never);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.summary).toEqual({
      total: 0,
      nps: null,
      promoters: 0,
      passives: 0,
      detractors: 0,
    });
    expect(json.overall).toEqual([]);
    expect(json.bySurvey).toEqual([]);
  });

  it("月別NPS推移を正しく算出する", async () => {
    tableChains["nps_surveys"] = createChain({
      data: [
        { id: 1, title: "調査A" },
        { id: 2, title: "調査B" },
      ],
      error: null,
    });

    // 推奨者3名(9,10,9) / 中立1名(8) / 批判者1名(5)
    // NPS = ((3-1)/5)*100 = 40
    tableChains["nps_responses"] = createChain({
      data: [
        { survey_id: 1, score: 9, created_at: "2026-01-15T10:00:00Z" },
        { survey_id: 1, score: 10, created_at: "2026-01-20T10:00:00Z" },
        { survey_id: 2, score: 9, created_at: "2026-01-25T10:00:00Z" },
        { survey_id: 1, score: 8, created_at: "2026-02-10T10:00:00Z" },
        { survey_id: 2, score: 5, created_at: "2026-02-15T10:00:00Z" },
      ],
      error: null,
    });

    const req = createReq("GET", "http://localhost/api/admin/line/nps/stats");
    const res = await GET(req as never);
    expect(res.status).toBe(200);

    const json = await res.json();

    // 全体サマリー
    expect(json.summary.total).toBe(5);
    expect(json.summary.promoters).toBe(3);
    expect(json.summary.detractors).toBe(1);
    expect(json.summary.nps).toBe(40); // ((3-1)/5)*100 = 40

    // 月別推移
    expect(json.overall).toHaveLength(2);
    expect(json.overall[0].month).toBe("2026-01");
    expect(json.overall[0].promoters).toBe(3);
    expect(json.overall[0].nps).toBe(100); // ((3-0)/3)*100 = 100
    expect(json.overall[1].month).toBe("2026-02");
    expect(json.overall[1].nps).toBe(-50); // ((0-1)/2)*100 = -50

    // 調査別
    expect(json.bySurvey).toHaveLength(2);
    const surveyA = json.bySurvey.find((s: { survey_id: number }) => s.survey_id === 1);
    const surveyB = json.bySurvey.find((s: { survey_id: number }) => s.survey_id === 2);
    expect(surveyA.survey_title).toBe("調査A");
    expect(surveyB.survey_title).toBe("調査B");

    // 調査A: 1月(9,10)=NPS100, 2月(8)=NPS0
    expect(surveyA.monthly[0].nps).toBe(100);
    expect(surveyA.monthly[1].nps).toBe(0);

    // 調査B: 1月(9)=NPS100, 2月(5)=NPS-100
    expect(surveyB.monthly[0].nps).toBe(100);
    expect(surveyB.monthly[1].nps).toBe(-100);
  });

  it("survey_idsパラメータでフィルタリングされる", async () => {
    tableChains["nps_surveys"] = createChain({ data: [{ id: 1, title: "調査A" }], error: null });
    tableChains["nps_responses"] = createChain({ data: [], error: null });

    const req = createReq("GET", "http://localhost/api/admin/line/nps/stats?survey_ids=1,2");
    const res = await GET(req as never);
    expect(res.status).toBe(200);

    // in() が survey_ids [1,2] で呼ばれたことを確認
    const chain = tableChains["nps_responses"];
    expect(chain.in).toHaveBeenCalledWith("survey_id", [1, 2]);
  });

  it("期間フィルタ（from/to）が適用される", async () => {
    tableChains["nps_surveys"] = createChain({ data: [], error: null });
    tableChains["nps_responses"] = createChain({ data: [], error: null });

    const req = createReq("GET", "http://localhost/api/admin/line/nps/stats?from=2026-01&to=2026-03");
    const res = await GET(req as never);
    expect(res.status).toBe(200);

    const chain = tableChains["nps_responses"];
    expect(chain.gte).toHaveBeenCalledWith("created_at", "2026-01-01T00:00:00Z");
    expect(chain.lte).toHaveBeenCalledWith("created_at", "2026-03-31T23:59:59Z");
  });

  it("DBエラー時に500を返す", async () => {
    tableChains["nps_surveys"] = createChain({ data: [], error: null });
    tableChains["nps_responses"] = createChain({ data: null, error: { message: "DB接続エラー" } });

    const req = createReq("GET", "http://localhost/api/admin/line/nps/stats");
    const res = await GET(req as never);
    expect(res.status).toBe(500);
  });

  it("NPS分類が正しい（推奨者9-10、中立7-8、批判者0-6）", async () => {
    tableChains["nps_surveys"] = createChain({ data: [{ id: 1, title: "テスト" }], error: null });
    tableChains["nps_responses"] = createChain({
      data: [
        { survey_id: 1, score: 0, created_at: "2026-01-01T00:00:00Z" },
        { survey_id: 1, score: 6, created_at: "2026-01-02T00:00:00Z" },
        { survey_id: 1, score: 7, created_at: "2026-01-03T00:00:00Z" },
        { survey_id: 1, score: 8, created_at: "2026-01-04T00:00:00Z" },
        { survey_id: 1, score: 9, created_at: "2026-01-05T00:00:00Z" },
        { survey_id: 1, score: 10, created_at: "2026-01-06T00:00:00Z" },
      ],
      error: null,
    });

    const req = createReq("GET", "http://localhost/api/admin/line/nps/stats");
    const res = await GET(req as never);
    const json = await res.json();

    expect(json.summary.promoters).toBe(2);   // 9, 10
    expect(json.summary.passives).toBe(2);     // 7, 8
    expect(json.summary.detractors).toBe(2);   // 0, 6
    // NPS = ((2-2)/6)*100 = 0
    expect(json.summary.nps).toBe(0);
  });
});
