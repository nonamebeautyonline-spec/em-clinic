// __tests__/api/karte-templates.test.ts
// カルテテンプレート CRUD API（205行）のテスト
// 対象: app/api/admin/karte-templates/route.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- チェーン生成ヘルパー ---
function createChain(defaultResolve = { data: [], error: null, count: 0 }) {
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

const mockChain = createChain();

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn(() => mockChain),
  },
}));

vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  withTenant: vi.fn((q: any) => q),
  tenantPayload: vi.fn(() => ({ tenant_id: "test-tenant" })),
}));

// parseBody をモック（Zodバリデーション）
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

import { GET, POST, PUT, DELETE } from "@/app/api/admin/karte-templates/route";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { parseBody } from "@/lib/validations/helpers";

describe("カルテテンプレートCRUD API (karte-templates/route.ts)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (verifyAdminAuth as any).mockResolvedValue(true);

    // チェーンリセット
    [
      "insert", "update", "delete", "select", "eq", "neq", "gt", "gte", "lt", "lte",
      "in", "is", "not", "order", "limit", "range", "single", "maybeSingle", "upsert",
      "ilike", "or", "count", "csv",
    ].forEach(m => {
      mockChain[m] = vi.fn().mockReturnValue(mockChain);
    });
    mockChain.then = vi.fn((resolve: any) => resolve({ data: [], error: null, count: 0 }));
  });

  // ========================================
  // GET: 一覧取得
  // ========================================
  describe("GET: テンプレート一覧取得", () => {
    it("認証失敗 → 401", async () => {
      (verifyAdminAuth as any).mockResolvedValue(false);
      const req = createMockRequest("GET", "http://localhost/api/admin/karte-templates");
      const res = await GET(req);
      expect(res.status).toBe(401);
    });

    it("テンプレートが存在 → 正常取得", async () => {
      const templates = [
        { id: 1, name: "日時", category: "general", body: "{{date}}", sort_order: 1, is_active: true },
        { id: 2, name: "副作用説明", category: "glp1", body: "嘔気...", sort_order: 2, is_active: true },
      ];
      mockChain.then = vi.fn((resolve: any) => resolve({ data: templates, error: null }));

      const req = createMockRequest("GET", "http://localhost/api/admin/karte-templates");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.templates).toEqual(templates);
      expect(json.fromDefaults).toBeUndefined();
    });

    it("テンプレート0件 → デフォルト8個返却", async () => {
      mockChain.then = vi.fn((resolve: any) => resolve({ data: [], error: null }));

      const req = createMockRequest("GET", "http://localhost/api/admin/karte-templates");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.fromDefaults).toBe(true);
      expect(json.templates).toHaveLength(8);
      // デフォルトテンプレートの中身確認
      expect(json.templates[0].name).toBe("日時");
      expect(json.templates[0].body).toBe("{{date}}");
    });

    it("テーブル未存在エラー → デフォルト8個返却", async () => {
      mockChain.then = vi.fn((resolve: any) => resolve({
        data: null,
        error: { message: 'relation "karte_templates" does not exist' },
      }));

      const req = createMockRequest("GET", "http://localhost/api/admin/karte-templates");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.fromDefaults).toBe(true);
      expect(json.templates).toHaveLength(8);
    });

    it("テーブル存在するがDBエラー → 500", async () => {
      mockChain.then = vi.fn((resolve: any) => resolve({
        data: null,
        error: { message: "connection refused" },
      }));

      const req = createMockRequest("GET", "http://localhost/api/admin/karte-templates");
      const res = await GET(req);
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toBe("connection refused");
    });

    it("data=null → デフォルト返却", async () => {
      mockChain.then = vi.fn((resolve: any) => resolve({ data: null, error: null }));

      const req = createMockRequest("GET", "http://localhost/api/admin/karte-templates");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.fromDefaults).toBe(true);
    });
  });

  // ========================================
  // POST: テンプレート作成
  // ========================================
  describe("POST: テンプレート作成", () => {
    it("認証失敗 → 401", async () => {
      (verifyAdminAuth as any).mockResolvedValue(false);
      const req = createMockRequest("POST", "http://localhost/api/admin/karte-templates", {
        name: "テスト", body: "テスト本文",
      });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it("正常作成 → ok=true", async () => {
      const newTemplate = { id: 10, name: "テスト", body: "テスト本文", category: "general", sort_order: 0 };
      (parseBody as any).mockResolvedValue({
        data: { name: "テスト", body: "テスト本文", category: "general", sort_order: 0 },
      });

      // insert→select→single チェーン
      mockChain.single = vi.fn().mockResolvedValue({ data: newTemplate, error: null });

      const req = createMockRequest("POST", "http://localhost/api/admin/karte-templates", {
        name: "テスト", body: "テスト本文",
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.template).toEqual(newTemplate);
    });

    it("バリデーションエラー → parseBody がエラーレスポンスを返す", async () => {
      const { NextResponse } = await import("next/server");
      (parseBody as any).mockResolvedValue({
        error: NextResponse.json({ ok: false, error: "入力値が不正です" }, { status: 400 }),
      });

      const req = createMockRequest("POST", "http://localhost/api/admin/karte-templates", {});
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("DB挿入エラー → 500", async () => {
      (parseBody as any).mockResolvedValue({
        data: { name: "テスト", body: "テスト本文" },
      });
      mockChain.single = vi.fn().mockResolvedValue({ data: null, error: { message: "Insert failed" } });

      const req = createMockRequest("POST", "http://localhost/api/admin/karte-templates", {
        name: "テスト", body: "テスト本文",
      });
      const res = await POST(req);
      expect(res.status).toBe(500);
    });
  });

  // ========================================
  // PUT: テンプレート更新
  // ========================================
  describe("PUT: テンプレート更新", () => {
    it("認証失敗 → 401", async () => {
      (verifyAdminAuth as any).mockResolvedValue(false);
      const req = createMockRequest("PUT", "http://localhost/api/admin/karte-templates", { id: 1 });
      const res = await PUT(req);
      expect(res.status).toBe(401);
    });

    it("正常更新 → ok=true", async () => {
      const updatedTemplate = { id: 1, name: "更新済み", body: "更新本文", category: "general", sort_order: 1 };
      (parseBody as any).mockResolvedValue({
        data: { id: 1, name: "更新済み", body: "更新本文" },
      });

      // update→eq→select→withTenant→single チェーン
      mockChain.single = vi.fn().mockResolvedValue({ data: updatedTemplate, error: null });

      const req = createMockRequest("PUT", "http://localhost/api/admin/karte-templates", {
        id: 1, name: "更新済み", body: "更新本文",
      });
      const res = await PUT(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.template).toEqual(updatedTemplate);
    });

    it("バリデーションエラー → 400", async () => {
      const { NextResponse } = await import("next/server");
      (parseBody as any).mockResolvedValue({
        error: NextResponse.json({ ok: false, error: "入力値が不正です" }, { status: 400 }),
      });

      const req = createMockRequest("PUT", "http://localhost/api/admin/karte-templates", {});
      const res = await PUT(req);
      expect(res.status).toBe(400);
    });

    it("DB更新エラー → 500", async () => {
      (parseBody as any).mockResolvedValue({
        data: { id: 1, name: "更新済み" },
      });
      mockChain.single = vi.fn().mockResolvedValue({ data: null, error: { message: "Update failed" } });

      const req = createMockRequest("PUT", "http://localhost/api/admin/karte-templates", {
        id: 1, name: "更新済み",
      });
      const res = await PUT(req);
      expect(res.status).toBe(500);
    });

    it("部分更新: nameだけ → updated_at付きで更新", async () => {
      (parseBody as any).mockResolvedValue({
        data: { id: 1, name: "名前のみ更新" },
      });
      const result = { id: 1, name: "名前のみ更新", body: "元の本文" };
      mockChain.single = vi.fn().mockResolvedValue({ data: result, error: null });

      const req = createMockRequest("PUT", "http://localhost/api/admin/karte-templates", {
        id: 1, name: "名前のみ更新",
      });
      const res = await PUT(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.template.name).toBe("名前のみ更新");
    });
  });

  // ========================================
  // DELETE: テンプレート論理削除
  // ========================================
  describe("DELETE: テンプレート論理削除", () => {
    it("認証失敗 → 401", async () => {
      (verifyAdminAuth as any).mockResolvedValue(false);
      const req = createMockRequest("DELETE", "http://localhost/api/admin/karte-templates?id=1");
      const res = await DELETE(req);
      expect(res.status).toBe(401);
    });

    it("id指定なし → 400", async () => {
      const req = createMockRequest("DELETE", "http://localhost/api/admin/karte-templates");
      const res = await DELETE(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain("id");
    });

    it("正常削除 → ok=true（論理削除: is_active=false）", async () => {
      mockChain.then = vi.fn((resolve: any) => resolve({ data: null, error: null }));

      const req = createMockRequest("DELETE", "http://localhost/api/admin/karte-templates?id=5");
      const res = await DELETE(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
    });

    it("DB削除エラー → 500", async () => {
      mockChain.then = vi.fn((resolve: any) => resolve({
        data: null,
        error: { message: "Delete failed" },
      }));

      const req = createMockRequest("DELETE", "http://localhost/api/admin/karte-templates?id=5");
      const res = await DELETE(req);
      expect(res.status).toBe(500);
    });
  });

  // ========================================
  // デフォルトテンプレートの中身確認
  // ========================================
  describe("デフォルトテンプレートの品質", () => {
    it("デフォルトテンプレートが8個あり、全てにid/name/body/categoryがある", async () => {
      mockChain.then = vi.fn((resolve: any) => resolve({ data: [], error: null }));

      const req = createMockRequest("GET", "http://localhost/api/admin/karte-templates");
      const res = await GET(req);
      const json = await res.json();

      expect(json.templates).toHaveLength(8);
      for (const t of json.templates) {
        expect(t).toHaveProperty("id");
        expect(t).toHaveProperty("name");
        expect(t).toHaveProperty("body");
        expect(t).toHaveProperty("category");
        expect(t).toHaveProperty("sort_order");
      }
    });

    it("デフォルトテンプレートのカテゴリが正しい", async () => {
      mockChain.then = vi.fn((resolve: any) => resolve({ data: [], error: null }));

      const req = createMockRequest("GET", "http://localhost/api/admin/karte-templates");
      const res = await GET(req);
      const json = await res.json();

      const categories = json.templates.map((t: any) => t.category);
      expect(categories).toContain("general");
      expect(categories).toContain("glp1");
      expect(categories).toContain("measurement");
    });
  });
});
