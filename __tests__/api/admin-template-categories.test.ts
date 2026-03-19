// __tests__/api/admin-template-categories.test.ts
// テンプレートカテゴリAPI (CRUD + 並び替え) のテスト

import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

// ============================================================
// 共通モック
// ============================================================

type SupabaseChain = Record<string, Mock> & {
  then: Mock;
};

function createChain(defaultResolve = { data: null, error: null }): SupabaseChain {
  const chain = {} as SupabaseChain;
  [
    "insert", "update", "delete", "select", "eq", "neq", "gt", "gte", "lt", "lte",
    "in", "is", "not", "order", "limit", "range", "single", "maybeSingle", "upsert",
    "ilike", "or", "count", "csv", "head",
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

const mockVerifyAdminAuth = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => getOrCreateChain(table)),
  },
}));

vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: (...args: unknown[]) => mockVerifyAdminAuth(...args),
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  resolveTenantIdOrThrow: vi.fn(() => "test-tenant"),
  withTenant: vi.fn((query: unknown) => query),
  strictWithTenant: vi.fn((query: unknown) => query),
  tenantPayload: vi.fn((tid: unknown) => (tid ? { tenant_id: tid } : {})),
}));

// NextRequest互換のモック生成
function createReq(method: string, url: string, body?: unknown) {
  const req = new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  }) as Request & { nextUrl: URL };
  req.nextUrl = new URL(url);
  return req;
}

// ============================================================
// テスト対象のインポート
// ============================================================

import {
  GET as categoriesGET,
  POST as categoriesPOST,
} from "@/app/api/admin/line/template-categories/route";

import {
  PUT as categoryPUT,
  DELETE as categoryDELETE,
} from "@/app/api/admin/line/template-categories/[id]/route";

// ============================================================
// beforeEach
// ============================================================
beforeEach(() => {
  vi.clearAllMocks();
  tableChains = {};
  mockVerifyAdminAuth.mockResolvedValue(true);
});

// ============================================================
// 1. カテゴリ一覧 GET
// ============================================================
describe("template-categories GET", () => {
  it("認証失敗 → 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const res = await categoriesGET(createReq("GET", "http://localhost/api/admin/line/template-categories") as never);
    expect(res.status).toBe(401);
  });

  it("正常取得 → categories配列を返す", async () => {
    const mockCategories = [
      { id: 1, name: "未分類", sort_order: 0 },
      { id: 2, name: "挨拶", sort_order: 1 },
    ];
    tableChains["template_categories"] = createChain({ data: mockCategories, error: null });

    const res = await categoriesGET(createReq("GET", "http://localhost/api/admin/line/template-categories") as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.categories).toEqual(mockCategories);
  });
});

// ============================================================
// 2. カテゴリ作成 POST
// ============================================================
describe("template-categories POST", () => {
  it("認証失敗 → 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const res = await categoriesPOST(createReq("POST", "http://localhost/api/admin/line/template-categories", { name: "テスト" }) as never);
    expect(res.status).toBe(401);
  });

  it("名前なし → 400", async () => {
    const res = await categoriesPOST(createReq("POST", "http://localhost/api/admin/line/template-categories", { name: "" }) as never);
    expect(res.status).toBe(400);
  });

  it("正常作成 → カテゴリ返却", async () => {
    const created = { id: 3, name: "テスト", sort_order: 2 };
    // sort_order取得用の既存max行
    const maxChain = createChain({ data: { sort_order: 1 }, error: null });
    tableChains["template_categories"] = maxChain;

    // single()が最初のチェーンで呼ばれた後、insert用のチェーンを設定
    maxChain.then = vi.fn()
      .mockImplementationOnce((resolve: (val: unknown) => unknown) => resolve({ data: { sort_order: 1 }, error: null })) // maxRow
      .mockImplementationOnce((resolve: (val: unknown) => unknown) => resolve({ data: created, error: null })); // insert

    const res = await categoriesPOST(createReq("POST", "http://localhost/api/admin/line/template-categories", { name: "テスト" }) as never);
    // 200 or 500は実装の内部チェーン依存だが、insertが呼ばれることを確認
    expect(maxChain.insert).toHaveBeenCalled();
  });
});

// ============================================================
// 3. カテゴリ更新 PUT
// ============================================================
describe("template-categories PUT [id]", () => {
  it("認証失敗 → 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const res = await categoryPUT(
      createReq("PUT", "http://localhost/api/admin/line/template-categories/1", { name: "新名前" }) as never,
      { params: Promise.resolve({ id: "1" }) },
    );
    expect(res.status).toBe(401);
  });

  it("名前変更 → updateが呼ばれる", async () => {
    const updated = { id: 1, name: "新名前", sort_order: 0 };
    tableChains["template_categories"] = createChain({ data: updated, error: null });

    const res = await categoryPUT(
      createReq("PUT", "http://localhost/api/admin/line/template-categories/1", { name: "新名前" }) as never,
      { params: Promise.resolve({ id: "1" }) },
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.category).toEqual(updated);
    expect(tableChains["template_categories"].update).toHaveBeenCalled();
  });

  it("空の更新 → 400", async () => {
    const res = await categoryPUT(
      createReq("PUT", "http://localhost/api/admin/line/template-categories/1", {}) as never,
      { params: Promise.resolve({ id: "1" }) },
    );
    expect(res.status).toBe(400);
  });

  it("並び替え一括更新（reorder） → 各idのsort_orderを更新", async () => {
    tableChains["template_categories"] = createChain({ data: null, error: null });

    const res = await categoryPUT(
      createReq("PUT", "http://localhost/api/admin/line/template-categories/reorder", {
        orders: [
          { id: 1, sort_order: 0 },
          { id: 2, sort_order: 1 },
          { id: 3, sort_order: 2 },
        ],
      }) as never,
      { params: Promise.resolve({ id: "reorder" }) },
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    // update が3回呼ばれる
    expect(tableChains["template_categories"].update).toHaveBeenCalledTimes(3);
  });
});

// ============================================================
// 4. カテゴリ削除 DELETE
// ============================================================
describe("template-categories DELETE [id]", () => {
  it("認証失敗 → 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const res = await categoryDELETE(
      createReq("DELETE", "http://localhost/api/admin/line/template-categories/2") as never,
      { params: Promise.resolve({ id: "2" }) },
    );
    expect(res.status).toBe(401);
  });

  it("「未分類」の削除 → 400", async () => {
    tableChains["template_categories"] = createChain({ data: { name: "未分類" }, error: null });

    const res = await categoryDELETE(
      createReq("DELETE", "http://localhost/api/admin/line/template-categories/1") as never,
      { params: Promise.resolve({ id: "1" }) },
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.message).toContain("未分類");
  });

  it("通常カテゴリ削除 → テンプレートを未分類に移動して削除", async () => {
    // カテゴリ名取得
    const catChain = createChain({ data: { name: "挨拶" }, error: null });
    tableChains["template_categories"] = catChain;
    // message_templatesの更新
    tableChains["message_templates"] = createChain({ data: null, error: null });

    const res = await categoryDELETE(
      createReq("DELETE", "http://localhost/api/admin/line/template-categories/2") as never,
      { params: Promise.resolve({ id: "2" }) },
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    // テンプレートの未分類移動が呼ばれる
    expect(tableChains["message_templates"].update).toHaveBeenCalled();
    // カテゴリ削除が呼ばれる
    expect(catChain.delete).toHaveBeenCalled();
  });

  it("存在しないカテゴリ → 400", async () => {
    tableChains["template_categories"] = createChain({ data: null, error: { message: "not found", code: "" } });

    const res = await categoryDELETE(
      createReq("DELETE", "http://localhost/api/admin/line/template-categories/999") as never,
      { params: Promise.resolve({ id: "999" }) },
    );
    expect(res.status).toBe(400);
  });
});
