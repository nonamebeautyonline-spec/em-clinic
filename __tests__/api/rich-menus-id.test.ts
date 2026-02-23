// __tests__/api/rich-menus-id.test.ts
// リッチメニュー更新・削除API（admin/line/rich-menus/[id]）のテスト
import { describe, it, expect, vi, beforeEach } from "vitest";

// ===== チェーンモック =====
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

// ===== モック =====
vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: { from: vi.fn((table: string) => getOrCreateChain(table)) },
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  withTenant: vi.fn((q: any) => q),
  tenantPayload: vi.fn(() => ({ tenant_id: "test-tenant" })),
}));

vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: vi.fn().mockResolvedValue({ userId: "user-1", role: "admin", tenantId: "test-tenant" }),
}));

vi.mock("@/lib/validations/helpers", () => ({
  parseBody: vi.fn(),
}));

vi.mock("@/lib/line-richmenu", () => ({
  createLineRichMenu: vi.fn().mockResolvedValue("richmenu-new-123"),
  uploadRichMenuImage: vi.fn().mockResolvedValue(true),
  deleteLineRichMenu: vi.fn().mockResolvedValue(true),
  setDefaultRichMenu: vi.fn().mockResolvedValue(true),
  bulkLinkRichMenu: vi.fn().mockResolvedValue({ linked: 5, failed: 0 }),
}));

import { PUT, DELETE } from "@/app/api/admin/line/rich-menus/[id]/route";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { parseBody } from "@/lib/validations/helpers";
import { createLineRichMenu, uploadRichMenuImage, deleteLineRichMenu, setDefaultRichMenu } from "@/lib/line-richmenu";
import { NextRequest } from "next/server";

// テスト用ヘルパー
function makeReq(method = "PUT", body?: object) {
  const url = "http://localhost:3000/api/admin/line/rich-menus/42";
  return new NextRequest(url, {
    method,
    headers: { "content-type": "application/json", "origin": "http://localhost:3000" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

function makeCtx(id = "42") {
  return { params: Promise.resolve({ id }) };
}

// ===== テスト =====
describe("admin/line/rich-menus/[id] API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableChains = {};
  });

  // ===== PUT =====
  describe("PUT: リッチメニュー更新", () => {
    it("認証失敗で401を返す", async () => {
      vi.mocked(verifyAdminAuth).mockResolvedValueOnce(null as any);
      const res = await PUT(makeReq(), makeCtx());
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe("Unauthorized");
    });

    it("バリデーションエラーでparseBodyのエラーを返す", async () => {
      const errorResponse = new Response(JSON.stringify({ ok: false, error: "入力値が不正です" }), { status: 400 });
      vi.mocked(parseBody).mockResolvedValueOnce({ error: errorResponse as any });
      const res = await PUT(makeReq(), makeCtx());
      expect(res.status).toBe(400);
    });

    it("画像URLなしの場合、LINE API同期せずにDB更新のみ実行", async () => {
      const menuData = { id: 42, name: "テストメニュー", image_url: null, selected: false };
      vi.mocked(parseBody).mockResolvedValueOnce({ data: { name: "テストメニュー" } });

      let callCount = 0;
      const chain = createChain();
      chain.then = vi.fn((resolve: any) => {
        callCount++;
        if (callCount === 1) return resolve({ data: { line_rich_menu_id: null }, error: null }); // 既存メニュー
        if (callCount === 2) return resolve({ data: menuData, error: null }); // DB更新
        return resolve({ data: null, error: null });
      });
      tableChains["rich_menus"] = chain;

      const res = await PUT(makeReq(), makeCtx());
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.menu.name).toBe("テストメニュー");
      // LINE APIは呼ばれない
      expect(createLineRichMenu).not.toHaveBeenCalled();
    });

    it("画像URLありの場合、LINE APIへの同期が実行される", async () => {
      const menuData = {
        id: 42,
        name: "テストメニュー",
        image_url: "https://example.com/menu.png",
        selected: false,
        line_rich_menu_id: null,
      };
      vi.mocked(parseBody).mockResolvedValueOnce({ data: { name: "テストメニュー", image_url: "https://example.com/menu.png" } });

      let callCount = 0;
      const chain = createChain();
      chain.then = vi.fn((resolve: any) => {
        callCount++;
        if (callCount === 1) return resolve({ data: { line_rich_menu_id: null }, error: null }); // 既存メニュー
        if (callCount === 2) return resolve({ data: menuData, error: null }); // DB更新
        if (callCount === 3) return resolve({ data: null, error: null }); // line_rich_menu_id更新
        return resolve({ data: null, error: null });
      });
      tableChains["rich_menus"] = chain;

      const res = await PUT(makeReq(), makeCtx());
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.sync_ok).toBe(true);
      // LINE APIが呼ばれたことを確認
      expect(createLineRichMenu).toHaveBeenCalled();
      expect(uploadRichMenuImage).toHaveBeenCalled();
    });

    it("LINE API メニュー作成失敗でsync_errorが返る", async () => {
      const menuData = { id: 42, name: "テストメニュー", image_url: "https://example.com/menu.png", selected: false };
      vi.mocked(parseBody).mockResolvedValueOnce({ data: { name: "テストメニュー", image_url: "https://example.com/menu.png" } });
      vi.mocked(createLineRichMenu).mockResolvedValueOnce(null);

      let callCount = 0;
      const chain = createChain();
      chain.then = vi.fn((resolve: any) => {
        callCount++;
        if (callCount === 1) return resolve({ data: { line_rich_menu_id: null }, error: null });
        if (callCount === 2) return resolve({ data: menuData, error: null });
        return resolve({ data: null, error: null });
      });
      tableChains["rich_menus"] = chain;

      const res = await PUT(makeReq(), makeCtx());
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.sync_error).toContain("LINE menu create failed");
    });

    it("画像アップロード失敗でsync_errorが返る", async () => {
      const menuData = { id: 42, name: "テストメニュー", image_url: "https://example.com/menu.png", selected: false };
      vi.mocked(parseBody).mockResolvedValueOnce({ data: { name: "テストメニュー", image_url: "https://example.com/menu.png" } });
      vi.mocked(uploadRichMenuImage).mockResolvedValueOnce(false);

      let callCount = 0;
      const chain = createChain();
      chain.then = vi.fn((resolve: any) => {
        callCount++;
        if (callCount === 1) return resolve({ data: { line_rich_menu_id: null }, error: null });
        if (callCount === 2) return resolve({ data: menuData, error: null });
        return resolve({ data: null, error: null });
      });
      tableChains["rich_menus"] = chain;

      const res = await PUT(makeReq(), makeCtx());
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.sync_error).toContain("image upload failed");
      // 作成されたメニューを削除
      expect(deleteLineRichMenu).toHaveBeenCalledWith("richmenu-new-123", "test-tenant");
    });

    it("selected=trueの場合、デフォルトメニューに設定される", async () => {
      const menuData = {
        id: 42,
        name: "テストメニュー",
        image_url: "https://example.com/menu.png",
        selected: true,
        line_rich_menu_id: null,
      };
      vi.mocked(parseBody).mockResolvedValueOnce({ data: { name: "テストメニュー", image_url: "https://example.com/menu.png", selected: true } });

      let callCount = 0;
      const chain = createChain();
      chain.then = vi.fn((resolve: any) => {
        callCount++;
        if (callCount === 1) return resolve({ data: { line_rich_menu_id: null }, error: null });
        if (callCount === 2) return resolve({ data: menuData, error: null });
        return resolve({ data: null, error: null });
      });
      tableChains["rich_menus"] = chain;

      await PUT(makeReq(), makeCtx());
      expect(setDefaultRichMenu).toHaveBeenCalledWith("richmenu-new-123", "test-tenant");
    });

    it("DB更新失敗で500を返す", async () => {
      vi.mocked(parseBody).mockResolvedValueOnce({ data: { name: "テストメニュー" } });

      let callCount = 0;
      const chain = createChain();
      chain.then = vi.fn((resolve: any) => {
        callCount++;
        if (callCount === 1) return resolve({ data: { line_rich_menu_id: null }, error: null });
        if (callCount === 2) return resolve({ data: null, error: { message: "DB error" } });
        return resolve({ data: null, error: null });
      });
      tableChains["rich_menus"] = chain;

      const res = await PUT(makeReq(), makeCtx());
      expect(res.status).toBe(500);
    });

    it("予期しない例外で500を返す", async () => {
      vi.mocked(parseBody).mockRejectedValueOnce(new Error("parse error"));
      // parseBody自体がrejectすると route 内で catch される前に thrown
      // → parseBody のモックを修正
      vi.mocked(parseBody).mockReset();
      vi.mocked(parseBody).mockImplementationOnce(() => { throw new Error("unexpected"); });

      const res = await PUT(makeReq(), makeCtx());
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toBe("サーバーエラーが発生しました");
    });
  });

  // ===== DELETE =====
  describe("DELETE: リッチメニュー削除", () => {
    it("認証失敗で401を返す", async () => {
      vi.mocked(verifyAdminAuth).mockResolvedValueOnce(null as any);
      const res = await DELETE(makeReq("DELETE"), makeCtx());
      expect(res.status).toBe(401);
    });

    it("LINE側メニューがある場合、LINE APIの削除も実行される", async () => {
      let callCount = 0;
      const chain = createChain();
      chain.then = vi.fn((resolve: any) => {
        callCount++;
        if (callCount === 1) return resolve({ data: { line_rich_menu_id: "richmenu-old-456" }, error: null });
        return resolve({ data: null, error: null }); // DB削除
      });
      tableChains["rich_menus"] = chain;

      const res = await DELETE(makeReq("DELETE"), makeCtx());
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(deleteLineRichMenu).toHaveBeenCalledWith("richmenu-old-456", "test-tenant");
    });

    it("LINE側メニューがない場合、LINE API削除は呼ばれない", async () => {
      let callCount = 0;
      const chain = createChain();
      chain.then = vi.fn((resolve: any) => {
        callCount++;
        if (callCount === 1) return resolve({ data: { line_rich_menu_id: null }, error: null });
        return resolve({ data: null, error: null });
      });
      tableChains["rich_menus"] = chain;

      const res = await DELETE(makeReq("DELETE"), makeCtx());
      expect(res.status).toBe(200);
      expect(deleteLineRichMenu).not.toHaveBeenCalled();
    });

    it("DB削除失敗で500を返す", async () => {
      let callCount = 0;
      const chain = createChain();
      chain.then = vi.fn((resolve: any) => {
        callCount++;
        if (callCount === 1) return resolve({ data: { line_rich_menu_id: null }, error: null });
        return resolve({ data: null, error: { message: "delete failed" } });
      });
      tableChains["rich_menus"] = chain;

      const res = await DELETE(makeReq("DELETE"), makeCtx());
      expect(res.status).toBe(500);
    });

    it("予期しない例外で500を返す", async () => {
      vi.mocked(verifyAdminAuth).mockImplementationOnce(() => { throw new Error("auth crash"); });
      const res = await DELETE(makeReq("DELETE"), makeCtx());
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toBe("サーバーエラーが発生しました");
    });
  });
});
