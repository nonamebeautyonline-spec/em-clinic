// __tests__/api/cron-collect-line-stats.test.ts
// 日次LINE統計収集Cron（/api/cron/collect-line-stats）のテスト

import { describe, it, expect, vi, beforeEach } from "vitest";

// --- モック定義 ---

const mockFrom = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: (...args: any[]) => mockFrom(...args),
  },
}));

vi.mock("@/lib/tenant", () => ({
  withTenant: vi.fn((query) => query),
  tenantPayload: vi.fn((id) => ({ tenant_id: id })),
}));

vi.mock("@/lib/settings", () => ({
  getSettingOrEnv: vi.fn().mockResolvedValue("mock-line-token"),
}));

// global fetch をモック
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const TEST_TENANT_ID = "test-tenant-001";

function createMockRequest(url: string) {
  return {
    method: "GET",
    url,
    headers: { get: vi.fn(() => null) },
    cookies: { get: vi.fn(() => undefined) },
  } as any;
}

// テナント一覧のモックを含むfromヘルパー
function setupMockFrom(overrides: {
  existingStats?: boolean;
  insertError?: { message: string } | null;
  messageCount?: number;
  clickEvents?: { id: string; ip_address: string }[];
} = {}) {
  const insertMock = vi.fn().mockReturnValue({
    data: null,
    error: overrides.insertError ?? null,
  });

  mockFrom.mockImplementation((table: string) => {
    if (table === "tenants") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnValue({
          data: [{ id: TEST_TENANT_ID }],
          error: null,
        }),
      };
    }
    if (table === "line_daily_stats") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockReturnValue({
          data: overrides.existingStats ? { id: "existing-1" } : null,
          error: null,
        }),
        insert: insertMock,
      };
    }
    if (table === "message_log") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnValue({
          data: null,
          error: null,
          count: overrides.messageCount ?? 0,
        }),
      };
    }
    if (table === "click_tracking_events") {
      return {
        select: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnValue({
          data: overrides.clickEvents ?? [],
          error: null,
        }),
      };
    }
    return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() };
  });

  return insertMock;
}

describe("Cron collect-line-stats API", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    const { getSettingOrEnv } = await import("@/lib/settings");
    vi.mocked(getSettingOrEnv).mockResolvedValue("mock-line-token");
  });

  it("既存レコードがある場合は200でskipped:1を返す", async () => {
    setupMockFrom({ existingStats: true });

    const { GET } = await import("@/app/api/cron/collect-line-stats/route");
    const req = createMockRequest("http://localhost:3000/api/cron/collect-line-stats");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.skipped).toBe(1);
  });

  it("LINEトークンが空の場合followerStatsはnull、残りは正常処理", async () => {
    const { getSettingOrEnv } = await import("@/lib/settings");
    vi.mocked(getSettingOrEnv).mockResolvedValue("");

    const insertMock = setupMockFrom({ messageCount: 5 });

    const { GET } = await import("@/app/api/cron/collect-line-stats/route");
    const req = createMockRequest("http://localhost:3000/api/cron/collect-line-stats");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(insertMock).toHaveBeenCalled();
    const insertArg = insertMock.mock.calls[0][0];
    expect(insertArg.followers).toBe(0);
  });

  it("LINE API失敗（!res.ok）の場合followerStatsはnull", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });
    const insertMock = setupMockFrom();

    const { GET } = await import("@/app/api/cron/collect-line-stats/route");
    const req = createMockRequest("http://localhost:3000/api/cron/collect-line-stats");
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(insertMock).toHaveBeenCalled();
    const insertArg = insertMock.mock.calls[0][0];
    expect(insertArg.followers).toBe(0);
  });

  it("LINE APIのdata.statusがready以外の場合followerStatsはnull", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ status: "in_progress" }) });
    const insertMock = setupMockFrom();

    const { GET } = await import("@/app/api/cron/collect-line-stats/route");
    const req = createMockRequest("http://localhost:3000/api/cron/collect-line-stats");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const insertArg = insertMock.mock.calls[0][0];
    expect(insertArg.followers).toBe(0);
  });

  it("正常系で200とok:trueを返す", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ status: "ready", followers: 150, targetedReaches: 120, blocks: 5 }),
    });
    setupMockFrom({
      messageCount: 10,
      clickEvents: [{ id: "c1", ip_address: "1.1.1.1" }],
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
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ status: "ready", followers: 10, targetedReaches: 5, blocks: 1 }),
    });
    const insertMock = setupMockFrom({ messageCount: 42 });

    const { GET } = await import("@/app/api/cron/collect-line-stats/route");
    const req = createMockRequest("http://localhost:3000/api/cron/collect-line-stats");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const insertArg = insertMock.mock.calls[0][0];
    expect(insertArg.messages_sent).toBe(42);
  });

  it("click_tracking 0件の場合totalClicks=0, uniqueClicks=0", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ status: "ready", followers: 10, targetedReaches: 5, blocks: 1 }),
    });
    const insertMock = setupMockFrom({ clickEvents: [] });

    const { GET } = await import("@/app/api/cron/collect-line-stats/route");
    const req = createMockRequest("http://localhost:3000/api/cron/collect-line-stats");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const insertArg = insertMock.mock.calls[0][0];
    expect(insertArg.total_clicks).toBe(0);
    expect(insertArg.unique_clicks).toBe(0);
  });

  it("click_tracking重複IPの場合uniqueClicksが正しく計算される", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ status: "ready", followers: 10, targetedReaches: 5, blocks: 1 }),
    });
    const insertMock = setupMockFrom({
      clickEvents: [
        { id: "c1", ip_address: "1.1.1.1" },
        { id: "c2", ip_address: "1.1.1.1" },
        { id: "c3", ip_address: "2.2.2.2" },
        { id: "c4", ip_address: "3.3.3.3" },
        { id: "c5", ip_address: "2.2.2.2" },
      ],
    });

    const { GET } = await import("@/app/api/cron/collect-line-stats/route");
    const req = createMockRequest("http://localhost:3000/api/cron/collect-line-stats");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const insertArg = insertMock.mock.calls[0][0];
    expect(insertArg.total_clicks).toBe(5);
    expect(insertArg.unique_clicks).toBe(3);
  });

  it("INSERT失敗時はerrors:1を返す", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ status: "ready", followers: 10, targetedReaches: 5, blocks: 1 }),
    });
    setupMockFrom({ insertError: { message: "duplicate key" } });

    const { GET } = await import("@/app/api/cron/collect-line-stats/route");
    const req = createMockRequest("http://localhost:3000/api/cron/collect-line-stats");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.errors).toBe(1);
  });

  it("fetchFollowerStats例外時はnullを返す（try/catch）", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));
    const insertMock = setupMockFrom();

    const { GET } = await import("@/app/api/cron/collect-line-stats/route");
    const req = createMockRequest("http://localhost:3000/api/cron/collect-line-stats");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    const insertArg = insertMock.mock.calls[0][0];
    expect(insertArg.followers).toBe(0);
  });

  it("日付計算が正しい（statDateはYYYY-MM-DD形式）", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ status: "ready", followers: 1, targetedReaches: 1, blocks: 0 }),
    });
    const insertMock = setupMockFrom();

    const { GET } = await import("@/app/api/cron/collect-line-stats/route");
    const req = createMockRequest("http://localhost:3000/api/cron/collect-line-stats");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const insertArg = insertMock.mock.calls[0][0];
    expect(insertArg.stat_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("insertに正しいデータが渡される", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ status: "ready", followers: 200, targetedReaches: 180, blocks: 10 }),
    });
    const insertMock = setupMockFrom({
      messageCount: 25,
      clickEvents: [
        { id: "c1", ip_address: "10.0.0.1" },
        { id: "c2", ip_address: "10.0.0.2" },
      ],
    });

    const { GET } = await import("@/app/api/cron/collect-line-stats/route");
    const req = createMockRequest("http://localhost:3000/api/cron/collect-line-stats");
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(insertMock).toHaveBeenCalledTimes(1);
    const insertArg = insertMock.mock.calls[0][0];
    expect(insertArg).toMatchObject({
      tenant_id: TEST_TENANT_ID,
      followers: 200,
      targeted_reaches: 180,
      blocks: 10,
      messages_sent: 25,
      total_clicks: 2,
      unique_clicks: 2,
    });
    expect(insertArg.stat_date).toBeDefined();
  });

  it("CRON_SECRET認証: 不正なトークンの場合401を返す", async () => {
    process.env.CRON_SECRET = "correct-secret";
    const { GET } = await import("@/app/api/cron/collect-line-stats/route");
    const req = createMockRequest("http://localhost:3000/api/cron/collect-line-stats");
    req.headers.get = vi.fn((name: string) => name === "authorization" ? "Bearer wrong-secret" : null);
    const res = await GET(req);
    expect(res.status).toBe(401);
    delete process.env.CRON_SECRET;
  });

  it("アクティブなテナントがない場合はメッセージを返す", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "tenants") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnValue({ data: [], error: null }),
        };
      }
      return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() };
    });

    const { GET } = await import("@/app/api/cron/collect-line-stats/route");
    const req = createMockRequest("http://localhost:3000/api/cron/collect-line-stats");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.message).toBeDefined();
  });
});
