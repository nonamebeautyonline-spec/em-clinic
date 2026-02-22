// __tests__/api/products.test.ts
// 商品 CRUD API のテスト
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- モック ---
const mockVerifyAdminAuth = vi.fn();
const mockGetAllProducts = vi.fn();

// Supabase チェーン用モック
const mockChain = {
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: { id: "new-1", code: "PROD1", title: "テスト商品", price: 1000 }, error: null }),
  eq: vi.fn().mockReturnThis(),
};
// insert→select→single のチェーン
mockChain.insert.mockReturnValue(mockChain);
mockChain.update.mockReturnValue(mockChain);
mockChain.select.mockReturnValue(mockChain);

vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: (...args: any[]) => mockVerifyAdminAuth(...args),
}));
vi.mock("@/lib/products", () => ({
  getAllProducts: (...args: any[]) => mockGetAllProducts(...args),
}));
vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: { from: vi.fn(() => mockChain) },
}));
vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => null),
  withTenant: vi.fn((query: any) => query),
  tenantPayload: vi.fn((tid: any) => (tid ? { tenant_id: tid } : {})),
}));

// NextRequest互換のモック生成
function createMockRequest(method: string, url: string, body?: any) {
  const req = new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  return req as any;
}

// route handlers をインポート
import { GET, POST, PUT, DELETE } from "@/app/api/admin/products/route";

describe("商品 CRUD API (app/api/admin/products/route.ts)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // デフォルトで認証成功
    mockVerifyAdminAuth.mockResolvedValue(true);
    mockGetAllProducts.mockResolvedValue([
      { id: "1", code: "PROD1", title: "テスト商品", price: 1000 },
    ]);
    // チェーンリセット
    mockChain.single.mockResolvedValue({
      data: { id: "new-1", code: "PROD1", title: "テスト商品", price: 1000 },
      error: null,
    });
    mockChain.eq.mockReturnValue(mockChain);
    mockChain.select.mockReturnValue(mockChain);
    mockChain.update.mockReturnValue(mockChain);
  });

  // === GET ===
  describe("GET: 商品一覧取得", () => {
    it("認証OK → 商品一覧を返却", async () => {
      const req = createMockRequest("GET", "http://localhost/api/admin/products");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.products).toHaveLength(1);
      expect(json.products[0].code).toBe("PROD1");
    });

    it("認証NG → 401", async () => {
      mockVerifyAdminAuth.mockResolvedValue(false);
      const req = createMockRequest("GET", "http://localhost/api/admin/products");
      const res = await GET(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe("Unauthorized");
    });
  });

  // === POST ===
  describe("POST: 商品作成", () => {
    it("正常作成 → 201", async () => {
      const req = createMockRequest("POST", "http://localhost/api/admin/products", {
        code: "NEW1",
        title: "新商品",
        price: 5000,
      });
      const res = await POST(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.product).toBeDefined();
    });

    it("code未指定 → 400", async () => {
      const req = createMockRequest("POST", "http://localhost/api/admin/products", {
        title: "新商品",
        price: 5000,
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("入力値が不正です");
      expect(json.details?.some((d: string) => d.includes("code"))).toBe(true);
    });

    it("title未指定 → 400", async () => {
      const req = createMockRequest("POST", "http://localhost/api/admin/products", {
        code: "NEW1",
        price: 5000,
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("入力値が不正です");
      expect(json.details?.some((d: string) => d.includes("title"))).toBe(true);
    });

    it("price未指定 → 400", async () => {
      const req = createMockRequest("POST", "http://localhost/api/admin/products", {
        code: "NEW1",
        title: "新商品",
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("入力値が不正です");
      expect(json.details?.some((d: string) => d.includes("price"))).toBe(true);
    });

    it("認証NG → 401", async () => {
      mockVerifyAdminAuth.mockResolvedValue(false);
      const req = createMockRequest("POST", "http://localhost/api/admin/products", {
        code: "NEW1",
        title: "新商品",
        price: 5000,
      });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });
  });

  // === PUT ===
  describe("PUT: 商品更新", () => {
    it("正常更新 → 200", async () => {
      mockChain.single.mockResolvedValue({
        data: { id: "1", code: "PROD1", title: "更新後商品", price: 2000 },
        error: null,
      });
      const req = createMockRequest("PUT", "http://localhost/api/admin/products", {
        id: "1",
        title: "更新後商品",
        price: 2000,
      });
      const res = await PUT(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.product.title).toBe("更新後商品");
    });

    it("id未指定 → 400", async () => {
      const req = createMockRequest("PUT", "http://localhost/api/admin/products", {
        title: "更新後商品",
      });
      const res = await PUT(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("入力値が不正です");
      expect(json.details?.some((d: string) => d.includes("id"))).toBe(true);
    });

    it("認証NG → 401", async () => {
      mockVerifyAdminAuth.mockResolvedValue(false);
      const req = createMockRequest("PUT", "http://localhost/api/admin/products", {
        id: "1",
        title: "更新後商品",
      });
      const res = await PUT(req);
      expect(res.status).toBe(401);
    });
  });

  // === DELETE ===
  describe("DELETE: 商品無効化", () => {
    it("正常削除（is_active: false）→ success", async () => {
      mockChain.eq.mockResolvedValue({ error: null });
      const req = createMockRequest("DELETE", "http://localhost/api/admin/products?id=1");
      const res = await DELETE(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    });

    it("id未指定 → 400", async () => {
      const req = createMockRequest("DELETE", "http://localhost/api/admin/products");
      const res = await DELETE(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain("id");
    });
  });
});
