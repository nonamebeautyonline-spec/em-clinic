// __tests__/api/admin-line-media.test.ts
// admin/line/media API テスト（GET/POST/PUT/DELETE）
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

// --- モック ---
const mockQueryBuilder = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  ilike: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  not: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: { id: 1, name: "test.jpg" }, error: null }),
};

const mockStorageBucket = {
  upload: vi.fn().mockResolvedValue({ error: null }),
  getPublicUrl: vi.fn(() => ({ data: { publicUrl: "https://example.com/media/test.jpg" } })),
  remove: vi.fn().mockResolvedValue({ error: null }),
};

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn(() => mockQueryBuilder),
    storage: {
      listBuckets: vi.fn().mockResolvedValue({ data: [{ name: "line-images" }] }),
      createBucket: vi.fn().mockResolvedValue({}),
      from: vi.fn(() => mockStorageBucket),
    },
  },
}));

const mockVerifyAdminAuth = vi.fn().mockResolvedValue(true);
vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: (...args: any[]) => mockVerifyAdminAuth(...args),
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn().mockReturnValue("test-tenant"),
  withTenant: vi.fn((query) => query),
  tenantPayload: vi.fn((id: string) => ({ tenant_id: id })),
}));

const mockParseBody = vi.fn();
vi.mock("@/lib/validations/helpers", () => ({
  parseBody: (...args: any[]) => mockParseBody(...args),
}));

vi.mock("@/lib/validations/line-management", () => ({
  updateMediaSchema: {},
}));

// --- ヘルパー ---
function createMockRequest(url: string, options?: { method?: string; body?: any; formData?: any }) {
  return {
    method: options?.method || "GET",
    url,
    headers: { get: vi.fn(() => null) },
    json: async () => options?.body || {},
    formData: options?.formData ? async () => options.formData : async () => new Map(),
  } as any;
}

function createMockFile(name: string, type: string, size: number) {
  return {
    name,
    type,
    size,
    arrayBuffer: async () => new ArrayBuffer(size),
  } as unknown as File;
}

function createMockFormData(entries: Record<string, any>) {
  return { get: (key: string) => entries[key] ?? null } as any;
}

async function parseJson(res: Response) {
  return res.json();
}

// --- テスト ---
import { GET, POST, PUT, DELETE } from "@/app/api/admin/line/media/route";

describe("admin/line/media API テスト", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyAdminAuth.mockResolvedValue(true);
    // mockQueryBuilderのデフォルトリセット
    mockQueryBuilder.select.mockReturnThis();
    mockQueryBuilder.eq.mockReturnThis();
    mockQueryBuilder.ilike.mockReturnThis();
    mockQueryBuilder.order.mockReturnThis();
    mockQueryBuilder.update.mockReturnThis();
    mockQueryBuilder.delete.mockReturnThis();
    mockQueryBuilder.insert.mockReturnThis();
    mockQueryBuilder.single.mockResolvedValue({ data: { id: 1, name: "test.jpg" }, error: null });
  });

  // ========== GET ==========
  describe("GET", () => {
    it("1. 認証失敗 → 401", async () => {
      mockVerifyAdminAuth.mockResolvedValueOnce(false);
      const req = createMockRequest("https://example.com/api/admin/line/media");
      const res = await GET(req);
      const json = await parseJson(res);

      expect(res.status).toBe(401);
      expect(json.error).toBe("Unauthorized");
    });

    it("2. 全件取得 → 200", async () => {
      const { withTenant } = await import("@/lib/tenant");
      vi.mocked(withTenant).mockResolvedValueOnce({ data: [{ id: 1, name: "file1.jpg" }], error: null } as any);

      const req = createMockRequest("https://example.com/api/admin/line/media");
      const res = await GET(req);
      const json = await parseJson(res);

      expect(res.status).toBe(200);
      expect(json.files).toEqual([{ id: 1, name: "file1.jpg" }]);
    });

    it("3. folder_idフィルタ", async () => {
      const { withTenant } = await import("@/lib/tenant");
      vi.mocked(withTenant).mockResolvedValueOnce({ data: [{ id: 2, name: "folder_file.jpg" }], error: null } as any);

      const req = createMockRequest("https://example.com/api/admin/line/media?folder_id=5");
      const res = await GET(req);
      const json = await parseJson(res);

      expect(res.status).toBe(200);
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith("folder_id", 5);
    });

    it("4. searchフィルタ", async () => {
      const { withTenant } = await import("@/lib/tenant");
      vi.mocked(withTenant).mockResolvedValueOnce({ data: [{ id: 3, name: "search_match.jpg" }], error: null } as any);

      const req = createMockRequest("https://example.com/api/admin/line/media?search=match");
      const res = await GET(req);
      const json = await parseJson(res);

      expect(res.status).toBe(200);
      expect(mockQueryBuilder.ilike).toHaveBeenCalledWith("name", "%match%");
    });

    it("5. DBエラー → 500", async () => {
      const { withTenant } = await import("@/lib/tenant");
      vi.mocked(withTenant).mockResolvedValueOnce({ data: null, error: { message: "DB接続エラー" } } as any);

      const req = createMockRequest("https://example.com/api/admin/line/media");
      const res = await GET(req);
      const json = await parseJson(res);

      expect(res.status).toBe(500);
      expect(json.error).toBe("DB接続エラー");
    });
  });

  // ========== POST ==========
  describe("POST", () => {
    it("6. 認証失敗 → 401", async () => {
      mockVerifyAdminAuth.mockResolvedValueOnce(false);
      const req = createMockRequest("https://example.com/api/admin/line/media", { method: "POST" });
      const res = await POST(req);
      const json = await parseJson(res);

      expect(res.status).toBe(401);
      expect(json.error).toBe("Unauthorized");
    });

    it("7. ファイルなし → 400", async () => {
      const formData = createMockFormData({ file: null, file_type: "image" });
      const req = createMockRequest("https://example.com/api/admin/line/media", {
        method: "POST",
        formData,
      });
      const res = await POST(req);
      const json = await parseJson(res);

      expect(res.status).toBe(400);
      expect(json.error).toBe("ファイルは必須です");
    });

    it("8. 無効なfile_type → 400", async () => {
      const file = createMockFile("test.txt", "text/plain", 100);
      const formData = createMockFormData({ file, file_type: "unknown" });
      const req = createMockRequest("https://example.com/api/admin/line/media", {
        method: "POST",
        formData,
      });
      const res = await POST(req);
      const json = await parseJson(res);

      expect(res.status).toBe(400);
      expect(json.error).toBe("ファイル種別が無効です");
    });

    it("9. imageタイプ: 無効MIME → 400", async () => {
      const file = createMockFile("test.txt", "text/plain", 100);
      const formData = createMockFormData({ file, file_type: "image" });
      const req = createMockRequest("https://example.com/api/admin/line/media", {
        method: "POST",
        formData,
      });
      const res = await POST(req);
      const json = await parseJson(res);

      expect(res.status).toBe(400);
      expect(json.error).toContain("JPEG、PNG、GIF、WebP");
    });

    it("10. imageタイプ: サイズ超過 → 400", async () => {
      const file = createMockFile("big.jpg", "image/jpeg", 11 * 1024 * 1024); // 11MB
      const formData = createMockFormData({ file, file_type: "image" });
      const req = createMockRequest("https://example.com/api/admin/line/media", {
        method: "POST",
        formData,
      });
      const res = await POST(req);
      const json = await parseJson(res);

      expect(res.status).toBe(400);
      expect(json.error).toContain("10MB以下");
    });

    it("11. menu_imageタイプ: サイズ超過(1MB) → 400", async () => {
      const file = createMockFile("menu.png", "image/png", 2 * 1024 * 1024); // 2MB
      const formData = createMockFormData({ file, file_type: "menu_image" });
      const req = createMockRequest("https://example.com/api/admin/line/media", {
        method: "POST",
        formData,
      });
      const res = await POST(req);
      const json = await parseJson(res);

      expect(res.status).toBe(400);
      expect(json.error).toContain("1MB以下");
    });

    it("12. pdfタイプ: MIME不正 → 400", async () => {
      const file = createMockFile("fake.pdf", "image/png", 100);
      const formData = createMockFormData({ file, file_type: "pdf" });
      const req = createMockRequest("https://example.com/api/admin/line/media", {
        method: "POST",
        formData,
      });
      const res = await POST(req);
      const json = await parseJson(res);

      expect(res.status).toBe(400);
      expect(json.error).toContain("PDF形式のみ");
    });

    it("13. 正常アップロード → 200", async () => {
      const file = createMockFile("photo.jpg", "image/jpeg", 500 * 1024); // 500KB
      const formData = createMockFormData({ file, file_type: "image", folder_id: "3" });
      const req = createMockRequest("https://example.com/api/admin/line/media", {
        method: "POST",
        formData,
      });

      mockQueryBuilder.single.mockResolvedValueOnce({
        data: { id: 10, name: "photo.jpg", file_url: "https://example.com/media/test.jpg" },
        error: null,
      });

      const res = await POST(req);
      const json = await parseJson(res);

      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.file).toBeDefined();
    });
  });

  // ========== PUT ==========
  describe("PUT", () => {
    it("14. 認証失敗 → 401", async () => {
      mockVerifyAdminAuth.mockResolvedValueOnce(false);
      const req = createMockRequest("https://example.com/api/admin/line/media", { method: "PUT" });
      const res = await PUT(req);
      const json = await parseJson(res);

      expect(res.status).toBe(401);
      expect(json.error).toBe("Unauthorized");
    });

    it("15. 正常更新 → 200", async () => {
      mockParseBody.mockResolvedValue({
        data: { id: 1, name: "renamed.jpg", folder_id: 2 },
      });

      // withTenantの結果に.select().single()チェーンを持たせる
      const { withTenant } = await import("@/lib/tenant");
      vi.mocked(withTenant).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 1, name: "renamed.jpg", folder_id: 2 },
            error: null,
          }),
        }),
      } as any);

      const req = createMockRequest("https://example.com/api/admin/line/media", {
        method: "PUT",
        body: { id: 1, name: "renamed.jpg", folder_id: 2 },
      });
      const res = await PUT(req);
      const json = await parseJson(res);

      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.file.name).toBe("renamed.jpg");
    });
  });

  // ========== DELETE ==========
  describe("DELETE", () => {
    it("16. 認証失敗 → 401", async () => {
      mockVerifyAdminAuth.mockResolvedValueOnce(false);
      const req = createMockRequest("https://example.com/api/admin/line/media", { method: "DELETE" });
      const res = await DELETE(req);
      const json = await parseJson(res);

      expect(res.status).toBe(401);
      expect(json.error).toBe("Unauthorized");
    });

    it("17. IDなし → 400", async () => {
      const req = createMockRequest("https://example.com/api/admin/line/media");
      const res = await DELETE(req);
      const json = await parseJson(res);

      expect(res.status).toBe(400);
      expect(json.error).toBe("IDは必須です");
    });

    it("18. 正常削除 → 200", async () => {
      const { withTenant } = await import("@/lib/tenant");

      // 最初のwithTenant呼出: ファイルURL取得
      vi.mocked(withTenant)
        .mockReturnValueOnce({
          single: vi.fn().mockResolvedValue({
            data: { file_url: "https://storage.example.com/storage/v1/object/public/line-images/media/image/test.jpg" },
            error: null,
          }),
        } as any)
        // 2回目のwithTenant呼出: 削除
        .mockResolvedValueOnce({ error: null } as any);

      const req = createMockRequest("https://example.com/api/admin/line/media?id=5");
      const res = await DELETE(req);
      const json = await parseJson(res);

      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
    });
  });
});
