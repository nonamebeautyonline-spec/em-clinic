// __tests__/api/platform-tenants-id.test.ts
// テナント詳細取得・更新・削除API（platform/tenants/[tenantId]）のテスト
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

vi.mock("@/lib/platform-auth", () => ({
  verifyPlatformAdmin: vi.fn().mockResolvedValue({
    userId: "admin-1",
    email: "admin@example.com",
    name: "管理者",
    tenantId: null,
    platformRole: "platform_admin",
  }),
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(),
}));

vi.mock("@/lib/validations/helpers", () => ({
  parseBody: vi.fn(),
}));

import { GET, PUT, DELETE } from "@/app/api/platform/tenants/[tenantId]/route";
import { verifyPlatformAdmin } from "@/lib/platform-auth";
import { parseBody } from "@/lib/validations/helpers";
import { NextRequest } from "next/server";

// テスト用ヘルパー
function makeReq(method = "GET", body?: object) {
  const url = "http://localhost:3000/api/platform/tenants/tenant-1";
  return new NextRequest(url, {
    method,
    ...(body ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } } : {}),
  });
}

function makeCtx(tenantId = "tenant-1") {
  return { params: Promise.resolve({ tenantId }) };
}

// ===== テスト =====
describe("platform/tenants/[tenantId] API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableChains = {};
  });

  // ===== GET =====
  describe("GET: テナント詳細取得", () => {
    it("認証失敗で403を返す", async () => {
      vi.mocked(verifyPlatformAdmin).mockResolvedValueOnce(null);
      const res = await GET(makeReq(), makeCtx());
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(json.error).toBe("権限がありません");
    });

    it("テナントが見つからない場合404を返す", async () => {
      tableChains["tenants"] = createChain({ data: null, error: { message: "not found" } });
      const res = await GET(makeReq(), makeCtx());
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(json.error).toBe("テナントが見つかりません");
    });

    it("正常取得で200とテナントデータを返す", async () => {
      const tenantData = {
        id: "tenant-1",
        name: "テストクリニック",
        slug: "test-clinic",
        is_active: true,
        tenant_members: [],
        tenant_plans: [],
      };
      tableChains["tenants"] = createChain({ data: tenantData, error: null });
      const res = await GET(makeReq(), makeCtx());
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.tenant).toEqual(tenantData);
    });

    it("DB例外で500を返す", async () => {
      tableChains["tenants"] = createChain();
      tableChains["tenants"].then = vi.fn(() => { throw new Error("DB接続エラー"); });
      const res = await GET(makeReq(), makeCtx());
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(json.error).toBe("テナント情報の取得に失敗しました");
    });

    it("パラメータ tenantId がクエリに使われる", async () => {
      tableChains["tenants"] = createChain({ data: { id: "custom-id" }, error: null });
      await GET(makeReq(), makeCtx("custom-id"));
      expect(tableChains["tenants"].eq).toHaveBeenCalledWith("id", "custom-id");
    });
  });

  // ===== PUT =====
  describe("PUT: テナント情報更新", () => {
    it("認証失敗で403を返す", async () => {
      vi.mocked(verifyPlatformAdmin).mockResolvedValueOnce(null);
      const res = await PUT(makeReq("PUT"), makeCtx());
      expect(res.status).toBe(403);
    });

    it("バリデーションエラーで parseBody のエラーレスポンスを返す", async () => {
      const errorResponse = new Response(JSON.stringify({ ok: false, error: "入力値が不正です" }), { status: 400 });
      vi.mocked(parseBody).mockResolvedValueOnce({ error: errorResponse as any });
      const res = await PUT(makeReq("PUT", { name: "" }), makeCtx());
      expect(res.status).toBe(400);
    });

    it("テナントが存在しない場合404を返す", async () => {
      vi.mocked(parseBody).mockResolvedValueOnce({ data: { name: "新クリニック" } });
      // テナント存在確認: データなし
      tableChains["tenants"] = createChain({ data: null, error: null });
      const res = await PUT(makeReq("PUT", { name: "新クリニック" }), makeCtx());
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toBe("テナントが見つかりません");
    });

    it("slug重複時に409を返す", async () => {
      vi.mocked(parseBody).mockResolvedValueOnce({ data: { slug: "duplicate-slug" } });
      // 1回目のselect: 既存テナント
      const chain = createChain({ data: { id: "tenant-1", slug: "old-slug" }, error: null });
      tableChains["tenants"] = chain;
      // 2回目以降のselect（slug重複チェック）で slugExists が返る
      // chainの .then を調整
      let callCount = 0;
      chain.then = vi.fn((resolve: any) => {
        callCount++;
        if (callCount === 1) return resolve({ data: { id: "tenant-1", slug: "old-slug" }, error: null });
        if (callCount === 2) return resolve({ data: { id: "other-tenant" }, error: null }); // slug重複
        return resolve({ data: null, error: null });
      });

      const res = await PUT(makeReq("PUT", { slug: "duplicate-slug" }), makeCtx());
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error).toBe("このスラグは既に使用されています");
    });

    it("正常更新で200を返す", async () => {
      vi.mocked(parseBody).mockResolvedValueOnce({ data: { name: "新クリニック名" } });
      const updatedTenant = { id: "tenant-1", name: "新クリニック名", slug: "test-clinic", is_active: true, updated_at: "2026-01-01" };
      let callCount = 0;
      const chain = createChain();
      chain.then = vi.fn((resolve: any) => {
        callCount++;
        if (callCount === 1) return resolve({ data: { id: "tenant-1", slug: "test-clinic" }, error: null }); // 存在確認
        if (callCount === 2) return resolve({ data: updatedTenant, error: null }); // 更新
        return resolve({ data: null, error: null });
      });
      tableChains["tenants"] = chain;

      const res = await PUT(makeReq("PUT", { name: "新クリニック名" }), makeCtx());
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.tenant).toEqual(updatedTenant);
    });

    it("更新失敗で500を返す", async () => {
      vi.mocked(parseBody).mockResolvedValueOnce({ data: { name: "新クリニック名" } });
      let callCount = 0;
      const chain = createChain();
      chain.then = vi.fn((resolve: any) => {
        callCount++;
        if (callCount === 1) return resolve({ data: { id: "tenant-1", slug: "test-clinic" }, error: null });
        if (callCount === 2) return resolve({ data: null, error: { message: "DB error" } }); // 更新エラー
        return resolve({ data: null, error: null });
      });
      tableChains["tenants"] = chain;

      const res = await PUT(makeReq("PUT", { name: "新クリニック名" }), makeCtx());
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toBe("テナントの更新に失敗しました");
    });
  });

  // ===== DELETE =====
  describe("DELETE: テナントソフトデリート", () => {
    it("認証失敗で403を返す", async () => {
      vi.mocked(verifyPlatformAdmin).mockResolvedValueOnce(null);
      const res = await DELETE(makeReq("DELETE"), makeCtx());
      expect(res.status).toBe(403);
    });

    it("テナントが存在しない場合404を返す", async () => {
      tableChains["tenants"] = createChain({ data: null, error: null });
      const res = await DELETE(makeReq("DELETE"), makeCtx());
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toBe("テナントが見つかりません");
    });

    it("正常削除で200を返す", async () => {
      let callCount = 0;
      const chain = createChain();
      chain.then = vi.fn((resolve: any) => {
        callCount++;
        // 1回目: 存在確認
        if (callCount === 1) return resolve({ data: { id: "tenant-1", name: "テスト", slug: "test" }, error: null });
        // 2回目: ソフトデリート
        return resolve({ data: null, error: null });
      });
      tableChains["tenants"] = chain;
      tableChains["admin_users"] = createChain({ data: null, error: null });

      const res = await DELETE(makeReq("DELETE"), makeCtx());
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
    });

    it("削除DB障害で500を返す", async () => {
      let callCount = 0;
      const chain = createChain();
      chain.then = vi.fn((resolve: any) => {
        callCount++;
        if (callCount === 1) return resolve({ data: { id: "tenant-1", name: "テスト", slug: "test" }, error: null });
        if (callCount === 2) return resolve({ data: null, error: { message: "delete failed" } }); // ソフトデリートエラー
        return resolve({ data: null, error: null });
      });
      tableChains["tenants"] = chain;

      const res = await DELETE(makeReq("DELETE"), makeCtx());
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toBe("テナントの削除に失敗しました");
    });

    it("削除後にadmin_usersも無効化される", async () => {
      let callCount = 0;
      const chain = createChain();
      chain.then = vi.fn((resolve: any) => {
        callCount++;
        if (callCount === 1) return resolve({ data: { id: "tenant-1", name: "テスト", slug: "test" }, error: null });
        return resolve({ data: null, error: null });
      });
      tableChains["tenants"] = chain;
      tableChains["admin_users"] = createChain({ data: null, error: null });

      await DELETE(makeReq("DELETE"), makeCtx());
      // admin_users テーブルに対して update が呼ばれたことを確認
      const { supabaseAdmin } = await import("@/lib/supabase");
      expect(supabaseAdmin.from).toHaveBeenCalledWith("admin_users");
    });
  });
});
