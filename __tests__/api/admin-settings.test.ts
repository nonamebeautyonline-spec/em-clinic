// __tests__/api/admin-settings.test.ts
// テナント設定 API のテスト
// 対象: app/api/admin/settings/route.ts
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

// settings 関連関数のモック
const mockGetSetting = vi.fn();
const mockSetSetting = vi.fn();
const mockGetSettingsBulk = vi.fn();
vi.mock("@/lib/settings", () => ({
  getSetting: (...args: any[]) => mockGetSetting(...args),
  setSetting: (...args: any[]) => mockSetSetting(...args),
  getSettingsBulk: (...args: any[]) => mockGetSettingsBulk(...args),
}));

// crypto のモック
vi.mock("@/lib/crypto", () => ({
  maskValue: vi.fn((v: string) => v ? v.slice(0, 3) + "***" : null),
}));

// parseBody モック
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

import { GET, PUT } from "@/app/api/admin/settings/route";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { parseBody } from "@/lib/validations/helpers";
import { maskValue } from "@/lib/crypto";

describe("テナント設定 API (admin/settings/route.ts)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (verifyAdminAuth as any).mockResolvedValue(true);
  });

  // ========================================
  // GET: 設定取得
  // ========================================
  describe("GET: 設定一覧取得", () => {
    it("認証失敗 → 401", async () => {
      (verifyAdminAuth as any).mockResolvedValue(false);
      const req = createMockRequest("GET", "http://localhost/api/admin/settings");
      const res = await GET(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe("Unauthorized");
    });

    it("カテゴリ指定なし → 全カテゴリの設定を返す（definitions 付き）", async () => {
      // getSettingsBulk は Map を返す
      const bulkMap = new Map<string, string>();
      bulkMap.set("general:clinic_name", "テストクリニック");
      mockGetSettingsBulk.mockResolvedValue(bulkMap);

      const req = createMockRequest("GET", "http://localhost/api/admin/settings");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      // 全カテゴリ一括取得の場合、settings と definitions が返る
      expect(json.settings).toBeDefined();
      expect(json.definitions).toBeDefined();
      // general カテゴリが含まれる
      expect(json.settings.general).toBeDefined();
    });

    it("カテゴリ指定あり → フラット形式で返す", async () => {
      const bulkMap = new Map<string, string>();
      bulkMap.set("consultation:type", "video");
      bulkMap.set("consultation:line_call_url", "https://line.me/call/xxx");
      mockGetSettingsBulk.mockResolvedValue(bulkMap);

      const req = createMockRequest("GET", "http://localhost/api/admin/settings?category=consultation");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      // フラット形式: { settings: { type: "video", line_call_url: "..." } }
      expect(json.settings.type).toBe("video");
      expect(json.settings.line_call_url).toBe("https://line.me/call/xxx");
      // definitions は含まれない
      expect(json.definitions).toBeUndefined();
    });

    it("DB に値がある → maskedValue + source: db", async () => {
      const bulkMap = new Map<string, string>();
      bulkMap.set("square:access_token", "sk_test_abc123xyz");
      mockGetSettingsBulk.mockResolvedValue(bulkMap);

      const req = createMockRequest("GET", "http://localhost/api/admin/settings");
      const res = await GET(req);
      const json = await res.json();
      const squareSettings = json.settings.square;
      const tokenSetting = squareSettings.find((s: any) => s.key === "access_token");
      expect(tokenSetting.source).toBe("db");
      expect(tokenSetting.maskedValue).toBeTruthy();
      // maskValue が呼ばれたことを確認
      expect(maskValue).toHaveBeenCalledWith("sk_test_abc123xyz");
    });

    it("DB に値なし + 環境変数あり → source: env", async () => {
      const bulkMap = new Map<string, string>();
      // DB には何もない
      mockGetSettingsBulk.mockResolvedValue(bulkMap);

      // 環境変数をセット
      const originalEnv = process.env.SQUARE_ACCESS_TOKEN;
      process.env.SQUARE_ACCESS_TOKEN = "env_token_value";

      try {
        const req = createMockRequest("GET", "http://localhost/api/admin/settings");
        const res = await GET(req);
        const json = await res.json();
        const squareSettings = json.settings.square;
        const tokenSetting = squareSettings.find((s: any) => s.key === "access_token");
        expect(tokenSetting.source).toBe("env");
        expect(tokenSetting.maskedValue).toBeTruthy();
      } finally {
        // 環境変数を元に戻す
        if (originalEnv === undefined) delete process.env.SQUARE_ACCESS_TOKEN;
        else process.env.SQUARE_ACCESS_TOKEN = originalEnv;
      }
    });

    it("DB にも環境変数にもない → source: none, maskedValue: null", async () => {
      const bulkMap = new Map<string, string>();
      mockGetSettingsBulk.mockResolvedValue(bulkMap);

      // 環境変数もなし
      const originalEnv = process.env.SQUARE_ACCESS_TOKEN;
      delete process.env.SQUARE_ACCESS_TOKEN;

      try {
        const req = createMockRequest("GET", "http://localhost/api/admin/settings");
        const res = await GET(req);
        const json = await res.json();
        const squareSettings = json.settings.square;
        const tokenSetting = squareSettings.find((s: any) => s.key === "access_token");
        expect(tokenSetting.source).toBe("none");
        expect(tokenSetting.maskedValue).toBeNull();
      } finally {
        if (originalEnv !== undefined) process.env.SQUARE_ACCESS_TOKEN = originalEnv;
      }
    });

    it("getSettingsBulk に tenantId が渡される", async () => {
      mockGetSettingsBulk.mockResolvedValue(new Map());
      const req = createMockRequest("GET", "http://localhost/api/admin/settings");
      await GET(req);
      // 第2引数が tenantId
      expect(mockGetSettingsBulk.mock.calls[0][1]).toBe("test-tenant");
    });
  });

  // ========================================
  // PUT: 設定更新
  // ========================================
  describe("PUT: 設定更新", () => {
    it("認証失敗 → 401", async () => {
      (verifyAdminAuth as any).mockResolvedValue(false);
      const req = createMockRequest("PUT", "http://localhost/api/admin/settings", {});
      const res = await PUT(req);
      expect(res.status).toBe(401);
    });

    it("バリデーションエラー → parseBody のエラーレスポンスを返す", async () => {
      const errorResponse = new Response(JSON.stringify({ error: "入力値が不正です" }), { status: 400 });
      (parseBody as any).mockResolvedValue({ error: errorResponse });

      const req = createMockRequest("PUT", "http://localhost/api/admin/settings", {});
      const res = await PUT(req);
      expect(res.status).toBe(400);
    });

    it("不正な設定キー → 400", async () => {
      (parseBody as any).mockResolvedValue({
        data: { category: "square", key: "nonexistent_key", value: "test" },
      });

      const req = createMockRequest("PUT", "http://localhost/api/admin/settings", {});
      const res = await PUT(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("不正な設定キーです");
    });

    it("不正なカテゴリ → 400", async () => {
      (parseBody as any).mockResolvedValue({
        data: { category: "invalid_category", key: "test", value: "test" },
      });

      const req = createMockRequest("PUT", "http://localhost/api/admin/settings", {});
      const res = await PUT(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("不正な設定キーです");
    });

    it("正常な設定更新 → success: true + maskedValue", async () => {
      (parseBody as any).mockResolvedValue({
        data: { category: "general", key: "clinic_name", value: "新しいクリニック名" },
      });
      mockSetSetting.mockResolvedValue(true);

      const req = createMockRequest("PUT", "http://localhost/api/admin/settings", {});
      const res = await PUT(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.maskedValue).toBeTruthy();
    });

    it("setSetting に正しい引数が渡される", async () => {
      (parseBody as any).mockResolvedValue({
        data: { category: "line", key: "channel_id", value: "123456" },
      });
      mockSetSetting.mockResolvedValue(true);

      const req = createMockRequest("PUT", "http://localhost/api/admin/settings", {});
      await PUT(req);

      expect(mockSetSetting).toHaveBeenCalledWith("line", "channel_id", "123456", "test-tenant");
    });

    it("setSetting 失敗 → 500", async () => {
      (parseBody as any).mockResolvedValue({
        data: { category: "general", key: "clinic_name", value: "テスト" },
      });
      mockSetSetting.mockResolvedValue(false);

      const req = createMockRequest("PUT", "http://localhost/api/admin/settings", {});
      const res = await PUT(req);
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toBe("設定の保存に失敗しました");
    });

    // 各カテゴリの有効なキーのテスト
    it("square カテゴリの有効キー → 保存成功", async () => {
      (parseBody as any).mockResolvedValue({
        data: { category: "square", key: "access_token", value: "sk_test_new" },
      });
      mockSetSetting.mockResolvedValue(true);

      const req = createMockRequest("PUT", "http://localhost/api/admin/settings", {});
      const res = await PUT(req);
      expect(res.status).toBe(200);
    });

    it("consultation カテゴリの有効キー → 保存成功", async () => {
      (parseBody as any).mockResolvedValue({
        data: { category: "consultation", key: "type", value: "video" },
      });
      mockSetSetting.mockResolvedValue(true);

      const req = createMockRequest("PUT", "http://localhost/api/admin/settings", {});
      const res = await PUT(req);
      expect(res.status).toBe(200);
    });

    it("sms カテゴリの有効キー → 保存成功", async () => {
      (parseBody as any).mockResolvedValue({
        data: { category: "sms", key: "account_sid", value: "ACxxxx" },
      });
      mockSetSetting.mockResolvedValue(true);

      const req = createMockRequest("PUT", "http://localhost/api/admin/settings", {});
      const res = await PUT(req);
      expect(res.status).toBe(200);
    });

    it("ehr カテゴリの有効キー → 保存成功", async () => {
      (parseBody as any).mockResolvedValue({
        data: { category: "ehr", key: "provider", value: "orca" },
      });
      mockSetSetting.mockResolvedValue(true);

      const req = createMockRequest("PUT", "http://localhost/api/admin/settings", {});
      const res = await PUT(req);
      expect(res.status).toBe(200);
    });
  });
});
