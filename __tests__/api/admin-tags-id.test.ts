// __tests__/api/admin-tags-id.test.ts
// タグ個別操作API (app/api/admin/tags/[id]/route.ts) のテスト
// GET: タグの患者一覧取得、PUT: タグ更新、DELETE: タグ削除
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── モック変数 ───
const mockVerifyAdminAuth = vi.fn();
const mockParseBody = vi.fn();

// ─── Supabaseチェーンモック（テーブル別） ───
type MockResult = { data: any; error?: any };
let mockResultsByTable: Record<string, MockResult[]> = {};

function createChain(table: string) {
  const chain: any = {};
  const methods = [
    "select", "eq", "neq", "in", "is", "not", "or",
    "ilike", "order", "limit", "single", "gte", "lte",
    "like", "range", "insert", "update", "delete", "maybeSingle",
  ];
  methods.forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });

  // range() の呼び出しでページネーション結果を返す
  let rangeCallCount = 0;
  chain.range.mockImplementation(() => {
    const results = mockResultsByTable[table] || [];
    const result = results[rangeCallCount] || { data: [], error: null };
    rangeCallCount++;
    return result;
  });

  // select().single() のチェーンで結果を返す
  chain.single.mockImplementation(() => {
    const results = mockResultsByTable[table] || [];
    return results[0] || { data: null, error: null };
  });

  // Promise として解決できるように（withTenant + await 対応）
  chain.then = (resolve: any, reject: any) => {
    const results = mockResultsByTable[table] || [];
    const result = results[0] || { data: null, error: null };
    return Promise.resolve(result).then(resolve, reject);
  };

  return chain;
}

vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: (...args: any[]) => mockVerifyAdminAuth(...args),
}));

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => createChain(table)),
  },
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => null),
  withTenant: vi.fn((q: any) => q),
}));

vi.mock("@/lib/validations/helpers", () => ({
  parseBody: (...args: any[]) => mockParseBody(...args),
}));

vi.mock("@/lib/validations/admin-operations", () => ({
  tagUpdateSchema: {},
}));

// ─── ルートインポート ───
import { GET, PUT, DELETE } from "@/app/api/admin/tags/[id]/route";

// ─── ヘルパー ───
function createMockRequest(method: string, url: string, body?: any) {
  const req = new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  return req as any;
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// テスト本体
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
describe("タグ個別API (app/api/admin/tags/[id]/route.ts)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyAdminAuth.mockResolvedValue(true);
    mockResultsByTable = {};
  });

  // ========================================
  // GET: タグの患者一覧取得
  // ========================================
  describe("GET: タグの患者一覧取得", () => {
    it("認証NG → 401", async () => {
      mockVerifyAdminAuth.mockResolvedValue(false);
      const req = createMockRequest("GET", "http://localhost/api/admin/tags/1");
      const res = await GET(req, makeParams("1"));
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe("Unauthorized");
    });

    it("patient_tagsが空 → patients空配列を返す", async () => {
      // patient_tags: ページネーション1回目が空
      mockResultsByTable["patient_tags"] = [
        { data: [], error: null },
      ];

      const req = createMockRequest("GET", "http://localhost/api/admin/tags/1");
      const res = await GET(req, makeParams("1"));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.patients).toEqual([]);
    });

    it("患者が紐付いている → patients配列が返る", async () => {
      // patient_tags: 2件
      mockResultsByTable["patient_tags"] = [
        {
          data: [
            { patient_id: "pid-001", assigned_at: "2026-01-01" },
            { patient_id: "pid-002", assigned_at: "2026-01-02" },
          ],
          error: null,
        },
        { data: [], error: null }, // ページネーション終了
      ];

      // patients: 名前を返す
      mockResultsByTable["patients"] = [
        {
          data: [
            { patient_id: "pid-001", name: "田中太郎", line_id: "U001" },
            { patient_id: "pid-002", name: "山田花子", line_id: null },
          ],
          error: null,
        },
      ];

      const req = createMockRequest("GET", "http://localhost/api/admin/tags/1");
      const res = await GET(req, makeParams("1"));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.patients).toHaveLength(2);
      expect(json.patients[0].patient_id).toBe("pid-001");
      expect(json.patients[0].patient_name).toBe("田中太郎");
      expect(json.patients[0].has_line).toBe(true);
      expect(json.patients[1].patient_id).toBe("pid-002");
      expect(json.patients[1].patient_name).toBe("山田花子");
      expect(json.patients[1].has_line).toBe(false);
    });

    it("patient_tagsのDBエラー → 500", async () => {
      mockResultsByTable["patient_tags"] = [
        { data: [], error: { message: "connection error" } },
      ];

      const req = createMockRequest("GET", "http://localhost/api/admin/tags/1");
      const res = await GET(req, makeParams("1"));
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toBe("connection error");
    });

    it("patientsに名前がない場合 → patient_idがpatient_nameにフォールバック", async () => {
      mockResultsByTable["patient_tags"] = [
        {
          data: [{ patient_id: "pid-unknown", assigned_at: "2026-01-01" }],
          error: null,
        },
        { data: [], error: null },
      ];

      // patientsテーブルに該当レコードなし
      mockResultsByTable["patients"] = [
        { data: [], error: null },
      ];

      const req = createMockRequest("GET", "http://localhost/api/admin/tags/1");
      const res = await GET(req, makeParams("1"));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.patients[0].patient_name).toBe("pid-unknown");
      expect(json.patients[0].has_line).toBe(false);
    });
  });

  // ========================================
  // PUT: タグ更新
  // ========================================
  describe("PUT: タグ更新", () => {
    it("認証NG → 401", async () => {
      mockVerifyAdminAuth.mockResolvedValue(false);
      const req = createMockRequest("PUT", "http://localhost/api/admin/tags/1", { name: "更新タグ" });
      const res = await PUT(req, makeParams("1"));
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe("Unauthorized");
    });

    it("バリデーションエラー → parseBodyのエラーレスポンスを返す", async () => {
      const errorResponse = new Response(
        JSON.stringify({ ok: false, error: "入力値が不正です", details: ["name: 必須"] }),
        { status: 400 },
      );
      mockParseBody.mockResolvedValueOnce({ error: errorResponse as any });

      const req = createMockRequest("PUT", "http://localhost/api/admin/tags/1", {});
      const res = await PUT(req, makeParams("1"));
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("入力値が不正です");
    });

    it("正常更新 → tagデータを返す", async () => {
      const updatedTag = { id: 1, name: "更新済み", color: "#0000FF", description: "説明" };
      mockParseBody.mockResolvedValueOnce({
        data: { name: "更新済み", color: "#0000FF", description: "説明" },
      });

      mockResultsByTable["tag_definitions"] = [
        { data: updatedTag, error: null },
      ];

      const req = createMockRequest("PUT", "http://localhost/api/admin/tags/1", {
        name: "更新済み",
        color: "#0000FF",
        description: "説明",
      });
      const res = await PUT(req, makeParams("1"));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.tag).toEqual(updatedTag);
    });

    it("DB更新エラー → 500", async () => {
      mockParseBody.mockResolvedValueOnce({
        data: { name: "テスト" },
      });

      mockResultsByTable["tag_definitions"] = [
        { data: null, error: { message: "update failed" } },
      ];

      const req = createMockRequest("PUT", "http://localhost/api/admin/tags/1", { name: "テスト" });
      const res = await PUT(req, makeParams("1"));
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toBe("update failed");
    });
  });

  // ========================================
  // DELETE: タグ削除
  // ========================================
  describe("DELETE: タグ削除", () => {
    it("認証NG → 401", async () => {
      mockVerifyAdminAuth.mockResolvedValue(false);
      const req = createMockRequest("DELETE", "http://localhost/api/admin/tags/1");
      const res = await DELETE(req, makeParams("1"));
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe("Unauthorized");
    });

    it("正常削除 → ok:true", async () => {
      mockResultsByTable["tag_definitions"] = [
        { data: null, error: null },
      ];

      const req = createMockRequest("DELETE", "http://localhost/api/admin/tags/1");
      const res = await DELETE(req, makeParams("1"));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
    });

    it("DB削除エラー → 500", async () => {
      mockResultsByTable["tag_definitions"] = [
        { data: null, error: { message: "delete failed" } },
      ];

      const req = createMockRequest("DELETE", "http://localhost/api/admin/tags/1");
      const res = await DELETE(req, makeParams("1"));
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toBe("delete failed");
    });
  });
});
