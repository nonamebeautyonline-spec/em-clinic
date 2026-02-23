// __tests__/api/admin-friend-fields.test.ts
// 友達情報欄 定義 CRUD API のテスト
// 対象: app/api/admin/friend-fields/route.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- チェーン生成ヘルパー ---
function createChain(defaultResolve = { data: null, error: null }) {
  const chain: any = {};
  [
    "insert", "update", "delete", "select", "eq", "neq", "gt", "gte", "lt", "lte",
    "in", "is", "not", "order", "limit", "range", "single", "maybeSingle", "upsert",
    "ilike", "or", "count", "csv",
  ].forEach(m => {
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

// NextRequest互換のモック
function createMockRequest(method: string, url: string, body?: any) {
  const parsedUrl = new URL(url);
  return {
    method,
    url,
    nextUrl: { searchParams: parsedUrl.searchParams },
    cookies: { get: vi.fn(() => undefined) },
    headers: { get: vi.fn(() => null) },
    json: body ? vi.fn().mockResolvedValue(body) : vi.fn(),
  } as any;
}

import { GET, POST } from "@/app/api/admin/friend-fields/route";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { parseBody } from "@/lib/validations/helpers";

describe("友達情報欄 定義 API (friend-fields/route.ts)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableChains = {};
    (verifyAdminAuth as any).mockResolvedValue(true);
  });

  // ========================================
  // GET: 定義一覧取得
  // ========================================
  describe("GET: 友達情報欄の定義一覧", () => {
    it("認証失敗 → 401", async () => {
      (verifyAdminAuth as any).mockResolvedValue(false);
      const req = createMockRequest("GET", "http://localhost/api/admin/friend-fields");
      const res = await GET(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe("Unauthorized");
    });

    it("正常取得 → fields 配列を返す", async () => {
      const mockFields = [
        { id: 1, name: "血液型", field_type: "select", options: ["A", "B", "O", "AB"], sort_order: 0 },
        { id: 2, name: "備考", field_type: "text", options: null, sort_order: 1 },
      ];
      const chain = createChain({ data: mockFields, error: null });
      tableChains["friend_field_definitions"] = chain;

      const req = createMockRequest("GET", "http://localhost/api/admin/friend-fields");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.fields).toEqual(mockFields);
    });

    it("sort_order 昇順で order が呼ばれる", async () => {
      const chain = createChain({ data: [], error: null });
      tableChains["friend_field_definitions"] = chain;

      const req = createMockRequest("GET", "http://localhost/api/admin/friend-fields");
      await GET(req);

      expect(chain.order).toHaveBeenCalledWith("sort_order", { ascending: true });
    });

    it("DBエラー → 500", async () => {
      const chain = createChain({ data: null, error: { message: "テーブルが存在しません" } });
      tableChains["friend_field_definitions"] = chain;

      const req = createMockRequest("GET", "http://localhost/api/admin/friend-fields");
      const res = await GET(req);
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toBe("テーブルが存在しません");
    });
  });

  // ========================================
  // POST: 定義作成
  // ========================================
  describe("POST: 友達情報欄の定義作成", () => {
    it("認証失敗 → 401", async () => {
      (verifyAdminAuth as any).mockResolvedValue(false);
      const req = createMockRequest("POST", "http://localhost/api/admin/friend-fields", {});
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it("バリデーションエラー → parseBody のエラーを返す", async () => {
      const errorResponse = new Response(JSON.stringify({ error: "入力値が不正です" }), { status: 400 });
      (parseBody as any).mockResolvedValue({ error: errorResponse });

      const req = createMockRequest("POST", "http://localhost/api/admin/friend-fields", {});
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("正常作成 → field オブジェクトを返す", async () => {
      const newField = {
        id: 3,
        name: "アレルギー",
        field_type: "text",
        options: null,
        sort_order: 0,
        tenant_id: "test-tenant",
      };
      (parseBody as any).mockResolvedValue({
        data: { name: " アレルギー ", field_type: "text", options: null, sort_order: 0 },
      });

      const chain = createChain({ data: newField, error: null });
      tableChains["friend_field_definitions"] = chain;

      const req = createMockRequest("POST", "http://localhost/api/admin/friend-fields", {});
      const res = await POST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.field).toEqual(newField);
    });

    it("name がトリムされる", async () => {
      (parseBody as any).mockResolvedValue({
        data: { name: "  カスタム欄  ", field_type: "text" },
      });

      const chain = createChain({ data: { id: 4 }, error: null });
      tableChains["friend_field_definitions"] = chain;

      const req = createMockRequest("POST", "http://localhost/api/admin/friend-fields", {});
      await POST(req);

      // insert に渡されるデータの name がトリムされている
      const insertArgs = chain.insert.mock.calls[0][0];
      expect(insertArgs.name).toBe("カスタム欄");
    });

    it("field_type 省略時 → デフォルトで 'text'", async () => {
      (parseBody as any).mockResolvedValue({
        data: { name: "メモ" },
      });

      const chain = createChain({ data: { id: 5 }, error: null });
      tableChains["friend_field_definitions"] = chain;

      const req = createMockRequest("POST", "http://localhost/api/admin/friend-fields", {});
      await POST(req);

      const insertArgs = chain.insert.mock.calls[0][0];
      expect(insertArgs.field_type).toBe("text");
    });

    it("sort_order 省略時 → デフォルトで 0", async () => {
      (parseBody as any).mockResolvedValue({
        data: { name: "メモ" },
      });

      const chain = createChain({ data: { id: 6 }, error: null });
      tableChains["friend_field_definitions"] = chain;

      const req = createMockRequest("POST", "http://localhost/api/admin/friend-fields", {});
      await POST(req);

      const insertArgs = chain.insert.mock.calls[0][0];
      expect(insertArgs.sort_order).toBe(0);
    });

    it("重複名エラー（23505） → 409", async () => {
      (parseBody as any).mockResolvedValue({
        data: { name: "既存フィールド" },
      });

      const chain = createChain({ data: null, error: { code: "23505", message: "duplicate key" } });
      tableChains["friend_field_definitions"] = chain;

      const req = createMockRequest("POST", "http://localhost/api/admin/friend-fields", {});
      const res = await POST(req);
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error).toBe("同じ名前のフィールドが既に存在します");
    });

    it("その他のDBエラー → 500", async () => {
      (parseBody as any).mockResolvedValue({
        data: { name: "テスト" },
      });

      const chain = createChain({ data: null, error: { code: "42P01", message: "relation does not exist" } });
      tableChains["friend_field_definitions"] = chain;

      const req = createMockRequest("POST", "http://localhost/api/admin/friend-fields", {});
      const res = await POST(req);
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toBe("relation does not exist");
    });

    it("tenantPayload が insert データに含まれる", async () => {
      (parseBody as any).mockResolvedValue({
        data: { name: "テスト欄" },
      });

      const chain = createChain({ data: { id: 7 }, error: null });
      tableChains["friend_field_definitions"] = chain;

      const req = createMockRequest("POST", "http://localhost/api/admin/friend-fields", {});
      await POST(req);

      const insertArgs = chain.insert.mock.calls[0][0];
      expect(insertArgs.tenant_id).toBe("test-tenant");
    });
  });
});
