// __tests__/api/cron-collect-line-stats.test.ts
// 日次LINE統計収集Cron（/api/cron/collect-line-stats）のテスト

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// --- モック定義 ---

const mockFrom = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: (...args: any[]) => mockFrom(...args),
  },
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn().mockReturnValue("test-tenant"),
  withTenant: vi.fn((query) => query),
  tenantPayload: vi.fn((id) => ({ tenant_id: id })),
}));

vi.mock("@/lib/settings", () => ({
  getSettingOrEnv: vi.fn().mockResolvedValue("mock-line-token"),
}));

// global fetch をモック
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function createMockRequest(url: string) {
  return {
    method: "GET",
    url,
    headers: { get: vi.fn(() => null) },
    cookies: { get: vi.fn(() => undefined) },
  } as any;
}

// テーブルチェーンビルダー
function chainBuilder(overrides: Record<string, any> = {}) {
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockReturnValue({
      data: overrides.maybeSingleData ?? null,
      error: overrides.maybeSingleError ?? null,
      count: overrides.count ?? 0,
    }),
    insert: vi.fn().mockReturnValue({
      data: overrides.insertData ?? null,
      error: overrides.insertError ?? null,
    }),
  };
  return chain;
}

describe("Cron collect-line-stats API", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    // clearAllMocks で getSettingOrEnv のデフォルト実装がリセットされるため再設定
    const { getSettingOrEnv } = await import("@/lib/settings");
    vi.mocked(getSettingOrEnv).mockResolvedValue("mock-line-token");
  });

  it("既存レコードがある場合は200でskipped:trueを返す", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "line_daily_stats") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockReturnValue({ data: { id: "existing-1" }, error: null }),
        };
      }
      return chainBuilder();
    });

    const { GET } = await import("@/app/api/cron/collect-line-stats/route");
    const req = createMockRequest("http://localhost:3000/api/cron/collect-line-stats");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.skipped).toBe(true);
  });

  it("LINEトークンが空の場合followerStatsはnull、残りは正常処理", async () => {
    const { getSettingOrEnv } = await import("@/lib/settings");
    vi.mocked(getSettingOrEnv).mockResolvedValue("");

    const insertMock = vi.fn().mockReturnValue({ data: null, error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === "line_daily_stats") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockReturnValue({ data: null, error: null }),
          insert: insertMock,
        };
      }
      if (table === "message_log") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnValue({ data: null, error: null, count: 5 }),
        };
      }
      if (table === "click_tracking_events") {
        return {
          select: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnValue({ data: [], error: null }),
        };
      }
      return chainBuilder();
    });

    const { GET } = await import("@/app/api/cron/collect-line-stats/route");
    const req = createMockRequest("http://localhost:3000/api/cron/collect-line-stats");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    // followers は 0（トークンがないため fetchFollowerStats が null を返す）
    expect(insertMock).toHaveBeenCalled();
    const insertArg = insertMock.mock.calls[0][0];
    expect(insertArg.followers).toBe(0);
  });

  it("LINE API失敗（!res.ok）の場合followerStatsはnull", async () => {
    const insertMock = vi.fn().mockReturnValue({ data: null, error: null });

    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "line_daily_stats") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockReturnValue({ data: null, error: null }),
          insert: insertMock,
        };
      }
      if (table === "message_log") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnValue({ data: null, error: null, count: 0 }),
        };
      }
      if (table === "click_tracking_events") {
        return {
          select: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnValue({ data: [], error: null }),
        };
      }
      return chainBuilder();
    });

    const { GET } = await import("@/app/api/cron/collect-line-stats/route");
    const req = createMockRequest("http://localhost:3000/api/cron/collect-line-stats");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(insertMock).toHaveBeenCalled();
    const insertArg = insertMock.mock.calls[0][0];
    expect(insertArg.followers).toBe(0);
  });

  it("LINE APIのdata.statusがready以外の場合followerStatsはnull", async () => {
    const insertMock = vi.fn().mockReturnValue({ data: null, error: null });

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ status: "in_progress" }),
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "line_daily_stats") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockReturnValue({ data: null, error: null }),
          insert: insertMock,
        };
      }
      if (table === "message_log") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnValue({ data: null, error: null, count: 0 }),
        };
      }
      if (table === "click_tracking_events") {
        return {
          select: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnValue({ data: [], error: null }),
        };
      }
      return chainBuilder();
    });

    const { GET } = await import("@/app/api/cron/collect-line-stats/route");
    const req = createMockRequest("http://localhost:3000/api/cron/collect-line-stats");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    const insertArg = insertMock.mock.calls[0][0];
    expect(insertArg.followers).toBe(0);
  });

  it("正常系で200とok:trueを返す", async () => {
    const insertMock = vi.fn().mockReturnValue({ data: null, error: null });

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        status: "ready",
        followers: 150,
        targetedReaches: 120,
        blocks: 5,
      }),
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "line_daily_stats") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockReturnValue({ data: null, error: null }),
          insert: insertMock,
        };
      }
      if (table === "message_log") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnValue({ data: null, error: null, count: 10 }),
        };
      }
      if (table === "click_tracking_events") {
        return {
          select: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnValue({ data: [{ id: "c1", ip_address: "1.1.1.1" }], error: null }),
        };
      }
      return chainBuilder();
    });

    const { GET } = await import("@/app/api/cron/collect-line-stats/route");
    const req = createMockRequest("http://localhost:3000/api/cron/collect-line-stats");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("message_log countが正しく取得される", async () => {
    const insertMock = vi.fn().mockReturnValue({ data: null, error: null });

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ status: "ready", followers: 10, targetedReaches: 5, blocks: 1 }),
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "line_daily_stats") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockReturnValue({ data: null, error: null }),
          insert: insertMock,
        };
      }
      if (table === "message_log") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnValue({ data: null, error: null, count: 42 }),
        };
      }
      if (table === "click_tracking_events") {
        return {
          select: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnValue({ data: [], error: null }),
        };
      }
      return chainBuilder();
    });

    const { GET } = await import("@/app/api/cron/collect-line-stats/route");
    const req = createMockRequest("http://localhost:3000/api/cron/collect-line-stats");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const insertArg = insertMock.mock.calls[0][0];
    expect(insertArg.messages_sent).toBe(42);
  });

  it("click_tracking 0件の場合totalClicks=0, uniqueClicks=0", async () => {
    const insertMock = vi.fn().mockReturnValue({ data: null, error: null });

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ status: "ready", followers: 10, targetedReaches: 5, blocks: 1 }),
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "line_daily_stats") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockReturnValue({ data: null, error: null }),
          insert: insertMock,
        };
      }
      if (table === "message_log") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnValue({ data: null, error: null, count: 0 }),
        };
      }
      if (table === "click_tracking_events") {
        return {
          select: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnValue({ data: [], error: null }),
        };
      }
      return chainBuilder();
    });

    const { GET } = await import("@/app/api/cron/collect-line-stats/route");
    const req = createMockRequest("http://localhost:3000/api/cron/collect-line-stats");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const insertArg = insertMock.mock.calls[0][0];
    expect(insertArg.total_clicks).toBe(0);
    expect(insertArg.unique_clicks).toBe(0);
  });

  it("click_tracking重複IPの場合uniqueClicksが正しく計算される", async () => {
    const insertMock = vi.fn().mockReturnValue({ data: null, error: null });

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ status: "ready", followers: 10, targetedReaches: 5, blocks: 1 }),
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "line_daily_stats") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockReturnValue({ data: null, error: null }),
          insert: insertMock,
        };
      }
      if (table === "message_log") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnValue({ data: null, error: null, count: 0 }),
        };
      }
      if (table === "click_tracking_events") {
        return {
          select: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnValue({
            data: [
              { id: "c1", ip_address: "1.1.1.1" },
              { id: "c2", ip_address: "1.1.1.1" }, // 重複IP
              { id: "c3", ip_address: "2.2.2.2" },
              { id: "c4", ip_address: "3.3.3.3" },
              { id: "c5", ip_address: "2.2.2.2" }, // 重複IP
            ],
            error: null,
          }),
        };
      }
      return chainBuilder();
    });

    const { GET } = await import("@/app/api/cron/collect-line-stats/route");
    const req = createMockRequest("http://localhost:3000/api/cron/collect-line-stats");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const insertArg = insertMock.mock.calls[0][0];
    expect(insertArg.total_clicks).toBe(5);
    expect(insertArg.unique_clicks).toBe(3); // 1.1.1.1, 2.2.2.2, 3.3.3.3
  });

  it("INSERT失敗時は500を返す", async () => {
    const insertMock = vi.fn().mockReturnValue({ data: null, error: { message: "duplicate key" } });

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ status: "ready", followers: 10, targetedReaches: 5, blocks: 1 }),
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "line_daily_stats") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockReturnValue({ data: null, error: null }),
          insert: insertMock,
        };
      }
      if (table === "message_log") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnValue({ data: null, error: null, count: 0 }),
        };
      }
      if (table === "click_tracking_events") {
        return {
          select: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnValue({ data: [], error: null }),
        };
      }
      return chainBuilder();
    });

    const { GET } = await import("@/app/api/cron/collect-line-stats/route");
    const req = createMockRequest("http://localhost:3000/api/cron/collect-line-stats");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toContain("duplicate key");
  });

  it("fetchFollowerStats例外時はnullを返す（try/catch）", async () => {
    const insertMock = vi.fn().mockReturnValue({ data: null, error: null });

    // fetch が例外をスロー
    mockFetch.mockRejectedValue(new Error("Network error"));

    mockFrom.mockImplementation((table: string) => {
      if (table === "line_daily_stats") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockReturnValue({ data: null, error: null }),
          insert: insertMock,
        };
      }
      if (table === "message_log") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnValue({ data: null, error: null, count: 0 }),
        };
      }
      if (table === "click_tracking_events") {
        return {
          select: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnValue({ data: [], error: null }),
        };
      }
      return chainBuilder();
    });

    const { GET } = await import("@/app/api/cron/collect-line-stats/route");
    const req = createMockRequest("http://localhost:3000/api/cron/collect-line-stats");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    // followerStatsがnullなので followers=0
    const insertArg = insertMock.mock.calls[0][0];
    expect(insertArg.followers).toBe(0);
  });

  it("日付計算が正しい（statDateはYYYY-MM-DD形式）", async () => {
    const insertMock = vi.fn().mockReturnValue({ data: null, error: null });

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ status: "ready", followers: 1, targetedReaches: 1, blocks: 0 }),
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "line_daily_stats") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockReturnValue({ data: null, error: null }),
          insert: insertMock,
        };
      }
      if (table === "message_log") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnValue({ data: null, error: null, count: 0 }),
        };
      }
      if (table === "click_tracking_events") {
        return {
          select: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnValue({ data: [], error: null }),
        };
      }
      return chainBuilder();
    });

    const { GET } = await import("@/app/api/cron/collect-line-stats/route");
    const req = createMockRequest("http://localhost:3000/api/cron/collect-line-stats");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // stat_date もYYYY-MM-DD形式
    const insertArg = insertMock.mock.calls[0][0];
    expect(insertArg.stat_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("insertに正しいデータが渡される", async () => {
    const insertMock = vi.fn().mockReturnValue({ data: null, error: null });

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        status: "ready",
        followers: 200,
        targetedReaches: 180,
        blocks: 10,
      }),
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "line_daily_stats") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockReturnValue({ data: null, error: null }),
          insert: insertMock,
        };
      }
      if (table === "message_log") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnValue({ data: null, error: null, count: 25 }),
        };
      }
      if (table === "click_tracking_events") {
        return {
          select: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnValue({
            data: [
              { id: "c1", ip_address: "10.0.0.1" },
              { id: "c2", ip_address: "10.0.0.2" },
            ],
            error: null,
          }),
        };
      }
      return chainBuilder();
    });

    const { GET } = await import("@/app/api/cron/collect-line-stats/route");
    const req = createMockRequest("http://localhost:3000/api/cron/collect-line-stats");
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(insertMock).toHaveBeenCalledTimes(1);
    const insertArg = insertMock.mock.calls[0][0];
    expect(insertArg).toMatchObject({
      tenant_id: "test-tenant",
      followers: 200,
      targeted_reaches: 180,
      blocks: 10,
      messages_sent: 25,
      total_clicks: 2,
      unique_clicks: 2,
    });
    expect(insertArg.stat_date).toBeDefined();
  });
});
