// __tests__/api/admin-line-rich-menus.test.ts
// リッチメニュー管理 API のテスト
// 対象: app/api/admin/line/rich-menus/route.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- チェーンモック ---
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

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: { from: vi.fn((table: string) => getOrCreateChain(table)) },
}));

vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  withTenant: vi.fn((q: any) => q),
  tenantPayload: vi.fn(() => ({ tenant_id: "test-tenant" })),
}));

// LINE リッチメニュー関連のモック
vi.mock("@/lib/line-richmenu", () => ({
  createLineRichMenu: vi.fn().mockResolvedValue("richmenu-123"),
  uploadRichMenuImage: vi.fn().mockResolvedValue(true),
  setDefaultRichMenu: vi.fn().mockResolvedValue(undefined),
}));

// parseBody をモック
vi.mock("@/lib/validations/helpers", () => ({
  parseBody: vi.fn(),
}));

// next/server の after をモック（バックグラウンドタスク実行）
vi.mock("next/server", async () => {
  const actual = await vi.importActual("next/server");
  return {
    ...actual,
    after: vi.fn((fn: () => void) => fn()), // 即座に実行
  };
});

function createMockRequest(method: string, url: string, body?: any) {
  return {
    method,
    url,
    nextUrl: { searchParams: new URL(url).searchParams },
    cookies: { get: vi.fn(() => undefined) },
    headers: { get: vi.fn(() => "http://localhost") },
    json: body ? vi.fn().mockResolvedValue(body) : vi.fn(),
  } as any;
}

import { GET, POST } from "@/app/api/admin/line/rich-menus/route";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { parseBody } from "@/lib/validations/helpers";

describe("リッチメニューAPI (rich-menus/route.ts)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableChains = {};
    (verifyAdminAuth as any).mockResolvedValue(true);
  });

  // ========================================
  // GET: リッチメニュー一覧
  // ========================================
  describe("GET: リッチメニュー一覧", () => {
    it("認証失敗 → 401", async () => {
      (verifyAdminAuth as any).mockResolvedValue(false);
      const req = createMockRequest("GET", "http://localhost/api/admin/line/rich-menus");
      const res = await GET(req);
      expect(res.status).toBe(401);
    });

    it("正常取得 → メニュー一覧 + user_count", async () => {
      // rich_menus テーブル
      tableChains["rich_menus"] = createChain({
        data: [
          { id: 1, name: "処方後", selected: false },
          { id: 2, name: "個人情報入力後", selected: false },
          { id: 3, name: "個人情報入力前", selected: true },
        ],
        error: null,
      });
      // patients: LINE連携済み全体数
      const patientsChain = createChain({ data: null, error: null });
      patientsChain.then = vi.fn((resolve: any) => resolve({ count: 100, data: null, error: null }));
      tableChains["patients"] = patientsChain;

      // orders: 注文患者
      tableChains["orders"] = createChain({
        data: [
          { patient_id: "p1" },
          { patient_id: "p2" },
        ],
        error: null,
      });

      const req = createMockRequest("GET", "http://localhost/api/admin/line/rich-menus");
      const res = await GET(req);
      const json = await res.json();
      expect(res.status).toBe(200);
      expect(json.menus).toHaveLength(3);
    });

    it("DBエラー → 500", async () => {
      tableChains["rich_menus"] = createChain({ data: null, error: { message: "DB error" } });
      const req = createMockRequest("GET", "http://localhost/api/admin/line/rich-menus");
      const res = await GET(req);
      expect(res.status).toBe(500);
    });
  });

  // ========================================
  // POST: リッチメニュー作成
  // ========================================
  describe("POST: リッチメニュー作成", () => {
    it("認証失敗 → 401", async () => {
      (verifyAdminAuth as any).mockResolvedValue(false);
      const req = createMockRequest("POST", "http://localhost/api/admin/line/rich-menus");
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it("バリデーション失敗 → parseBody のエラーレスポンス", async () => {
      const mockErrorResponse = new Response(JSON.stringify({ ok: false, error: "入力値が不正です" }), { status: 400 });
      (parseBody as any).mockResolvedValue({ error: mockErrorResponse });

      const req = createMockRequest("POST", "http://localhost/api/admin/line/rich-menus");
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("画像なし → DB保存のみ（LINE API 登録なし）", async () => {
      (parseBody as any).mockResolvedValue({
        data: {
          name: "テストメニュー",
          chat_bar_text: "メニュー",
          selected: false,
          size_type: "full",
          areas: [],
          image_url: null,
        },
      });

      tableChains["rich_menus"] = createChain({
        data: { id: 1, name: "テストメニュー" },
        error: null,
      });

      const req = createMockRequest("POST", "http://localhost/api/admin/line/rich-menus");
      const res = await POST(req);
      const json = await res.json();
      expect(res.status).toBe(200);
      expect(json.menu.name).toBe("テストメニュー");
    });

    it("画像あり → DB保存 + LINE API 登録（after コールバック）", async () => {
      (parseBody as any).mockResolvedValue({
        data: {
          name: "画像付きメニュー",
          chat_bar_text: "メニュー",
          selected: true,
          size_type: "full",
          areas: [],
          image_url: "https://example.com/image.png",
        },
      });

      tableChains["rich_menus"] = createChain({
        data: { id: 1, name: "画像付きメニュー" },
        error: null,
      });

      const req = createMockRequest("POST", "http://localhost/api/admin/line/rich-menus");
      const res = await POST(req);
      const json = await res.json();
      expect(res.status).toBe(200);
      expect(json.menu.name).toBe("画像付きメニュー");
    });

    it("DB挿入エラー → 500", async () => {
      (parseBody as any).mockResolvedValue({
        data: {
          name: "テスト",
          chat_bar_text: "メニュー",
          selected: false,
          size_type: "full",
          areas: [],
          image_url: null,
        },
      });

      tableChains["rich_menus"] = createChain({ data: null, error: { message: "insert error" } });

      const req = createMockRequest("POST", "http://localhost/api/admin/line/rich-menus");
      const res = await POST(req);
      expect(res.status).toBe(500);
    });
  });
});
