// __tests__/api/line-step-scenarios.test.ts
// ステップ配信シナリオ CRUD API のテスト
// 対象: app/api/admin/line/step-scenarios/route.ts
import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

// --- Supabaseチェーンの型定義 ---
interface SupabaseChain {
  insert: Mock;
  update: Mock;
  delete: Mock;
  select: Mock;
  eq: Mock;
  neq: Mock;
  gt: Mock;
  gte: Mock;
  lt: Mock;
  lte: Mock;
  in: Mock;
  is: Mock;
  not: Mock;
  order: Mock;
  limit: Mock;
  range: Mock;
  single: Mock;
  maybeSingle: Mock;
  upsert: Mock;
  ilike: Mock;
  or: Mock;
  count: Mock;
  csv: Mock;
  then: Mock;
}

interface ChainResolveResult {
  data: unknown;
  error: unknown;
}

// --- チェーンモック ---
function createChain(defaultResolve: ChainResolveResult = { data: null, error: null }): SupabaseChain {
  const chain = {} as SupabaseChain;
  (["insert","update","delete","select","eq","neq","gt","gte","lt","lte",
   "in","is","not","order","limit","range","single","maybeSingle","upsert",
   "ilike","or","count","csv"] as const).forEach(m => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.then = vi.fn((resolve: (val: ChainResolveResult) => void) => resolve(defaultResolve));
  return chain;
}

let tableChains: Record<string, SupabaseChain> = {};
function getOrCreateChain(table: string): SupabaseChain {
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
  withTenant: vi.fn((q: SupabaseChain) => q),
  tenantPayload: vi.fn(() => ({ tenant_id: "test-tenant" })),
}));

// parseBody をモック
vi.mock("@/lib/validations/helpers", () => ({
  parseBody: vi.fn(),
}));

interface MockRequest {
  method: string;
  url: string;
  nextUrl: { searchParams: URLSearchParams };
  cookies: { get: Mock };
  headers: { get: Mock };
  json: Mock;
}

function createMockRequest(method: string, url: string, body?: Record<string, unknown>): MockRequest {
  return {
    method,
    url,
    nextUrl: { searchParams: new URL(url).searchParams },
    cookies: { get: vi.fn(() => undefined) },
    headers: { get: vi.fn(() => null) },
    json: body ? vi.fn().mockResolvedValue(body) : vi.fn(),
  };
}

import { GET, POST, PUT, DELETE } from "@/app/api/admin/line/step-scenarios/route";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { parseBody } from "@/lib/validations/helpers";

describe("ステップ配信シナリオAPI (step-scenarios/route.ts)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableChains = {};
    vi.mocked(verifyAdminAuth).mockResolvedValue(true);
  });

  // ========================================
  // GET: シナリオ一覧
  // ========================================
  describe("GET: シナリオ一覧取得", () => {
    it("認証失敗 → 401", async () => {
      vi.mocked(verifyAdminAuth).mockResolvedValue(false);
      const req = createMockRequest("GET", "http://localhost/api/admin/line/step-scenarios");
      const res = await GET(req as unknown as Parameters<typeof GET>[0]);
      expect(res.status).toBe(401);
    });

    it("正常取得 → ステップ数付きで返す", async () => {
      tableChains["step_scenarios"] = createChain({
        data: [
          {
            id: 1, name: "フォロー後シナリオ",
            step_items: [{ count: 3 }],
            trigger_tag: { id: 10, name: "新規", color: "#ff0000" },
          },
          {
            id: 2, name: "タグ付与シナリオ",
            step_items: [{ count: 0 }],
            trigger_tag: null,
          },
        ],
        error: null,
      });

      const req = createMockRequest("GET", "http://localhost/api/admin/line/step-scenarios");
      const res = await GET(req as unknown as Parameters<typeof GET>[0]);
      const json = await res.json();
      expect(res.status).toBe(200);
      expect(json.scenarios).toHaveLength(2);
      expect(json.scenarios[0].step_count).toBe(3);
      expect(json.scenarios[1].step_count).toBe(0);
      expect(json.scenarios[0].trigger_tag).toEqual({ id: 10, name: "新規", color: "#ff0000" });
    });

    it("DBエラー → 500", async () => {
      tableChains["step_scenarios"] = createChain({ data: null, error: { message: "DB error" } });
      const req = createMockRequest("GET", "http://localhost/api/admin/line/step-scenarios");
      const res = await GET(req as unknown as Parameters<typeof GET>[0]);
      expect(res.status).toBe(500);
    });
  });

  // ========================================
  // POST: シナリオ新規作成
  // ========================================
  describe("POST: シナリオ作成", () => {
    it("認証失敗 → 401", async () => {
      vi.mocked(verifyAdminAuth).mockResolvedValue(false);
      const req = createMockRequest("POST", "http://localhost/api/admin/line/step-scenarios");
      const res = await POST(req as unknown as Parameters<typeof POST>[0]);
      expect(res.status).toBe(401);
    });

    it("バリデーション失敗 → parseBody のエラーレスポンス", async () => {
      const mockErrorResponse = new Response(JSON.stringify({ ok: false, error: "入力値が不正です" }), { status: 400 });
      vi.mocked(parseBody).mockResolvedValue({ error: mockErrorResponse } as { data?: never; error: Response });

      const req = createMockRequest("POST", "http://localhost/api/admin/line/step-scenarios");
      const res = await POST(req as unknown as Parameters<typeof POST>[0]);
      expect(res.status).toBe(400);
    });

    it("正常作成（ステップなし）", async () => {
      vi.mocked(parseBody).mockResolvedValue({
        data: {
          name: "テストシナリオ",
          folder_id: null,
          trigger_type: "follow",
          trigger_tag_id: null,
          trigger_keyword: null,
          trigger_keyword_match: "partial",
          condition_rules: [],
          is_enabled: true,
          steps: [],
        },
      } as { data: Record<string, unknown> });

      tableChains["step_scenarios"] = createChain({
        data: { id: 1, name: "テストシナリオ" },
        error: null,
      });

      const req = createMockRequest("POST", "http://localhost/api/admin/line/step-scenarios");
      const res = await POST(req as unknown as Parameters<typeof POST>[0]);
      const json = await res.json();
      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.scenario.name).toBe("テストシナリオ");
    });

    it("正常作成（ステップあり）", async () => {
      vi.mocked(parseBody).mockResolvedValue({
        data: {
          name: "ステップ付きシナリオ",
          folder_id: null,
          trigger_type: "follow",
          trigger_tag_id: null,
          trigger_keyword: null,
          trigger_keyword_match: "partial",
          condition_rules: [],
          is_enabled: true,
          steps: [
            { delay_type: "days", delay_value: 1, step_type: "send_text", content: "テスト" },
          ],
        },
      } as { data: Record<string, unknown> });

      tableChains["step_scenarios"] = createChain({
        data: { id: 1, name: "ステップ付きシナリオ" },
        error: null,
      });
      tableChains["step_items"] = createChain({ data: null, error: null });

      const req = createMockRequest("POST", "http://localhost/api/admin/line/step-scenarios");
      const res = await POST(req as unknown as Parameters<typeof POST>[0]);
      const json = await res.json();
      expect(json.ok).toBe(true);
    });

    it("DBエラー → 500", async () => {
      vi.mocked(parseBody).mockResolvedValue({
        data: { name: "テスト", steps: [] },
      } as { data: Record<string, unknown> });
      tableChains["step_scenarios"] = createChain({ data: null, error: { message: "insert error" } });

      const req = createMockRequest("POST", "http://localhost/api/admin/line/step-scenarios");
      const res = await POST(req as unknown as Parameters<typeof POST>[0]);
      expect(res.status).toBe(500);
    });
  });

  // ========================================
  // PUT: シナリオ更新
  // ========================================
  describe("PUT: シナリオ更新", () => {
    it("認証失敗 → 401", async () => {
      vi.mocked(verifyAdminAuth).mockResolvedValue(false);
      const req = createMockRequest("PUT", "http://localhost/api/admin/line/step-scenarios");
      const res = await PUT(req as unknown as Parameters<typeof PUT>[0]);
      expect(res.status).toBe(401);
    });

    it("IDなし → 400", async () => {
      vi.mocked(parseBody).mockResolvedValue({
        data: { name: "テスト" }, // id なし
      } as { data: Record<string, unknown> });

      const req = createMockRequest("PUT", "http://localhost/api/admin/line/step-scenarios");
      const res = await PUT(req as unknown as Parameters<typeof PUT>[0]);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("IDは必須です");
    });

    it("正常更新（ステップ再挿入）", async () => {
      vi.mocked(parseBody).mockResolvedValue({
        data: {
          id: 1,
          name: "更新後シナリオ",
          folder_id: null,
          trigger_type: "tag",
          trigger_tag_id: 10,
          trigger_keyword: null,
          trigger_keyword_match: "partial",
          condition_rules: [],
          is_enabled: true,
          steps: [
            { delay_type: "days", delay_value: 2, step_type: "send_text", content: "更新" },
          ],
        },
      } as { data: Record<string, unknown> });

      tableChains["step_scenarios"] = createChain({
        data: { id: 1, name: "更新後シナリオ" },
        error: null,
      });
      tableChains["step_items"] = createChain({ data: null, error: null });

      const req = createMockRequest("PUT", "http://localhost/api/admin/line/step-scenarios");
      const res = await PUT(req as unknown as Parameters<typeof PUT>[0]);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.scenario.name).toBe("更新後シナリオ");
    });

    it("DBエラー → 500", async () => {
      vi.mocked(parseBody).mockResolvedValue({
        data: { id: 1, name: "テスト", steps: [] },
      } as { data: Record<string, unknown> });
      tableChains["step_scenarios"] = createChain({ data: null, error: { message: "update error" } });

      const req = createMockRequest("PUT", "http://localhost/api/admin/line/step-scenarios");
      const res = await PUT(req as unknown as Parameters<typeof PUT>[0]);
      expect(res.status).toBe(500);
    });
  });

  // ========================================
  // DELETE: シナリオ削除
  // ========================================
  describe("DELETE: シナリオ削除", () => {
    it("認証失敗 → 401", async () => {
      vi.mocked(verifyAdminAuth).mockResolvedValue(false);
      const req = createMockRequest("DELETE", "http://localhost/api/admin/line/step-scenarios?id=1");
      const res = await DELETE(req as unknown as Parameters<typeof DELETE>[0]);
      expect(res.status).toBe(401);
    });

    it("IDなし → 400", async () => {
      const req = createMockRequest("DELETE", "http://localhost/api/admin/line/step-scenarios");
      const res = await DELETE(req as unknown as Parameters<typeof DELETE>[0]);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("IDは必須です");
    });

    it("正常削除 → ok: true", async () => {
      tableChains["step_scenarios"] = createChain({ data: null, error: null });
      const req = createMockRequest("DELETE", "http://localhost/api/admin/line/step-scenarios?id=1");
      const res = await DELETE(req as unknown as Parameters<typeof DELETE>[0]);
      const json = await res.json();
      expect(json.ok).toBe(true);
    });

    it("DBエラー → 500", async () => {
      tableChains["step_scenarios"] = createChain({ data: null, error: { message: "delete error" } });
      const req = createMockRequest("DELETE", "http://localhost/api/admin/line/step-scenarios?id=1");
      const res = await DELETE(req as unknown as Parameters<typeof DELETE>[0]);
      expect(res.status).toBe(500);
    });
  });
});
