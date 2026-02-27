// __tests__/api/ab-test.test.ts
// ABテスト管理API のテスト
// 対象: app/api/admin/line/ab-test/route.ts, app/api/admin/line/ab-test/[id]/route.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- チェーンモック ---
function createChain(defaultResolve = { data: null, error: null }) {
  const chain: any = {};
  [
    "insert", "update", "delete", "select", "eq", "neq", "gt", "gte", "lt", "lte",
    "in", "is", "not", "order", "limit", "range", "single", "maybeSingle", "upsert",
    "ilike", "or", "count", "csv",
  ].forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.then = vi.fn((resolve: any) => resolve(defaultResolve));
  return chain;
}

let tableChains: Record<string, any> = {};
function getOrCreateChain(table: string) {
  if (!tableChains[table]) tableChains[table] = createChain();
  return tableChains[table];
}

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: { from: vi.fn((table: string) => getOrCreateChain(table)) },
}));

vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  withTenant: vi.fn((q: any) => q),
  tenantPayload: vi.fn(() => ({ tenant_id: "test-tenant" })),
}));

vi.mock("@/lib/validations/helpers", () => ({
  parseBody: vi.fn(),
}));

vi.mock("@/lib/ab-test-stats", () => ({
  determineWinner: vi.fn().mockReturnValue({
    winnerId: "variant-a-id",
    winnerName: "A",
    reason: "Aが開封率で統計的に有意に優れています",
    significant: true,
    pValue: 0.01,
    rates: [],
  }),
}));

function createMockRequest(method: string, url: string, body?: any) {
  return {
    method,
    url,
    nextUrl: { searchParams: new URL(url).searchParams },
    cookies: { get: vi.fn(() => undefined) },
    headers: { get: vi.fn(() => null) },
    json: body ? vi.fn().mockResolvedValue(body) : vi.fn(),
  } as any;
}

import { GET, POST } from "@/app/api/admin/line/ab-test/route";
import { GET as GET_DETAIL, PUT as PUT_DETAIL, DELETE as DELETE_DETAIL } from "@/app/api/admin/line/ab-test/[id]/route";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { parseBody } from "@/lib/validations/helpers";

// ========================================
// 一覧・作成 (ab-test/route.ts)
// ========================================
describe("ABテストAPI (ab-test/route.ts)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableChains = {};
    (verifyAdminAuth as any).mockResolvedValue(true);
  });

  // --- GET ---
  describe("GET: テスト一覧取得", () => {
    it("認証失敗で 401", async () => {
      (verifyAdminAuth as any).mockResolvedValue(false);
      const req = createMockRequest("GET", "http://localhost/api/admin/line/ab-test");
      const res = await GET(req);
      expect(res.status).toBe(401);
    });

    it("正常取得で tests 配列を返す", async () => {
      const mockTests = [
        { id: "test-1", name: "テスト1", status: "draft", ab_test_variants: [] },
      ];
      tableChains["ab_tests"] = createChain({ data: mockTests, error: null });
      const req = createMockRequest("GET", "http://localhost/api/admin/line/ab-test");
      const res = await GET(req);
      const json = await res.json();
      expect(res.status).toBe(200);
      expect(json.tests).toEqual(mockTests);
    });

    it("DB エラーで 500", async () => {
      tableChains["ab_tests"] = createChain({ data: null, error: { message: "DB error" } });
      const req = createMockRequest("GET", "http://localhost/api/admin/line/ab-test");
      const res = await GET(req);
      expect(res.status).toBe(500);
    });
  });

  // --- POST ---
  describe("POST: テスト新規作成", () => {
    it("認証失敗で 401", async () => {
      (verifyAdminAuth as any).mockResolvedValue(false);
      const req = createMockRequest("POST", "http://localhost/api/admin/line/ab-test");
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it("バリデーションエラーで 400", async () => {
      const errorResp = { status: 400, json: async () => ({ error: "入力値が不正" }) };
      (parseBody as any).mockResolvedValue({ error: errorResp });
      const req = createMockRequest("POST", "http://localhost/api/admin/line/ab-test");
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("配分比率合計が100%でないとき 400", async () => {
      (parseBody as any).mockResolvedValue({
        data: {
          name: "テスト",
          winner_criteria: "open_rate",
          auto_select_winner: true,
          min_sample_size: 100,
          variants: [
            { name: "A", allocation_ratio: 30, message_type: "text" },
            { name: "B", allocation_ratio: 30, message_type: "text" },
          ],
        },
      });
      const req = createMockRequest("POST", "http://localhost/api/admin/line/ab-test");
      const res = await POST(req);
      const json = await res.json();
      expect(res.status).toBe(400);
      expect(json.error).toContain("100%");
    });

    it("正常作成", async () => {
      (parseBody as any).mockResolvedValue({
        data: {
          name: "ABテスト 3月",
          winner_criteria: "open_rate",
          auto_select_winner: true,
          min_sample_size: 100,
          variants: [
            { name: "A", allocation_ratio: 50, message_content: "メッセージA", message_type: "text" },
            { name: "B", allocation_ratio: 50, message_content: "メッセージB", message_type: "text" },
          ],
        },
      });
      tableChains["ab_tests"] = createChain({
        data: { id: "test-1", name: "ABテスト 3月", status: "draft" },
        error: null,
      });
      tableChains["ab_test_variants"] = createChain({
        data: [
          { id: "v-a", name: "A", allocation_ratio: 50 },
          { id: "v-b", name: "B", allocation_ratio: 50 },
        ],
        error: null,
      });
      const req = createMockRequest("POST", "http://localhost/api/admin/line/ab-test");
      const res = await POST(req);
      const json = await res.json();
      expect(res.status).toBe(200);
      expect(json.test.name).toBe("ABテスト 3月");
    });

    it("テスト作成DBエラーで 500", async () => {
      (parseBody as any).mockResolvedValue({
        data: {
          name: "テスト",
          winner_criteria: "open_rate",
          auto_select_winner: true,
          min_sample_size: 100,
          variants: [
            { name: "A", allocation_ratio: 50, message_type: "text" },
            { name: "B", allocation_ratio: 50, message_type: "text" },
          ],
        },
      });
      tableChains["ab_tests"] = createChain({ data: null, error: { message: "DB error" } });
      const req = createMockRequest("POST", "http://localhost/api/admin/line/ab-test");
      const res = await POST(req);
      expect(res.status).toBe(500);
    });

    it("バリアント作成DBエラーでロールバック", async () => {
      (parseBody as any).mockResolvedValue({
        data: {
          name: "テスト",
          winner_criteria: "open_rate",
          auto_select_winner: true,
          min_sample_size: 100,
          variants: [
            { name: "A", allocation_ratio: 50, message_type: "text" },
            { name: "B", allocation_ratio: 50, message_type: "text" },
          ],
        },
      });
      tableChains["ab_tests"] = createChain({
        data: { id: "test-1", name: "テスト", status: "draft" },
        error: null,
      });
      tableChains["ab_test_variants"] = createChain({
        data: null,
        error: { message: "variant error" },
      });
      const req = createMockRequest("POST", "http://localhost/api/admin/line/ab-test");
      const res = await POST(req);
      expect(res.status).toBe(500);
      // テストレコード削除（ロールバック）が呼ばれている
      expect(tableChains["ab_tests"].delete).toHaveBeenCalled();
    });
  });
});

// ========================================
// 詳細・更新・削除 (ab-test/[id]/route.ts)
// ========================================
describe("ABテストAPI (ab-test/[id]/route.ts)", () => {
  const ctxFactory = (id: string) => ({ params: Promise.resolve({ id }) });

  beforeEach(() => {
    vi.clearAllMocks();
    tableChains = {};
    (verifyAdminAuth as any).mockResolvedValue(true);
  });

  // --- GET ---
  describe("GET: テスト詳細取得", () => {
    it("認証失敗で 401", async () => {
      (verifyAdminAuth as any).mockResolvedValue(false);
      const req = createMockRequest("GET", "http://localhost/api/admin/line/ab-test/test-1");
      const res = await GET_DETAIL(req, ctxFactory("test-1"));
      expect(res.status).toBe(401);
    });

    it("テストが見つからないとき 404", async () => {
      tableChains["ab_tests"] = createChain({ data: null, error: { message: "not found" } });
      const req = createMockRequest("GET", "http://localhost/api/admin/line/ab-test/test-1");
      const res = await GET_DETAIL(req, ctxFactory("test-1"));
      expect(res.status).toBe(404);
    });

    it("正常取得でバリアントと統計情報を含む", async () => {
      const mockTest = {
        id: "test-1",
        name: "テスト1",
        status: "running",
        winner_criteria: "open_rate",
        ab_test_variants: [
          { id: "v-a", name: "A", sent_count: 100, open_count: 30, click_count: 10, conversion_count: 5 },
          { id: "v-b", name: "B", sent_count: 100, open_count: 20, click_count: 5, conversion_count: 2 },
        ],
      };
      tableChains["ab_tests"] = createChain({ data: mockTest, error: null });
      const req = createMockRequest("GET", "http://localhost/api/admin/line/ab-test/test-1");
      const res = await GET_DETAIL(req, ctxFactory("test-1"));
      const json = await res.json();
      expect(res.status).toBe(200);
      expect(json.test).toBeDefined();
      expect(json.stats).toBeDefined();
    });
  });

  // --- PUT ---
  describe("PUT: テスト更新", () => {
    it("認証失敗で 401", async () => {
      (verifyAdminAuth as any).mockResolvedValue(false);
      const req = createMockRequest("PUT", "http://localhost/api/admin/line/ab-test/test-1");
      const res = await PUT_DETAIL(req, ctxFactory("test-1"));
      expect(res.status).toBe(401);
    });

    it("バリデーションエラーで 400", async () => {
      const errorResp = { status: 400, json: async () => ({ error: "入力値が不正" }) };
      (parseBody as any).mockResolvedValue({ error: errorResp });
      const req = createMockRequest("PUT", "http://localhost/api/admin/line/ab-test/test-1");
      const res = await PUT_DETAIL(req, ctxFactory("test-1"));
      expect(res.status).toBe(400);
    });

    it("テストが見つからないとき 404", async () => {
      (parseBody as any).mockResolvedValue({ data: { status: "running" } });
      tableChains["ab_tests"] = createChain({ data: null, error: null });
      const req = createMockRequest("PUT", "http://localhost/api/admin/line/ab-test/test-1");
      const res = await PUT_DETAIL(req, ctxFactory("test-1"));
      expect(res.status).toBe(404);
    });

    it("無効なステータス遷移で 400", async () => {
      (parseBody as any).mockResolvedValue({ data: { status: "running" } });
      // completed → running は不可
      tableChains["ab_tests"] = createChain({
        data: { id: "test-1", status: "completed", auto_select_winner: false },
        error: null,
      });
      const req = createMockRequest("PUT", "http://localhost/api/admin/line/ab-test/test-1");
      const res = await PUT_DETAIL(req, ctxFactory("test-1"));
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain("変更できません");
    });

    it("draft → running は正常更新", async () => {
      (parseBody as any).mockResolvedValue({ data: { status: "running" } });
      // 最初のsingle: 既存テスト取得
      const testChain = createChain({
        data: { id: "test-1", status: "draft", auto_select_winner: false, winner_criteria: "open_rate" },
        error: null,
      });
      tableChains["ab_tests"] = testChain;
      const req = createMockRequest("PUT", "http://localhost/api/admin/line/ab-test/test-1");
      const res = await PUT_DETAIL(req, ctxFactory("test-1"));
      // updateが呼ばれている
      expect(testChain.update).toHaveBeenCalled();
    });
  });

  // --- DELETE ---
  describe("DELETE: テスト削除", () => {
    it("認証失敗で 401", async () => {
      (verifyAdminAuth as any).mockResolvedValue(false);
      const req = createMockRequest("DELETE", "http://localhost/api/admin/line/ab-test/test-1");
      const res = await DELETE_DETAIL(req, ctxFactory("test-1"));
      expect(res.status).toBe(401);
    });

    it("テストが見つからないとき 404", async () => {
      tableChains["ab_tests"] = createChain({ data: null, error: null });
      const req = createMockRequest("DELETE", "http://localhost/api/admin/line/ab-test/test-1");
      const res = await DELETE_DETAIL(req, ctxFactory("test-1"));
      expect(res.status).toBe(404);
    });

    it("実行中のテストは削除不可（400）", async () => {
      tableChains["ab_tests"] = createChain({ data: { id: "test-1", status: "running" }, error: null });
      const req = createMockRequest("DELETE", "http://localhost/api/admin/line/ab-test/test-1");
      const res = await DELETE_DETAIL(req, ctxFactory("test-1"));
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain("実行中");
    });

    it("下書きのテストは正常削除", async () => {
      const testChain = createChain({ data: { id: "test-1", status: "draft" }, error: null });
      tableChains["ab_tests"] = testChain;
      const req = createMockRequest("DELETE", "http://localhost/api/admin/line/ab-test/test-1");
      const res = await DELETE_DETAIL(req, ctxFactory("test-1"));
      const json = await res.json();
      expect(json.ok).toBe(true);
    });

    it("完了のテストは正常削除", async () => {
      const testChain = createChain({ data: { id: "test-1", status: "completed" }, error: null });
      tableChains["ab_tests"] = testChain;
      const req = createMockRequest("DELETE", "http://localhost/api/admin/line/ab-test/test-1");
      const res = await DELETE_DETAIL(req, ctxFactory("test-1"));
      const json = await res.json();
      expect(json.ok).toBe(true);
    });
  });
});

// ========================================
// ソースコードレベルのチェック
// ========================================
describe("ABテストAPI: ソースコード品質チェック", () => {
  const fs = require("fs");
  const path = require("path");

  function readSource(relativePath: string): string {
    return fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf-8");
  }

  const routes = [
    { file: "app/api/admin/line/ab-test/route.ts", name: "ab-test/route.ts" },
    { file: "app/api/admin/line/ab-test/[id]/route.ts", name: "ab-test/[id]/route.ts" },
  ];

  for (const { file, name } of routes) {
    it(`${name} は verifyAdminAuth で認証している`, () => {
      const src = readSource(file);
      expect(src).toContain("verifyAdminAuth");
    });

    it(`${name} は resolveTenantId を使用している`, () => {
      const src = readSource(file);
      expect(src).toContain("resolveTenantId");
    });

    it(`${name} は supabaseAdmin を使用している`, () => {
      const src = readSource(file);
      expect(src).toContain("supabaseAdmin");
    });

    it(`${name} は 401 レスポンスを返す`, () => {
      const src = readSource(file);
      expect(src).toContain("401");
    });
  }

  it("統計ライブラリが存在する", () => {
    const src = readSource("lib/ab-test-stats.ts");
    expect(src).toContain("chiSquareTest");
    expect(src).toContain("calculateSignificance");
    expect(src).toContain("determineWinner");
  });

  it("[id]/route.ts が determineWinner を使用している", () => {
    const src = readSource("app/api/admin/line/ab-test/[id]/route.ts");
    expect(src).toContain("determineWinner");
  });
});
