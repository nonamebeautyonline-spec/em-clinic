// __tests__/api/shared-templates.test.ts
// 共有テンプレートAPI（プラットフォーム管理・テナント側）のテスト

import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { NextRequest } from "next/server";

// === モックヘルパー ===
type SupabaseChain = Record<string, Mock> & { then: Mock };

function createChain(defaultResolve = { data: null, error: null, count: 0 }): SupabaseChain {
  const chain = {} as SupabaseChain;
  [
    "insert", "update", "delete", "select", "eq", "neq", "gt", "gte", "lt", "lte",
    "in", "is", "not", "order", "limit", "range", "single", "maybeSingle", "upsert",
    "ilike", "or", "count", "csv",
  ].forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.then = vi.fn((resolve: (val: unknown) => unknown) => resolve(defaultResolve));
  return chain;
}

let tableChains: Record<string, SupabaseChain> = {};
function getOrCreateChain(table: string) {
  if (!tableChains[table]) tableChains[table] = createChain();
  return tableChains[table];
}

// === モック定義 ===
vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => getOrCreateChain(table)),
  },
}));

vi.mock("@/lib/platform-auth", () => ({
  verifyPlatformAdmin: vi.fn().mockResolvedValue({
    userId: "admin-1",
    email: "admin@test.com",
    name: "管理者",
    platformRole: "platform_admin",
  }),
}));

vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: vi.fn().mockResolvedValue(true),
  getAdminTenantId: vi.fn().mockResolvedValue("tenant-1"),
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(),
}));

vi.mock("@/lib/validations/helpers", () => ({
  parseBody: vi.fn(),
}));

vi.mock("@/lib/tenant", () => ({
  tenantPayload: vi.fn((tenantId: string) => ({ tenant_id: tenantId || "00000000-0000-0000-0000-000000000001" })),
  resolveTenantId: vi.fn().mockReturnValue("tenant-1"),
  resolveTenantIdOrThrow: vi.fn(() => "tenant-1"),
  withTenant: vi.fn((query: unknown) => query),
  strictWithTenant: vi.fn((query: unknown) => query),
  DEFAULT_TENANT_ID: "00000000-0000-0000-0000-000000000001",
}));

// === インポート ===
import { GET as platformGET, POST as platformPOST } from "@/app/api/platform/shared-templates/route";
import {
  GET as platformDetailGET,
  PUT as platformDetailPUT,
  DELETE as platformDetailDELETE,
} from "@/app/api/platform/shared-templates/[id]/route";
import { GET as adminGET } from "@/app/api/admin/shared-templates/route";
import { POST as adminImportPOST } from "@/app/api/admin/shared-templates/[id]/import/route";
import { verifyPlatformAdmin } from "@/lib/platform-auth";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { parseBody } from "@/lib/validations/helpers";

// === テスト本体 ===

// ------------------------------------------------------------------
// プラットフォーム: GET 共有テンプレート一覧
// ------------------------------------------------------------------
describe("GET /api/platform/shared-templates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableChains = {};
  });

  it("認証失敗時は403を返す", async () => {
    vi.mocked(verifyPlatformAdmin).mockResolvedValueOnce(null as never);
    const req = new NextRequest("http://localhost/api/platform/shared-templates");
    const res = await platformGET(req);
    expect(res.status).toBe(403);
  });

  it("テンプレート一覧を取得できる", async () => {
    const chain = createChain({
      data: [
        { id: "st-1", name: "テスト1", template_type: "message", is_active: true },
        { id: "st-2", name: "テスト2", template_type: "flex", is_active: true },
      ],
      error: null,
      count: 2,
    });
    tableChains["shared_templates"] = chain;

    const req = new NextRequest("http://localhost/api/platform/shared-templates");
    const res = await platformGET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.templates).toHaveLength(2);
    expect(body.pagination.total).toBe(2);
  });

  it("検索パラメータが反映される", async () => {
    const chain = createChain({ data: [], error: null, count: 0 });
    tableChains["shared_templates"] = chain;

    const req = new NextRequest("http://localhost/api/platform/shared-templates?search=test&template_type=flex&is_active=true");
    await platformGET(req);

    expect(chain.ilike).toHaveBeenCalledWith("name", "%test%");
    expect(chain.eq).toHaveBeenCalledWith("template_type", "flex");
    expect(chain.eq).toHaveBeenCalledWith("is_active", true);
  });

  it("DBエラー時は500を返す", async () => {
    const chain = createChain({ data: null, error: { message: "DBエラー" }, count: 0 });
    tableChains["shared_templates"] = chain;

    const req = new NextRequest("http://localhost/api/platform/shared-templates");
    const res = await platformGET(req);
    expect(res.status).toBe(500);
  });
});

// ------------------------------------------------------------------
// プラットフォーム: POST 共有テンプレート作成
// ------------------------------------------------------------------
describe("POST /api/platform/shared-templates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableChains = {};
  });

  it("認証失敗時は403を返す", async () => {
    vi.mocked(verifyPlatformAdmin).mockResolvedValueOnce(null as never);
    const req = new NextRequest("http://localhost/api/platform/shared-templates", { method: "POST" });
    const res = await platformPOST(req);
    expect(res.status).toBe(403);
  });

  it("テンプレートを作成できる", async () => {
    vi.mocked(parseBody).mockResolvedValueOnce({
      data: {
        name: "新テンプレート",
        description: "説明文",
        category: "挨拶",
        content: { text: "こんにちは" },
        template_type: "message",
        tags: ["挨拶"],
        is_active: true,
      },
    } as never);

    const chain = createChain({
      data: { id: "st-new", name: "新テンプレート", template_type: "message" },
      error: null,
      count: 0,
    });
    tableChains["shared_templates"] = chain;

    const req = new NextRequest("http://localhost/api/platform/shared-templates", {
      method: "POST",
      body: JSON.stringify({ name: "新テンプレート" }),
    });
    const res = await platformPOST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.template.name).toBe("新テンプレート");
  });

  it("バリデーションエラー時はparseBodyのエラーを返す", async () => {
    const errorRes = new Response(JSON.stringify({ ok: false, error: "VALIDATION_ERROR" }), { status: 400 });
    vi.mocked(parseBody).mockResolvedValueOnce({
      error: errorRes as never,
    } as never);

    const req = new NextRequest("http://localhost/api/platform/shared-templates", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await platformPOST(req);
    expect(res.status).toBe(400);
  });
});

// ------------------------------------------------------------------
// プラットフォーム: GET/PUT/DELETE 共有テンプレート個別
// ------------------------------------------------------------------
describe("GET /api/platform/shared-templates/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableChains = {};
  });

  it("認証失敗時は403を返す", async () => {
    vi.mocked(verifyPlatformAdmin).mockResolvedValueOnce(null as never);
    const req = new NextRequest("http://localhost/api/platform/shared-templates/st-1");
    const res = await platformDetailGET(req, { params: Promise.resolve({ id: "st-1" }) });
    expect(res.status).toBe(403);
  });

  it("テンプレートを取得できる", async () => {
    const chain = createChain({
      data: { id: "st-1", name: "テスト", template_type: "message" },
      error: null,
      count: 0,
    });
    tableChains["shared_templates"] = chain;

    const req = new NextRequest("http://localhost/api/platform/shared-templates/st-1");
    const res = await platformDetailGET(req, { params: Promise.resolve({ id: "st-1" }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.template.name).toBe("テスト");
  });

  it("存在しないIDは404を返す", async () => {
    const chain = createChain({ data: null, error: { code: "PGRST116" }, count: 0 });
    tableChains["shared_templates"] = chain;

    const req = new NextRequest("http://localhost/api/platform/shared-templates/nonexistent");
    const res = await platformDetailGET(req, { params: Promise.resolve({ id: "nonexistent" }) });
    expect(res.status).toBe(404);
  });
});

describe("PUT /api/platform/shared-templates/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableChains = {};
  });

  it("テンプレートを更新できる", async () => {
    vi.mocked(parseBody).mockResolvedValueOnce({
      data: { name: "更新後" },
    } as never);

    const chain = createChain({
      data: { id: "st-1", name: "更新後" },
      error: null,
      count: 0,
    });
    tableChains["shared_templates"] = chain;

    const req = new NextRequest("http://localhost/api/platform/shared-templates/st-1", {
      method: "PUT",
      body: JSON.stringify({ name: "更新後" }),
    });
    const res = await platformDetailPUT(req, { params: Promise.resolve({ id: "st-1" }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it("存在しないIDは404を返す", async () => {
    vi.mocked(parseBody).mockResolvedValueOnce({ data: { name: "x" } } as never);

    // 最初のselect (存在確認) → null
    const chain = createChain({ data: null, error: null, count: 0 });
    tableChains["shared_templates"] = chain;

    const req = new NextRequest("http://localhost/api/platform/shared-templates/nonexistent", {
      method: "PUT",
      body: JSON.stringify({ name: "x" }),
    });
    const res = await platformDetailPUT(req, { params: Promise.resolve({ id: "nonexistent" }) });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/platform/shared-templates/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableChains = {};
  });

  it("テンプレートを削除できる", async () => {
    const chain = createChain({ data: null, error: null, count: 0 });
    tableChains["shared_templates"] = chain;

    const req = new NextRequest("http://localhost/api/platform/shared-templates/st-1", { method: "DELETE" });
    const res = await platformDetailDELETE(req, { params: Promise.resolve({ id: "st-1" }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it("認証失敗時は403を返す", async () => {
    vi.mocked(verifyPlatformAdmin).mockResolvedValueOnce(null as never);
    const req = new NextRequest("http://localhost/api/platform/shared-templates/st-1", { method: "DELETE" });
    const res = await platformDetailDELETE(req, { params: Promise.resolve({ id: "st-1" }) });
    expect(res.status).toBe(403);
  });
});

// ------------------------------------------------------------------
// テナント側: GET 共有テンプレート一覧（有効のみ）
// ------------------------------------------------------------------
describe("GET /api/admin/shared-templates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableChains = {};
  });

  it("認証失敗時は403を返す", async () => {
    vi.mocked(verifyAdminAuth).mockResolvedValueOnce(false as never);
    const req = new NextRequest("http://localhost/api/admin/shared-templates");
    const res = await adminGET(req);
    expect(res.status).toBe(403);
  });

  it("有効なテンプレート一覧を取得できる", async () => {
    const chain = createChain({
      data: [
        { id: "st-1", name: "有効テンプレ", is_active: true },
      ],
      error: null,
      count: 1,
    });
    tableChains["shared_templates"] = chain;

    const req = new NextRequest("http://localhost/api/admin/shared-templates");
    const res = await adminGET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.templates).toHaveLength(1);

    // is_active=trueフィルタが呼ばれている
    expect(chain.eq).toHaveBeenCalledWith("is_active", true);
  });

  it("検索パラメータが反映される", async () => {
    const chain = createChain({ data: [], error: null, count: 0 });
    tableChains["shared_templates"] = chain;

    const req = new NextRequest("http://localhost/api/admin/shared-templates?search=test&category=挨拶");
    await adminGET(req);

    expect(chain.ilike).toHaveBeenCalledWith("name", "%test%");
    expect(chain.eq).toHaveBeenCalledWith("category", "挨拶");
  });
});

// ------------------------------------------------------------------
// テナント側: POST 共有テンプレートインポート
// ------------------------------------------------------------------
describe("POST /api/admin/shared-templates/[id]/import", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableChains = {};
  });

  it("認証失敗時は403を返す", async () => {
    vi.mocked(verifyAdminAuth).mockResolvedValueOnce(false as never);
    const req = new NextRequest("http://localhost/api/admin/shared-templates/st-1/import", { method: "POST" });
    const res = await adminImportPOST(req, { params: Promise.resolve({ id: "st-1" }) });
    expect(res.status).toBe(403);
  });

  it("共有テンプレートをインポートできる", async () => {
    // shared_templatesからの取得
    const sharedChain = createChain({
      data: {
        id: "st-1",
        name: "共有テンプレ",
        description: "説明",
        category: "挨拶",
        content: { text: "こんにちは" },
        template_type: "message",
        tags: ["挨拶"],
        is_active: true,
      },
      error: null,
      count: 0,
    });
    tableChains["shared_templates"] = sharedChain;

    // message_templatesへのインサート
    const msgChain = createChain({
      data: { id: 1, name: "共有テンプレ", message_type: "text" },
      error: null,
      count: 0,
    });
    tableChains["message_templates"] = msgChain;

    const req = new NextRequest("http://localhost/api/admin/shared-templates/st-1/import", { method: "POST" });
    const res = await adminImportPOST(req, { params: Promise.resolve({ id: "st-1" }) });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.message).toContain("共有テンプレ");
  });

  it("存在しない共有テンプレートは404を返す", async () => {
    const chain = createChain({ data: null, error: { code: "PGRST116" }, count: 0 });
    tableChains["shared_templates"] = chain;

    const req = new NextRequest("http://localhost/api/admin/shared-templates/nonexistent/import", { method: "POST" });
    const res = await adminImportPOST(req, { params: Promise.resolve({ id: "nonexistent" }) });
    expect(res.status).toBe(404);
  });

  it("無効なテンプレートはインポートできない（404）", async () => {
    // is_active=falseのテンプレートはeq("is_active", true)で引っかからず data=null
    const chain = createChain({ data: null, error: null, count: 0 });
    tableChains["shared_templates"] = chain;

    const req = new NextRequest("http://localhost/api/admin/shared-templates/st-inactive/import", { method: "POST" });
    const res = await adminImportPOST(req, { params: Promise.resolve({ id: "st-inactive" }) });
    expect(res.status).toBe(404);
  });
});
