// __tests__/api/line-analytics.test.ts
// LINE配信効果分析API（line/analytics/route.ts）のテスト
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- モック定義 ---

let mockAuthorized = true;
vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: vi.fn(async () => mockAuthorized),
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => null),
  withTenant: vi.fn((q: any) => q),
}));

// getSettingOrEnv モック
let mockLineToken = "test-line-token";
vi.mock("@/lib/settings", () => ({
  getSettingOrEnv: vi.fn(async () => mockLineToken),
}));

// テーブル別結果制御
type MockResult = { data: any; error?: any; count?: number | null };
let mockResultsByTable: Record<string, MockResult> = {};

function createChain(table: string) {
  const chain: any = {};
  const methods = [
    "select", "eq", "neq", "in", "is", "not", "or",
    "ilike", "order", "limit", "single", "maybeSingle",
    "gte", "lte", "like", "range",
  ];
  methods.forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });

  // range メソッドは fetchAll のページネーションで使われる
  chain.range = vi.fn().mockImplementation(() => {
    const result = mockResultsByTable[table] || { data: [], error: null };
    return Promise.resolve(result);
  });

  // select で count:exact, head:true のパターン（CVR算出用）
  const origSelect = chain.select;
  chain.select = vi.fn().mockImplementation((_cols?: string, opts?: any) => {
    if (opts?.count === "exact" && opts?.head === true) {
      // count用: Promise.resolve({ count: N }) を返す
      const countChain: any = {};
      methods.forEach((m) => {
        countChain[m] = vi.fn().mockReturnValue(countChain);
      });
      countChain.then = (resolve: any, reject: any) => {
        return Promise.resolve({ count: 0, data: null, error: null }).then(resolve, reject);
      };
      return countChain;
    }
    return chain;
  });

  // Promiseとして扱えるように
  chain.then = (resolve: any, reject: any) => {
    const result = mockResultsByTable[table] || { data: [], error: null };
    return Promise.resolve(result).then(resolve, reject);
  };

  return chain;
}

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => createChain(table)),
  },
}));

// global.fetch モック（LINE Insight API用）
const originalFetch = global.fetch;
let mockFetchResponses: any[] = [];

function setupMockFetch() {
  global.fetch = vi.fn().mockImplementation(async (url: string) => {
    // LINE Insight API
    if (typeof url === "string" && url.includes("api.line.me")) {
      const resp = mockFetchResponses.shift();
      if (resp) {
        return {
          ok: resp.ok ?? true,
          json: async () => resp.data ?? {},
          text: async () => JSON.stringify(resp.data ?? {}),
        };
      }
      return {
        ok: false,
        json: async () => ({}),
        text: async () => "",
      };
    }
    return { ok: true, json: async () => ({}), text: async () => "" };
  });
}

// ルートインポート
import { GET } from "@/app/api/admin/line/analytics/route";

// --- ヘルパー ---
function createReq(url: string): any {
  const reqUrl = new URL(url);
  return {
    url,
    headers: new Headers({ "Content-Type": "application/json" }),
    nextUrl: {
      searchParams: reqUrl.searchParams,
    },
  } as any;
}

// --- テスト本体 ---
describe("line-analytics API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthorized = true;
    mockLineToken = "test-line-token";
    mockResultsByTable = {};
    mockFetchResponses = [];
    setupMockFetch();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  // 1. 認証失敗
  it("認証失敗 → 401", async () => {
    mockAuthorized = false;
    const req = createReq("http://localhost/api/admin/line/analytics");
    const res = await GET(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Unauthorized");
  });

  // 2. 正常系 — デフォルトperiod=30
  it("正常系: デフォルト period=30", async () => {
    // line_daily_stats は空
    mockResultsByTable["line_daily_stats"] = { data: [] };
    // broadcasts は空
    mockResultsByTable["broadcasts"] = { data: [] };
    // click_tracking_links
    mockResultsByTable["click_tracking_links"] = { data: [] };
    // click_tracking_events
    mockResultsByTable["click_tracking_events"] = { data: [] };
    // orders (CVR用)
    mockResultsByTable["orders"] = { data: [], count: 0 };

    // LINE Insight API: 7日分のレスポンスを設定（全て not ready）
    for (let i = 0; i < 7; i++) {
      mockFetchResponses.push({ ok: true, data: { status: "unready" } });
    }

    const req = createReq("http://localhost/api/admin/line/analytics");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.period).toBe(30);
    expect(json.kpi).toBeDefined();
    expect(json.kpi.totalBroadcasts).toBe(0);
    expect(json.broadcastStats).toEqual([]);
    expect(json.chartData).toBeDefined();
    expect(json.dailyStats).toBeDefined();
  });

  // 3. period=7 のバリデーション
  it("period=7 が受け付けられる", async () => {
    mockResultsByTable["line_daily_stats"] = { data: [] };
    mockResultsByTable["broadcasts"] = { data: [] };
    mockResultsByTable["click_tracking_links"] = { data: [] };
    mockResultsByTable["click_tracking_events"] = { data: [] };

    for (let i = 0; i < 7; i++) {
      mockFetchResponses.push({ ok: false, data: {} });
    }

    const req = createReq("http://localhost/api/admin/line/analytics?period=7");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.period).toBe(7);
  });

  // 4. 無効なperiod → デフォルト30
  it("無効な period → デフォルト30にフォールバック", async () => {
    mockResultsByTable["line_daily_stats"] = { data: [] };
    mockResultsByTable["broadcasts"] = { data: [] };
    mockResultsByTable["click_tracking_links"] = { data: [] };
    mockResultsByTable["click_tracking_events"] = { data: [] };

    for (let i = 0; i < 7; i++) {
      mockFetchResponses.push({ ok: false, data: {} });
    }

    const req = createReq("http://localhost/api/admin/line/analytics?period=999");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.period).toBe(30);
  });

  // 5. LINE Insight API ready → dailyStats にデータ
  it("LINE Insight API: ready → dailyStats に含まれる", async () => {
    mockResultsByTable["line_daily_stats"] = { data: [] };
    mockResultsByTable["broadcasts"] = { data: [] };
    mockResultsByTable["click_tracking_links"] = { data: [] };
    mockResultsByTable["click_tracking_events"] = { data: [] };

    // 7日分: 1つだけ ready
    mockFetchResponses.push({
      ok: true,
      data: {
        status: "ready",
        followers: 1000,
        targetedReaches: 800,
        blocks: 50,
      },
    });
    for (let i = 0; i < 6; i++) {
      mockFetchResponses.push({ ok: true, data: { status: "unready" } });
    }

    const req = createReq("http://localhost/api/admin/line/analytics");
    const res = await GET(req);
    const json = await res.json();
    expect(json.dailyStats.length).toBe(1);
    expect(json.dailyStats[0].followers).toBe(1000);
    expect(json.dailyStats[0].blocks).toBe(50);
  });

  // 6. LINE Insight API 全てエラー → dailyStats 空
  it("LINE Insight API: 全てエラー → dailyStats 空", async () => {
    mockResultsByTable["line_daily_stats"] = { data: [] };
    mockResultsByTable["broadcasts"] = { data: [] };
    mockResultsByTable["click_tracking_links"] = { data: [] };
    mockResultsByTable["click_tracking_events"] = { data: [] };

    for (let i = 0; i < 7; i++) {
      mockFetchResponses.push({ ok: false, data: {} });
    }

    const req = createReq("http://localhost/api/admin/line/analytics");
    const res = await GET(req);
    const json = await res.json();
    expect(json.dailyStats).toEqual([]);
  });

  // 7. chartData のフォーマット
  it("chartData: line_daily_stats のデータが正しく変換される", async () => {
    mockResultsByTable["line_daily_stats"] = {
      data: [
        {
          stat_date: "2026-02-20",
          followers: 100,
          targeted_reaches: 80,
          blocks: 5,
          messages_sent: 50,
          total_clicks: 20,
          unique_clicks: 15,
        },
        {
          stat_date: "2026-02-21",
          followers: 105,
          targeted_reaches: 85,
          blocks: 3,
          messages_sent: 60,
          total_clicks: 25,
          unique_clicks: 18,
        },
      ],
    };
    mockResultsByTable["broadcasts"] = { data: [] };
    mockResultsByTable["click_tracking_links"] = { data: [] };
    mockResultsByTable["click_tracking_events"] = { data: [] };

    for (let i = 0; i < 7; i++) {
      mockFetchResponses.push({ ok: false, data: {} });
    }

    const req = createReq("http://localhost/api/admin/line/analytics");
    const res = await GET(req);
    const json = await res.json();

    // followerTrend
    expect(json.chartData.followerTrend.length).toBe(2);
    expect(json.chartData.followerTrend[0].date).toBe("2026-02-20");
    expect(json.chartData.followerTrend[0].diff).toBe(0); // 最初の行はdiff=0
    expect(json.chartData.followerTrend[1].diff).toBe(5); // 105-100

    // deliveryStats
    expect(json.chartData.deliveryStats[0].sent).toBe(50);

    // clickStats
    expect(json.chartData.clickStats[0].clicks).toBe(20);
    expect(json.chartData.clickStats[0].uniqueClicks).toBe(15);

    // blockStats
    expect(json.chartData.blockStats[0].blockRate).toBe(5); // (5/100)*100
  });

  // 8. broadcastStats のフォーマット
  it("broadcastStats: 配信統計が正しく返る", async () => {
    mockResultsByTable["line_daily_stats"] = { data: [] };
    mockResultsByTable["broadcasts"] = {
      data: [
        {
          id: 1,
          name: "テスト配信",
          status: "sent",
          total_targets: 100,
          sent_count: 95,
          failed_count: 5,
          no_uid_count: 0,
          sent_at: "2026-02-20T10:00:00Z",
          created_at: "2026-02-20T09:00:00Z",
        },
      ],
    };
    mockResultsByTable["click_tracking_links"] = { data: [] };
    mockResultsByTable["click_tracking_events"] = { data: [] };
    mockResultsByTable["orders"] = { data: [], count: 0 };

    for (let i = 0; i < 7; i++) {
      mockFetchResponses.push({ ok: false, data: {} });
    }

    const req = createReq("http://localhost/api/admin/line/analytics");
    const res = await GET(req);
    const json = await res.json();

    expect(json.broadcastStats.length).toBe(1);
    expect(json.broadcastStats[0].name).toBe("テスト配信");
    expect(json.broadcastStats[0].totalTargets).toBe(100);
    expect(json.broadcastStats[0].sentCount).toBe(95);
    // 配信率: (95/100)*100 = 95.0
    expect(json.broadcastStats[0].deliveryRate).toBe(95);
    expect(json.kpi.totalBroadcasts).toBe(1);
  });

  // 9. KPI 集計
  it("KPI: 配信なし → 全て0", async () => {
    mockResultsByTable["line_daily_stats"] = { data: [] };
    mockResultsByTable["broadcasts"] = { data: [] };
    mockResultsByTable["click_tracking_links"] = { data: [] };
    mockResultsByTable["click_tracking_events"] = { data: [] };

    for (let i = 0; i < 7; i++) {
      mockFetchResponses.push({ ok: false, data: {} });
    }

    const req = createReq("http://localhost/api/admin/line/analytics");
    const res = await GET(req);
    const json = await res.json();

    expect(json.kpi.totalBroadcasts).toBe(0);
    expect(json.kpi.avgDeliveryRate).toBe(0);
    expect(json.kpi.avgClickRate).toBe(0);
    expect(json.kpi.avgCvr).toBe(0);
  });

  // 10. lineToken が空 → LINE Insight API はスキップ
  it("lineToken が空 → dailyStats 空", async () => {
    mockLineToken = "";
    mockResultsByTable["line_daily_stats"] = { data: [] };
    mockResultsByTable["broadcasts"] = { data: [] };
    mockResultsByTable["click_tracking_links"] = { data: [] };
    mockResultsByTable["click_tracking_events"] = { data: [] };

    const req = createReq("http://localhost/api/admin/line/analytics");
    const res = await GET(req);
    const json = await res.json();

    expect(json.dailyStats).toEqual([]);
  });

  // 11. period=90 が受け付けられる
  it("period=90 が受け付けられる", async () => {
    mockResultsByTable["line_daily_stats"] = { data: [] };
    mockResultsByTable["broadcasts"] = { data: [] };
    mockResultsByTable["click_tracking_links"] = { data: [] };
    mockResultsByTable["click_tracking_events"] = { data: [] };

    for (let i = 0; i < 7; i++) {
      mockFetchResponses.push({ ok: false, data: {} });
    }

    const req = createReq("http://localhost/api/admin/line/analytics?period=90");
    const res = await GET(req);
    const json = await res.json();
    expect(json.period).toBe(90);
  });
});
