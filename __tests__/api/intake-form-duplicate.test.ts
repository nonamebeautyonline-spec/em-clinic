// __tests__/api/intake-form-duplicate.test.ts
// 問診テンプレート複製・一覧・有効化・削除APIのテスト
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Supabase チェーンモック ---
interface ChainResult { data: unknown; error: unknown }
interface SupabaseChain extends Record<string, ReturnType<typeof vi.fn>> {
  then: ReturnType<typeof vi.fn>;
}

function createChain(defaultResolve: ChainResult = { data: [], error: null }): SupabaseChain {
  const chain = {} as SupabaseChain;
  [
    "insert", "update", "delete", "select", "eq", "neq", "gt", "gte", "lt", "lte",
    "in", "is", "not", "order", "limit", "range", "single", "maybeSingle", "upsert",
    "ilike", "or", "count", "csv", "from",
  ].forEach(m => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.then = vi.fn((resolve: (value: ChainResult) => unknown) => resolve(defaultResolve));
  return chain;
}

const intakeChain = createChain();

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => {
      if (table === "intake_form_definitions") return intakeChain;
      return createChain();
    }),
  },
}));

vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant-id"),
  resolveTenantIdOrThrow: vi.fn(() => "test-tenant-id"),
  withTenant: vi.fn(<T>(q: T) => q),
  strictWithTenant: vi.fn((q: unknown) => q),
  tenantPayload: vi.fn((tid: string | null) => ({ tenant_id: tid || "00000000-0000-0000-0000-000000000001" })),
}));

// チェーンリセットヘルパー
function resetChain(chain: SupabaseChain, defaultResolve: ChainResult = { data: [], error: null }) {
  chain.then = vi.fn((resolve: (value: ChainResult) => unknown) => resolve(defaultResolve));
  [
    "insert", "update", "delete", "select", "eq", "neq", "gt", "gte", "lt", "lte",
    "in", "is", "not", "order", "limit", "range", "single", "maybeSingle", "upsert",
    "ilike", "or", "count", "csv",
  ].forEach(m => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
}

// モック NextRequest
function createMockPostRequest(body: unknown) {
  return {
    method: "POST",
    url: "https://example.com/api/admin/intake-form/duplicate",
    json: vi.fn().mockResolvedValue(body),
    cookies: { get: vi.fn(() => undefined) },
    headers: { get: vi.fn(() => null) },
  } as unknown as import("next/server").NextRequest;
}

function createMockGetRequest(url = "https://example.com/api/admin/intake-form/templates") {
  const parsedUrl = new URL(url);
  return {
    method: "GET",
    url,
    nextUrl: { searchParams: parsedUrl.searchParams },
    cookies: { get: vi.fn(() => undefined) },
    headers: { get: vi.fn(() => null) },
  } as unknown as import("next/server").NextRequest;
}

function createMockDeleteRequest(body: unknown) {
  return {
    method: "DELETE",
    url: "https://example.com/api/admin/intake-form/templates",
    json: vi.fn().mockResolvedValue(body),
    cookies: { get: vi.fn(() => undefined) },
    headers: { get: vi.fn(() => null) },
  } as unknown as import("next/server").NextRequest;
}

// --- テスト ---

describe("POST /api/admin/intake-form/duplicate", () => {
  let duplicatePost: typeof import("@/app/api/admin/intake-form/duplicate/route").POST;

  beforeEach(async () => {
    vi.clearAllMocks();
    resetChain(intakeChain);
    // 動的インポートでモジュールの副作用を回避
    const mod = await import("@/app/api/admin/intake-form/duplicate/route");
    duplicatePost = mod.POST;
  });

  it("アクティブなテンプレートを複製し、コピーレコードを返す", async () => {
    const activeTemplate = {
      id: "tmpl-1",
      name: "問診テンプレートA",
      fields: [{ id: "f1", type: "text", label: "名前", required: true, sort_order: 0 }],
      settings: { step_by_step: true, header_title: "問診" },
    };

    const insertedTemplate = {
      id: "tmpl-2",
      name: "問診テンプレートA（コピー）",
      is_active: false,
      created_at: "2026-03-07T00:00:00.000Z",
    };

    // maybeSingle → アクティブテンプレート取得
    intakeChain.maybeSingle = vi.fn().mockReturnValue(
      { then: vi.fn((resolve: (v: ChainResult) => unknown) => resolve({ data: activeTemplate, error: null })) },
    );

    // single → 複製後のINSERT結果
    intakeChain.single = vi.fn().mockReturnValue(
      { then: vi.fn((resolve: (v: ChainResult) => unknown) => resolve({ data: insertedTemplate, error: null })) },
    );

    const req = createMockPostRequest({});
    const res = await duplicatePost(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.template.name).toBe("問診テンプレートA（コピー）");
    expect(json.template.is_active).toBe(false);
  });

  it("アクティブなテンプレートがない場合、404を返す", async () => {
    intakeChain.maybeSingle = vi.fn().mockReturnValue(
      { then: vi.fn((resolve: (v: ChainResult) => unknown) => resolve({ data: null, error: null })) },
    );

    const req = createMockPostRequest({});
    const res = await duplicatePost(req);
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.ok).toBe(false);
  });
});

describe("GET /api/admin/intake-form/templates", () => {
  let templatesGet: typeof import("@/app/api/admin/intake-form/templates/route").GET;

  beforeEach(async () => {
    vi.clearAllMocks();
    resetChain(intakeChain);
    const mod = await import("@/app/api/admin/intake-form/templates/route");
    templatesGet = mod.GET;
  });

  it("テンプレート一覧を返す", async () => {
    const templates = [
      { id: "tmpl-1", name: "テンプレートA", is_active: true, created_at: "2026-03-01", updated_at: "2026-03-07" },
      { id: "tmpl-2", name: "テンプレートB", is_active: false, created_at: "2026-03-05", updated_at: "2026-03-06" },
    ];

    resetChain(intakeChain, { data: templates, error: null });

    const req = createMockGetRequest();
    const res = await templatesGet(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.templates).toHaveLength(2);
    expect(json.templates[0].is_active).toBe(true);
  });

  it("テンプレートがない場合、空配列を返す", async () => {
    resetChain(intakeChain, { data: [], error: null });

    const req = createMockGetRequest();
    const res = await templatesGet(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.templates).toHaveLength(0);
  });
});

describe("DELETE /api/admin/intake-form/templates", () => {
  let templatesDelete: typeof import("@/app/api/admin/intake-form/templates/route").DELETE;

  beforeEach(async () => {
    vi.clearAllMocks();
    resetChain(intakeChain);
    const mod = await import("@/app/api/admin/intake-form/templates/route");
    templatesDelete = mod.DELETE;
  });

  it("非アクティブなテンプレートを削除できる", async () => {
    // maybeSingle → 対象テンプレート取得
    intakeChain.maybeSingle = vi.fn().mockReturnValue(
      { then: vi.fn((resolve: (v: ChainResult) => unknown) => resolve({ data: { id: "tmpl-2", is_active: false }, error: null })) },
    );

    // delete → 成功
    resetChain(intakeChain, { data: null, error: null });
    intakeChain.maybeSingle = vi.fn().mockReturnValue(
      { then: vi.fn((resolve: (v: ChainResult) => unknown) => resolve({ data: { id: "tmpl-2", is_active: false }, error: null })) },
    );

    const req = createMockDeleteRequest({ id: "tmpl-2" });
    const res = await templatesDelete(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
  });

  it("アクティブなテンプレートの削除は400エラーになる", async () => {
    intakeChain.maybeSingle = vi.fn().mockReturnValue(
      { then: vi.fn((resolve: (v: ChainResult) => unknown) => resolve({ data: { id: "tmpl-1", is_active: true }, error: null })) },
    );

    const req = createMockDeleteRequest({ id: "tmpl-1" });
    const res = await templatesDelete(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.ok).toBe(false);
    expect(json.message).toContain("使用中");
  });

  it("テンプレートIDが未指定の場合、400エラーになる", async () => {
    const req = createMockDeleteRequest({});
    const res = await templatesDelete(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.ok).toBe(false);
  });
});

describe("POST /api/admin/intake-form/activate", () => {
  let activatePost: typeof import("@/app/api/admin/intake-form/activate/route").POST;

  beforeEach(async () => {
    vi.clearAllMocks();
    resetChain(intakeChain);
    const mod = await import("@/app/api/admin/intake-form/activate/route");
    activatePost = mod.POST;
  });

  it("指定テンプレートを有効化し、他を非アクティブにする", async () => {
    // maybeSingle → 対象テンプレート存在確認
    intakeChain.maybeSingle = vi.fn().mockReturnValue(
      { then: vi.fn((resolve: (v: ChainResult) => unknown) => resolve({ data: { id: "tmpl-2" }, error: null })) },
    );

    const req = createMockPostRequest({ id: "tmpl-2" });
    const res = await activatePost(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
  });

  it("存在しないテンプレートの有効化は404エラーになる", async () => {
    intakeChain.maybeSingle = vi.fn().mockReturnValue(
      { then: vi.fn((resolve: (v: ChainResult) => unknown) => resolve({ data: null, error: null })) },
    );

    const req = createMockPostRequest({ id: "nonexistent" });
    const res = await activatePost(req);
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.ok).toBe(false);
  });

  it("テンプレートIDが未指定の場合、400エラーになる", async () => {
    const req = createMockPostRequest({});
    const res = await activatePost(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.ok).toBe(false);
  });
});

describe("GET /api/admin/intake-form（is_activeフィルタ）", () => {
  let intakeFormGet: typeof import("@/app/api/admin/intake-form/route").GET;

  beforeEach(async () => {
    vi.clearAllMocks();
    resetChain(intakeChain);
    const mod = await import("@/app/api/admin/intake-form/route");
    intakeFormGet = mod.GET;
  });

  it("アクティブなテンプレートのみ返す", async () => {
    const activeTemplate = {
      id: "tmpl-1",
      name: "問診フォーム",
      fields: [],
      settings: { step_by_step: true, header_title: "問診" },
      is_active: true,
      created_at: "2026-03-01",
      updated_at: "2026-03-07",
    };

    intakeChain.maybeSingle = vi.fn().mockReturnValue(
      { then: vi.fn((resolve: (v: ChainResult) => unknown) => resolve({ data: activeTemplate, error: null })) },
    );

    const req = createMockGetRequest("https://example.com/api/admin/intake-form");
    const res = await intakeFormGet(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.definition.id).toBe("tmpl-1");

    // is_active フィルタが呼ばれたか確認
    expect(intakeChain.eq).toHaveBeenCalledWith("is_active", true);
  });

  it("アクティブなテンプレートがない場合、デフォルトを返す", async () => {
    intakeChain.maybeSingle = vi.fn().mockReturnValue(
      { then: vi.fn((resolve: (v: ChainResult) => unknown) => resolve({ data: null, error: null })) },
    );

    const req = createMockGetRequest("https://example.com/api/admin/intake-form");
    const res = await intakeFormGet(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.definition.is_default).toBe(true);
  });
});
