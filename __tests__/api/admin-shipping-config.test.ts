// __tests__/api/admin-shipping-config.test.ts
// 配送設定管理 API のテスト
// 対象: app/api/admin/shipping/config/route.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- モック設定 ---
vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  withTenant: vi.fn((q: any) => q),
  tenantPayload: vi.fn(() => ({ tenant_id: "test-tenant" })),
}));

// 配送設定の get/set をモック
const mockGetShippingConfig = vi.fn();
const mockSetShippingConfig = vi.fn();
vi.mock("@/lib/shipping/config", () => ({
  getShippingConfig: (...args: any[]) => mockGetShippingConfig(...args),
  setShippingConfig: (...args: any[]) => mockSetShippingConfig(...args),
}));

// parseBody をモック
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

import { GET, PUT } from "@/app/api/admin/shipping/config/route";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { parseBody } from "@/lib/validations/helpers";

describe("配送設定管理 API (shipping/config/route.ts)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (verifyAdminAuth as any).mockResolvedValue(true);
  });

  // ========================================
  // GET: 設定取得
  // ========================================
  describe("GET: 配送設定取得", () => {
    it("認証失敗 → 401", async () => {
      (verifyAdminAuth as any).mockResolvedValue(false);
      const req = createMockRequest("GET", "http://localhost/api/admin/shipping/config");
      const res = await GET(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe("Unauthorized");
    });

    it("正常取得 → 設定オブジェクトが返る", async () => {
      const mockConfig = {
        yamato: { senderName: "テストクリニック" },
        japanpost: {},
      };
      mockGetShippingConfig.mockResolvedValue(mockConfig);

      const req = createMockRequest("GET", "http://localhost/api/admin/shipping/config");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.config).toEqual(mockConfig);
    });

    it("getShippingConfig に tenantId が渡される", async () => {
      mockGetShippingConfig.mockResolvedValue({});
      const req = createMockRequest("GET", "http://localhost/api/admin/shipping/config");
      await GET(req);
      expect(mockGetShippingConfig).toHaveBeenCalledWith("test-tenant");
    });
  });

  // ========================================
  // PUT: 設定保存
  // ========================================
  describe("PUT: 配送設定保存", () => {
    it("認証失敗 → 401", async () => {
      (verifyAdminAuth as any).mockResolvedValue(false);
      const req = createMockRequest("PUT", "http://localhost/api/admin/shipping/config", { config: {} });
      const res = await PUT(req);
      expect(res.status).toBe(401);
    });

    it("バリデーションエラー → parseBody のエラーレスポンスを返す", async () => {
      const errorResponse = new Response(JSON.stringify({ error: "入力値が不正です" }), { status: 400 });
      (parseBody as any).mockResolvedValue({ error: errorResponse });

      const req = createMockRequest("PUT", "http://localhost/api/admin/shipping/config", {});
      const res = await PUT(req);
      expect(res.status).toBe(400);
    });

    it("正常保存 → ok: true", async () => {
      const configData = { yamato: { senderName: "新クリニック" } };
      (parseBody as any).mockResolvedValue({ data: { config: configData } });
      mockSetShippingConfig.mockResolvedValue(true);

      const req = createMockRequest("PUT", "http://localhost/api/admin/shipping/config", { config: configData });
      const res = await PUT(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
    });

    it("保存失敗 → 500", async () => {
      (parseBody as any).mockResolvedValue({ data: { config: {} } });
      mockSetShippingConfig.mockResolvedValue(false);

      const req = createMockRequest("PUT", "http://localhost/api/admin/shipping/config", { config: {} });
      const res = await PUT(req);
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toBe("保存に失敗しました");
    });

    it("setShippingConfig に config と tenantId が渡される", async () => {
      const configData = { yamato: { senderName: "テスト" } };
      (parseBody as any).mockResolvedValue({ data: { config: configData } });
      mockSetShippingConfig.mockResolvedValue(true);

      const req = createMockRequest("PUT", "http://localhost/api/admin/shipping/config", { config: configData });
      await PUT(req);
      expect(mockSetShippingConfig).toHaveBeenCalledWith(configData, "test-tenant");
    });
  });
});
