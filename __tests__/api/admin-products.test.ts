// __tests__/api/admin-products.test.ts
// 商品 CRUD API (app/api/admin/products/route.ts) のテスト
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

const { mockVerifyAdminAuth, mockGetAllProducts } = vi.hoisted(() => ({
  mockVerifyAdminAuth: vi.fn().mockResolvedValue(true),
  mockGetAllProducts: vi.fn().mockResolvedValue([]),
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

vi.mock("@/lib/products", () => ({
  getAllProducts: mockGetAllProducts,
}));

// --- ヘルパー ---
function createPostRequest(body: any) {
  return new Request("http://localhost/api/admin/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as any;
}

function createPutRequest(body: any) {
  return new Request("http://localhost/api/admin/products", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as any;
}

function createGetRequest() {
  return new Request("http://localhost/api/admin/products", {
    method: "GET",
  }) as any;
}

function createDeleteRequest(id?: string) {
  const url = id
    ? `http://localhost/api/admin/products?id=${id}`
    : "http://localhost/api/admin/products";
  return new Request(url, { method: "DELETE" }) as any;
}

import { GET, POST, PUT, DELETE } from "@/app/api/admin/products/route";

// =============================================
// GET テスト
// =============================================
describe("GET /api/admin/products", () => {
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

  it("正常に商品一覧を返す", async () => {
    const products = [
      { id: "1", code: "MJ-2.5", title: "マンジャロ2.5mg", price: 30000 },
      { id: "2", code: "MJ-5.0", title: "マンジャロ5.0mg", price: 50000 },
    ];
    mockGetAllProducts.mockResolvedValue(products);

    const req = createGetRequest();
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.products).toHaveLength(2);
    expect(json.products[0].code).toBe("MJ-2.5");
  });

  it("商品がない場合は空配列を返す", async () => {
    mockGetAllProducts.mockResolvedValue([]);
    const req = createGetRequest();
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.products).toEqual([]);
  });
});

// =============================================
// POST テスト（商品作成）
// =============================================
describe("POST /api/admin/products", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableChains = {};
    mockVerifyAdminAuth.mockResolvedValue(true);
  });

  it("認証失敗時は 401 を返す", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const req = createPostRequest({ code: "MJ-2.5", title: "test", price: 30000 });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("code がない場合は 400 を返す", async () => {
    const req = createPostRequest({ title: "test", price: 30000 });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("title がない場合は 400 を返す", async () => {
    const req = createPostRequest({ code: "MJ-2.5", price: 30000 });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("price がない場合は 400 を返す", async () => {
    const req = createPostRequest({ code: "MJ-2.5", title: "test" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("price が文字列の場合は 400 を返す", async () => {
    const req = createPostRequest({ code: "MJ-2.5", title: "test", price: "abc" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("不正なJSON の場合は 400 を返す", async () => {
    const req = new Request("http://localhost/api/admin/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "INVALID",
    }) as any;
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("正常に商品を作成して 201 を返す", async () => {
    const newProduct = { id: "1", code: "MJ-2.5", title: "マンジャロ2.5mg", price: 30000 };
    tableChains["products"] = createChain({ data: newProduct, error: null });

    const req = createPostRequest({ code: "MJ-2.5", title: "マンジャロ2.5mg", price: 30000 });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.product.code).toBe("MJ-2.5");
  });

  it("DB insert エラー時は 500 を返す", async () => {
    tableChains["products"] = createChain({ data: null, error: { message: "duplicate key" } });

    const req = createPostRequest({ code: "MJ-2.5", title: "マンジャロ2.5mg", price: 30000 });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  it("オプショナルフィールドを含めて作成できる", async () => {
    const newProduct = {
      id: "1", code: "MJ-2.5", title: "マンジャロ2.5mg", price: 30000,
      drug_name: "マンジャロ", dosage: "2.5mg", duration_months: 1,
      quantity: 4, category: "injection", sort_order: 1,
    };
    tableChains["products"] = createChain({ data: newProduct, error: null });

    const req = createPostRequest({
      code: "MJ-2.5", title: "マンジャロ2.5mg", price: 30000,
      drug_name: "マンジャロ", dosage: "2.5mg", duration_months: 1,
      quantity: 4, category: "injection", sort_order: 1,
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
  });
});

// =============================================
// PUT テスト（商品更新）
// =============================================
describe("PUT /api/admin/products", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableChains = {};
    mockVerifyAdminAuth.mockResolvedValue(true);
  });

  it("認証失敗時は 401 を返す", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const req = createPutRequest({ id: "1", title: "updated" });
    const res = await PUT(req);
    expect(res.status).toBe(401);
  });

  it("id がない場合は 400 を返す", async () => {
    const req = createPutRequest({ title: "updated" });
    const res = await PUT(req);
    expect(res.status).toBe(400);
  });

  it("正常に商品を更新して 200 を返す", async () => {
    const updated = { id: "1", code: "MJ-2.5", title: "更新済み", price: 35000 };
    tableChains["products"] = createChain({ data: updated, error: null });

    const req = createPutRequest({ id: "1", title: "更新済み", price: 35000 });
    const res = await PUT(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.product.title).toBe("更新済み");
  });

  it("DB update エラー時は 500 を返す", async () => {
    tableChains["products"] = createChain({ data: null, error: { message: "update failed" } });

    const req = createPutRequest({ id: "1", title: "更新済み" });
    const res = await PUT(req);
    expect(res.status).toBe(500);
  });
});

// =============================================
// DELETE テスト（商品無効化）
// =============================================
describe("DELETE /api/admin/products", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableChains = {};
    mockVerifyAdminAuth.mockResolvedValue(true);
  });

  it("認証失敗時は 401 を返す", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const req = createDeleteRequest("1");
    const res = await DELETE(req);
    expect(res.status).toBe(401);
  });

  it("id がない場合は 400 を返す", async () => {
    const req = createDeleteRequest();
    const res = await DELETE(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("id");
  });

  it("正常に商品を無効化して 200 を返す", async () => {
    tableChains["products"] = createChain({ data: null, error: null });

    const req = createDeleteRequest("1");
    const res = await DELETE(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it("物理削除ではなく is_active=false に更新する", async () => {
    const productsChain = createChain({ data: null, error: null });
    tableChains["products"] = productsChain;

    const req = createDeleteRequest("1");
    await DELETE(req);

    // update が is_active: false で呼ばれる
    expect(productsChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ is_active: false })
    );
  });

  it("DB エラー時は 500 を返す", async () => {
    tableChains["products"] = createChain({ data: null, error: { message: "deactivate error" } });

    const req = createDeleteRequest("1");
    const res = await DELETE(req);
    expect(res.status).toBe(500);
  });
});
