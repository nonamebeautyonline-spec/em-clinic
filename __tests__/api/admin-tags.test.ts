// __tests__/api/admin-tags.test.ts
// タグ CRUD API (app/api/admin/tags/route.ts) のテスト
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- チェーンビルダー ---
function createChain(defaultResolve = { data: null, error: null }) {
  const chain: any = {};
  ["insert","update","delete","select","eq","neq","gt","gte","lt","lte",
   "in","is","not","order","limit","range","single","maybeSingle","upsert",
   "ilike","or","count","csv"].forEach(m => {
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

const { mockVerifyAdminAuth } = vi.hoisted(() => ({
  mockVerifyAdminAuth: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: { from: vi.fn((table: string) => getOrCreateChain(table)) },
}));

vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: mockVerifyAdminAuth,
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  withTenant: vi.fn((q: any) => q),
  tenantPayload: vi.fn(() => ({ tenantId: "test-tenant" })),
}));

// --- ヘルパー ---
function createGetRequest() {
  return new Request("http://localhost/api/admin/tags", { method: "GET" }) as any;
}

function createPostRequest(body: any) {
  return new Request("http://localhost/api/admin/tags", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as any;
}

import { GET, POST } from "@/app/api/admin/tags/route";

// =============================================
// GET テスト（タグ一覧取得）
// =============================================
describe("GET /api/admin/tags", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableChains = {};
    mockVerifyAdminAuth.mockResolvedValue(true);
  });

  it("認証失敗時は 401 を返す", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const req = createGetRequest();
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("正常にタグ一覧を返す（患者数付き）", async () => {
    // tag_definitions
    const tagDefsChain = createChain({
      data: [
        { id: 1, name: "VIP", color: "#FF0000", created_at: "2026-01-01" },
        { id: 2, name: "初診", color: "#00FF00", created_at: "2026-01-02" },
      ],
      error: null,
    });
    tableChains["tag_definitions"] = tagDefsChain;

    // patient_tags（ページネーション1回で完了するケース: 空配列を返す）
    const patientTagsChain = createChain({
      data: [
        { tag_id: 1 },
        { tag_id: 1 },
        { tag_id: 2 },
      ],
      error: null,
    });
    tableChains["patient_tags"] = patientTagsChain;

    const req = createGetRequest();
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.tags).toHaveLength(2);
    // VIPタグに2人の患者がいる
    expect(json.tags[0].patient_count).toBe(2);
    // 初診タグに1人の患者がいる
    expect(json.tags[1].patient_count).toBe(1);
  });

  it("タグがない場合は空配列を返す", async () => {
    tableChains["tag_definitions"] = createChain({ data: [], error: null });
    tableChains["patient_tags"] = createChain({ data: [], error: null });

    const req = createGetRequest();
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.tags).toEqual([]);
  });

  it("tag_definitions の取得でエラーが発生した場合は 500 を返す", async () => {
    tableChains["tag_definitions"] = createChain({ data: null, error: { message: "DB error" } });

    const req = createGetRequest();
    const res = await GET(req);
    expect(res.status).toBe(500);
  });

  it("patient_tags が空の場合は全タグの patient_count が 0 になる", async () => {
    tableChains["tag_definitions"] = createChain({
      data: [{ id: 1, name: "VIP", color: "#FF0000", created_at: "2026-01-01" }],
      error: null,
    });
    // patient_tags が空（null / []）
    tableChains["patient_tags"] = createChain({ data: null, error: null });

    const req = createGetRequest();
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.tags[0].patient_count).toBe(0);
  });
});

// =============================================
// POST テスト（タグ作成）
// =============================================
describe("POST /api/admin/tags", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableChains = {};
    mockVerifyAdminAuth.mockResolvedValue(true);
  });

  it("認証失敗時は 401 を返す", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const req = createPostRequest({ name: "テストタグ" });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("name がない場合は 400 を返す", async () => {
    const req = createPostRequest({});
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("name が空文字の場合は 400 を返す", async () => {
    const req = createPostRequest({ name: "" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("不正なJSON の場合は 400 を返す", async () => {
    const req = new Request("http://localhost/api/admin/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "INVALID",
    }) as any;
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("正常にタグを作成する", async () => {
    const newTag = { id: 1, name: "VIP", color: "#FF0000" };
    tableChains["tag_definitions"] = createChain({ data: newTag, error: null });

    const req = createPostRequest({ name: "VIP", color: "#FF0000" });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.tag.name).toBe("VIP");
  });

  it("color を省略するとデフォルト色が使われる", async () => {
    const newTag = { id: 1, name: "テスト", color: "#6B7280" };
    tableChains["tag_definitions"] = createChain({ data: newTag, error: null });

    const req = createPostRequest({ name: "テスト" });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  it("同名タグが存在する場合は 409 を返す", async () => {
    tableChains["tag_definitions"] = createChain({
      data: null,
      error: { message: "duplicate", code: "23505" },
    });

    const req = createPostRequest({ name: "VIP" });
    const res = await POST(req);
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toContain("同じ名前");
  });

  it("その他のDBエラー時は 500 を返す", async () => {
    tableChains["tag_definitions"] = createChain({
      data: null,
      error: { message: "unknown error", code: "42000" },
    });

    const req = createPostRequest({ name: "テスト" });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  it("is_auto と auto_rule を指定してタグを作成できる", async () => {
    const newTag = { id: 1, name: "自動タグ", is_auto: true, auto_rule: { field: "status" } };
    tableChains["tag_definitions"] = createChain({ data: newTag, error: null });

    const req = createPostRequest({
      name: "自動タグ",
      is_auto: true,
      auto_rule: { field: "status" },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.tag.is_auto).toBe(true);
  });

  it("name の前後空白が trim される", async () => {
    const tagDefsChain = createChain({ data: { id: 1, name: "VIP" }, error: null });
    tableChains["tag_definitions"] = tagDefsChain;

    const req = createPostRequest({ name: "  VIP  " });
    await POST(req);

    // insert が name.trim() で呼ばれる
    expect(tagDefsChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ name: "VIP" })
    );
  });
});
