// __tests__/api/line-dashboard.test.ts
// LINE ダッシュボードAPI（line/dashboard/route.ts）のテスト
// フォロワー統計、送信メッセージ統計、チャートデータ、配信別統計
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- モック定義 ---

let mockAuthorized = true;
vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: vi.fn(async () => mockAuthorized),
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
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

  // select で count:exact, head:true のパターン
  chain.select = vi.fn().mockImplementation((_cols?: string, opts?: any) => {
    if (opts?.count === "exact" && opts?.head === true) {
      const countChain: any = {};
      methods.forEach((m) => {
        countChain[m] = vi.fn().mockReturnValue(countChain);
      });
      countChain.then = (resolve: any, reject: any) => {
        const result = mockResultsByTable[table] || { count: 0, data: null, error: null };
        return Promise.resolve({ count: result.count ?? 0, data: null, error: null }).then(resolve, reject);
      };
      return countChain;
    }
    return chain;
  });

  // デフォルトの then でデータを返す
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

// fetch モック（LINE Insight API用）
let mockFetchResponses: any[] = [];
let fetchCallIndex = 0;

vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => {
  const response = mockFetchResponses[fetchCallIndex] || {
    ok: true,
    json: async () => ({ status: "ready", followers: 100, targetedReaches: 80, blocks: 5 }),
  };
  fetchCallIndex++;
  return response;
}));

// --- テスト ---

import { GET } from "@/app/api/admin/line/dashboard/route";
import { NextRequest } from "next/server";

function createReq(params?: Record<string, string>) {
  const url = new URL("http://localhost/api/admin/line/dashboard");
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  return new NextRequest(url);
}

describe("LINE ダッシュボード API", () => {
  beforeEach(() => {
    mockAuthorized = true;
    mockLineToken = "test-line-token";
    mockResultsByTable = {};
    mockFetchResponses = [];
    fetchCallIndex = 0;
    vi.clearAllMocks();
  });

  // =============================================
  // 認証テスト
  // =============================================
  describe("認証", () => {
    it("認証失敗時に 401 を返す", async () => {
      mockAuthorized = false;
      const res = await GET(createReq());
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe("Unauthorized");
    });
  });

  // =============================================
  // 正常系: レスポンス構造
  // =============================================
  describe("正常系", () => {
    it("全フィールドを含むレスポンスを返す", async () => {
      // LINE Insight API のレスポンスモック（7日分）
      mockFetchResponses = Array(7).fill(null).map(() => ({
        ok: true,
        json: async () => ({
          status: "ready",
          followers: 150,
          targetedReaches: 120,
          blocks: 10,
        }),
      }));

      // message_log のデータ
      mockResultsByTable["message_log"] = {
        data: [
          { id: 1, patient_id: "P001", message_type: "individual", content: "テスト", status: "sent", sent_at: "2026-02-01T10:00:00Z" },
        ],
        error: null,
        count: 5,
      };

      // patients のデータ（名前解決用）
      mockResultsByTable["patients"] = {
        data: [
          { patient_id: "P001", name: "山田太郎" },
        ],
        error: null,
      };

      // line_daily_stats のデータ
      mockResultsByTable["line_daily_stats"] = {
        data: [
          { stat_date: "2026-02-20", followers: 140, targeted_reaches: 110, blocks: 8, messages_sent: 20, total_clicks: 10, unique_clicks: 5 },
          { stat_date: "2026-02-21", followers: 145, targeted_reaches: 115, blocks: 9, messages_sent: 25, total_clicks: 12, unique_clicks: 6 },
        ],
        error: null,
      };

      // broadcasts のデータ
      mockResultsByTable["broadcasts"] = {
        data: [
          { id: 1, name: "テスト配信", status: "sent", total_targets: 100, sent_count: 95, failed_count: 5, no_uid_count: 0, sent_at: "2026-02-20T10:00:00Z", created_at: "2026-02-20T09:00:00Z" },
        ],
        error: null,
      };

      // click_tracking_links（空）
      mockResultsByTable["click_tracking_links"] = { data: [], error: null };

      const res = await GET(createReq());
      expect(res.status).toBe(200);

      const body = await res.json();

      // レスポンスに必要なフィールドが含まれることを検証
      expect(body).toHaveProperty("stats");
      expect(body).toHaveProperty("monthlySent");
      expect(body).toHaveProperty("dailyStats");
      expect(body).toHaveProperty("recentMessages");
      expect(body).toHaveProperty("chartData");
      expect(body).toHaveProperty("broadcastStats");

      // stats の構造
      expect(body.stats).toHaveProperty("followers");
      expect(body.stats).toHaveProperty("targetedReaches");
      expect(body.stats).toHaveProperty("blocks");
    });

    it("period パラメータで期間を指定できる（7/30/90）", async () => {
      mockFetchResponses = Array(7).fill(null).map(() => ({
        ok: true,
        json: async () => ({ status: "ready", followers: 100, targetedReaches: 80, blocks: 5 }),
      }));
      mockResultsByTable["message_log"] = { data: [], error: null, count: 0 };
      mockResultsByTable["line_daily_stats"] = { data: [], error: null };
      mockResultsByTable["broadcasts"] = { data: [], error: null };

      const res = await GET(createReq({ period: "30" }));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.chartData.period).toBe(30);
    });

    it("不正な period 値はデフォルト7にフォールバック", async () => {
      mockFetchResponses = Array(7).fill(null).map(() => ({
        ok: true,
        json: async () => ({ status: "ready", followers: 100, targetedReaches: 80, blocks: 5 }),
      }));
      mockResultsByTable["message_log"] = { data: [], error: null, count: 0 };
      mockResultsByTable["line_daily_stats"] = { data: [], error: null };
      mockResultsByTable["broadcasts"] = { data: [], error: null };

      const res = await GET(createReq({ period: "999" }));
      const body = await res.json();
      expect(body.chartData.period).toBe(7);
    });
  });

  // =============================================
  // LINE Insight API フォールバック
  // =============================================
  describe("LINE Insight API フォールバック", () => {
    it("LINE API が失敗しても stats は 0 でフォールバック", async () => {
      // LINE API が全て失敗
      mockFetchResponses = Array(7).fill(null).map(() => ({
        ok: false,
        json: async () => ({}),
      }));

      mockResultsByTable["message_log"] = { data: [], error: null, count: 0 };
      mockResultsByTable["line_daily_stats"] = { data: [], error: null };
      mockResultsByTable["broadcasts"] = { data: [], error: null };

      const res = await GET(createReq());
      expect(res.status).toBe(200);
      const body = await res.json();

      // フォロワー統計は 0 にフォールバック
      expect(body.stats.followers).toBe(0);
      expect(body.stats.targetedReaches).toBe(0);
      expect(body.stats.blocks).toBe(0);
      // 推定補完ロジックにより直近数日分のエントリが生成される場合がある
      for (const d of body.dailyStats) {
        expect(d.followers).toBe(0);
      }
    });

    it("LINE API の status が ready でない場合は null（除外される）", async () => {
      mockFetchResponses = Array(7).fill(null).map(() => ({
        ok: true,
        json: async () => ({ status: "unready", followers: 0, targetedReaches: 0, blocks: 0 }),
      }));

      mockResultsByTable["message_log"] = { data: [], error: null, count: 0 };
      mockResultsByTable["line_daily_stats"] = { data: [], error: null };
      mockResultsByTable["broadcasts"] = { data: [], error: null };

      const res = await GET(createReq());
      const body = await res.json();
      // LINE Insight APIのデータは除外されるが、推定補完で直近数日分が生成される場合がある
      for (const d of body.dailyStats) {
        expect(d.followers).toBe(0);
      }
      expect(body.stats.followers).toBe(0);
    });

    it("LINE トークンが空の場合もエラーにならない", async () => {
      mockLineToken = "";
      mockResultsByTable["message_log"] = { data: [], error: null, count: 0 };
      mockResultsByTable["line_daily_stats"] = { data: [], error: null };
      mockResultsByTable["broadcasts"] = { data: [], error: null };

      const res = await GET(createReq());
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.stats.followers).toBe(0);
    });
  });

  // =============================================
  // チャートデータ構造
  // =============================================
  describe("チャートデータ", () => {
    it("followerTrend に diff が含まれる", async () => {
      mockFetchResponses = Array(7).fill(null).map(() => ({
        ok: true,
        json: async () => ({ status: "ready", followers: 100, targetedReaches: 80, blocks: 5 }),
      }));
      mockResultsByTable["message_log"] = { data: [], error: null, count: 0 };
      mockResultsByTable["line_daily_stats"] = {
        data: [
          { stat_date: "2026-02-18", followers: 100, targeted_reaches: 80, blocks: 5, messages_sent: 10, total_clicks: 5, unique_clicks: 3 },
          { stat_date: "2026-02-19", followers: 110, targeted_reaches: 88, blocks: 6, messages_sent: 12, total_clicks: 6, unique_clicks: 4 },
        ],
        error: null,
      };
      mockResultsByTable["broadcasts"] = { data: [], error: null };

      const res = await GET(createReq());
      const body = await res.json();

      // 最初の要素は diff = 0
      expect(body.chartData.followerTrend[0].diff).toBe(0);
      // 2番目の要素は diff = 110 - 100 = 10
      expect(body.chartData.followerTrend[1].diff).toBe(10);
    });

    it("blockStats に blockRate が含まれる", async () => {
      mockFetchResponses = Array(7).fill(null).map(() => ({
        ok: true,
        json: async () => ({ status: "ready", followers: 100, targetedReaches: 80, blocks: 5 }),
      }));
      mockResultsByTable["message_log"] = { data: [], error: null, count: 0 };
      mockResultsByTable["line_daily_stats"] = {
        data: [
          { stat_date: "2026-02-18", followers: 200, targeted_reaches: 160, blocks: 10, messages_sent: 30, total_clicks: 15, unique_clicks: 8 },
        ],
        error: null,
      };
      mockResultsByTable["broadcasts"] = { data: [], error: null };

      const res = await GET(createReq());
      const body = await res.json();

      // blockRate = (10 / 200) * 100 = 5.0
      expect(body.chartData.blockStats[0].blockRate).toBe(5);
    });
  });

  // =============================================
  // 配信別統計
  // =============================================
  describe("配信別統計", () => {
    it("broadcastStats の deliveryRate と clickRate が正しい", async () => {
      mockFetchResponses = Array(7).fill(null).map(() => ({
        ok: true,
        json: async () => ({ status: "ready", followers: 100, targetedReaches: 80, blocks: 5 }),
      }));
      mockResultsByTable["message_log"] = { data: [], error: null, count: 0 };
      mockResultsByTable["line_daily_stats"] = { data: [], error: null };
      mockResultsByTable["broadcasts"] = {
        data: [
          { id: 1, name: "配信A", status: "sent", total_targets: 200, sent_count: 180, failed_count: 20, no_uid_count: 5, sent_at: "2026-02-20T10:00:00Z", created_at: "2026-02-20T09:00:00Z" },
        ],
        error: null,
      };
      // クリック追跡リンクとイベント
      mockResultsByTable["click_tracking_links"] = {
        data: [{ id: 10, broadcast_id: 1 }],
        error: null,
      };
      mockResultsByTable["click_tracking_events"] = {
        data: [
          { link_id: 10, ip_address: "1.1.1.1" },
          { link_id: 10, ip_address: "1.1.1.1" },
          { link_id: 10, ip_address: "2.2.2.2" },
        ],
        error: null,
      };

      const res = await GET(createReq());
      const body = await res.json();

      expect(body.broadcastStats).toHaveLength(1);
      const stat = body.broadcastStats[0];
      // deliveryRate = (180/200)*100 = 90.0
      expect(stat.deliveryRate).toBe(90);
      // totalClicks = 3, uniqueClicks = 2
      expect(stat.totalClicks).toBe(3);
      expect(stat.uniqueClicks).toBe(2);
      // clickRate = (2/180)*100 = 1.1
      expect(stat.clickRate).toBe(1.1);
    });

    it("配信データが 0 件でもエラーにならない", async () => {
      mockFetchResponses = Array(7).fill(null).map(() => ({
        ok: true,
        json: async () => ({ status: "ready", followers: 100, targetedReaches: 80, blocks: 5 }),
      }));
      mockResultsByTable["message_log"] = { data: [], error: null, count: 0 };
      mockResultsByTable["line_daily_stats"] = { data: [], error: null };
      mockResultsByTable["broadcasts"] = { data: [], error: null };

      const res = await GET(createReq());
      const body = await res.json();
      expect(body.broadcastStats).toEqual([]);
    });
  });

  // =============================================
  // recentMessages
  // =============================================
  describe("最新メッセージ", () => {
    it("patient_name が解決される", async () => {
      mockFetchResponses = Array(7).fill(null).map(() => ({
        ok: true,
        json: async () => ({ status: "ready", followers: 50, targetedReaches: 40, blocks: 2 }),
      }));
      mockResultsByTable["message_log"] = {
        data: [
          { id: 1, patient_id: "P-100", message_type: "individual", content: "確認", status: "sent", sent_at: "2026-02-23T09:00:00Z" },
        ],
        error: null,
        count: 1,
      };
      mockResultsByTable["patients"] = {
        data: [{ patient_id: "P-100", name: "鈴木花子" }],
        error: null,
      };
      mockResultsByTable["line_daily_stats"] = { data: [], error: null };
      mockResultsByTable["broadcasts"] = { data: [], error: null };

      const res = await GET(createReq());
      const body = await res.json();

      expect(body.recentMessages).toHaveLength(1);
      expect(body.recentMessages[0].patient_name).toBe("鈴木花子");
    });

    it("患者名がない場合は patient_id を表示", async () => {
      mockFetchResponses = Array(7).fill(null).map(() => ({
        ok: true,
        json: async () => ({ status: "ready", followers: 50, targetedReaches: 40, blocks: 2 }),
      }));
      mockResultsByTable["message_log"] = {
        data: [
          { id: 1, patient_id: "P-UNKNOWN", message_type: "individual", content: "テスト", status: "sent", sent_at: "2026-02-23T09:00:00Z" },
        ],
        error: null,
        count: 1,
      };
      // patients テーブルにはこの患者がいない
      mockResultsByTable["patients"] = { data: [], error: null };
      mockResultsByTable["line_daily_stats"] = { data: [], error: null };
      mockResultsByTable["broadcasts"] = { data: [], error: null };

      const res = await GET(createReq());
      const body = await res.json();

      expect(body.recentMessages[0].patient_name).toBe("P-UNKNOWN");
    });
  });
});
