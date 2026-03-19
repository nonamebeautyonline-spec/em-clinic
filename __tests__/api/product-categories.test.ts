// __tests__/api/product-categories.test.ts
// 商品カテゴリ（フォルダ）CRUD API のテスト
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- モック ---
const mockVerifyAdminAuth = vi.fn();

const mockChain = {
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({
    data: { id: "cat-1", name: "メディカルダイエット", parent_id: null, sort_order: 0 },
    error: null,
  }),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
};
mockChain.insert.mockReturnValue(mockChain);
mockChain.update.mockReturnValue(mockChain);
mockChain.delete.mockReturnValue(mockChain);
mockChain.select.mockReturnValue(mockChain);

// order→order→then のチェーンで GET が data を返す
const mockSelectResult = {
  ...mockChain,
  then: undefined as unknown,
  data: [{ id: "cat-1", name: "メディカルダイエット" }],
  error: null,
};

vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: (...args: unknown[]) => mockVerifyAdminAuth(...args),
}));
vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: { from: vi.fn(() => mockChain) },
}));
vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => null),
  resolveTenantIdOrThrow: vi.fn(() => null),
  withTenant: vi.fn((query: unknown) => query),
  strictWithTenant: vi.fn((query: unknown) => query),
  tenantPayload: vi.fn((tid: string | null) => (tid ? { tenant_id: tid } : {})),
}));

function createMockRequest(method: string, url: string, body?: unknown) {
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  }) as unknown as import("next/server").NextRequest;
}

import { GET, POST, PUT, DELETE } from "@/app/api/admin/product-categories/route";

describe("商品カテゴリ CRUD API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyAdminAuth.mockResolvedValue(true);
    // GET用: withTenantの戻り値としてPromise-likeなオブジェクトを返す
    mockChain.order.mockReturnValue(mockChain);
  });

  // ─── 認証 ───
  describe("認証", () => {
    it("未認証の場合401を返す", async () => {
      mockVerifyAdminAuth.mockResolvedValue(false);
      const req = createMockRequest("GET", "http://localhost/api/admin/product-categories");
      const res = await GET(req);
      expect(res.status).toBe(401);
    });
  });

  // ─── POST ───
  describe("POST - カテゴリ作成", () => {
    it("正常に作成できる", async () => {
      mockChain.single.mockResolvedValueOnce({
        data: { id: "cat-new", name: "ピル", parent_id: null, sort_order: 0 },
        error: null,
      });
      const req = createMockRequest("POST", "http://localhost/api/admin/product-categories", {
        name: "ピル",
      });
      const res = await POST(req);
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.category.name).toBe("ピル");
    });

    it("名前が空の場合バリデーションエラー", async () => {
      const req = createMockRequest("POST", "http://localhost/api/admin/product-categories", {
        name: "",
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("parent_id付きで子カテゴリを作成できる", async () => {
      mockChain.single.mockResolvedValueOnce({
        data: { id: "cat-child", name: "低用量ピル", parent_id: "cat-1", sort_order: 0 },
        error: null,
      });
      const req = createMockRequest("POST", "http://localhost/api/admin/product-categories", {
        name: "低用量ピル",
        parent_id: "cat-1",
      });
      const res = await POST(req);
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.category.parent_id).toBe("cat-1");
    });
  });

  // ─── PUT ───
  describe("PUT - カテゴリ更新", () => {
    it("名前変更できる", async () => {
      mockChain.single.mockResolvedValueOnce({
        data: { id: "cat-1", name: "GLP-1ダイエット" },
        error: null,
      });
      const req = createMockRequest("PUT", "http://localhost/api/admin/product-categories", {
        id: "cat-1",
        name: "GLP-1ダイエット",
      });
      const res = await PUT(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.category.name).toBe("GLP-1ダイエット");
    });

    it("IDなしの場合バリデーションエラー", async () => {
      const req = createMockRequest("PUT", "http://localhost/api/admin/product-categories", {
        name: "テスト",
      });
      const res = await PUT(req);
      expect(res.status).toBe(400);
    });
  });

  // ─── DELETE ───
  describe("DELETE - カテゴリ削除", () => {
    it("正常に削除できる", async () => {
      mockChain.eq.mockResolvedValueOnce({ error: null });
      const req = createMockRequest("DELETE", "http://localhost/api/admin/product-categories?id=cat-1");
      const res = await DELETE(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });

    it("IDなしの場合400を返す", async () => {
      const req = createMockRequest("DELETE", "http://localhost/api/admin/product-categories");
      const res = await DELETE(req);
      expect(res.status).toBe(400);
    });
  });
});
