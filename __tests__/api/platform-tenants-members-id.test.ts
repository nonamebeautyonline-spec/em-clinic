// __tests__/api/platform-tenants-members-id.test.ts
// メンバー個別のロール変更・削除API（platform/tenants/[tenantId]/members/[memberId]）のテスト
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

import { PUT, DELETE } from "@/app/api/platform/tenants/[tenantId]/members/[memberId]/route";
import { verifyPlatformAdmin } from "@/lib/platform-auth";
import { parseBody } from "@/lib/validations/helpers";
import { NextRequest } from "next/server";

// テスト用ヘルパー
function makeReq(method = "PUT", body?: object) {
  const url = "http://localhost:3000/api/platform/tenants/tenant-1/members/member-1";
  return new NextRequest(url, {
    method,
    ...(body ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } } : {}),
  });
}

function makeCtx(tenantId = "tenant-1", memberId = "member-1") {
  return { params: Promise.resolve({ tenantId, memberId }) };
}

// ===== テスト =====
describe("platform/tenants/[tenantId]/members/[memberId] API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableChains = {};
  });

  // ===== PUT =====
  describe("PUT: メンバーロール変更", () => {
    it("認証失敗で403を返す", async () => {
      vi.mocked(verifyPlatformAdmin).mockResolvedValueOnce(null);
      const res = await PUT(makeReq("PUT", { role: "admin" }), makeCtx());
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(json.error).toBe("権限がありません");
    });

    it("バリデーションエラーでparseBodyのエラーを返す", async () => {
      const errorResponse = new Response(JSON.stringify({ ok: false, error: "入力値が不正です" }), { status: 400 });
      vi.mocked(parseBody).mockResolvedValueOnce({ error: errorResponse as any });
      const res = await PUT(makeReq("PUT"), makeCtx());
      expect(res.status).toBe(400);
    });

    it("メンバーが存在しない場合404を返す", async () => {
      vi.mocked(parseBody).mockResolvedValueOnce({ data: { role: "admin" } });
      tableChains["tenant_members"] = createChain({ data: null, error: null });

      const res = await PUT(makeReq("PUT", { role: "admin" }), makeCtx());
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toBe("メンバーが見つかりません");
    });

    it("正常にロール変更で200を返す", async () => {
      vi.mocked(parseBody).mockResolvedValueOnce({ data: { role: "viewer" } });

      let callCount = 0;
      const chain = createChain();
      chain.then = vi.fn((resolve: any) => {
        callCount++;
        if (callCount === 1) {
          // メンバー存在確認
          return resolve({
            data: {
              id: "member-1",
              role: "admin",
              admin_users: { id: "u1", name: "山田", email: "yamada@example.com" },
            },
            error: null,
          });
        }
        // ロール更新
        return resolve({ data: null, error: null });
      });
      tableChains["tenant_members"] = chain;

      const res = await PUT(makeReq("PUT", { role: "viewer" }), makeCtx());
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.role).toBe("viewer");
    });

    it("ロール更新DB失敗で500を返す", async () => {
      vi.mocked(parseBody).mockResolvedValueOnce({ data: { role: "viewer" } });

      let callCount = 0;
      const chain = createChain();
      chain.then = vi.fn((resolve: any) => {
        callCount++;
        if (callCount === 1) {
          return resolve({
            data: { id: "member-1", role: "admin", admin_users: { id: "u1", name: "山田", email: "y@e.com" } },
            error: null,
          });
        }
        return resolve({ data: null, error: { message: "update failed" } });
      });
      tableChains["tenant_members"] = chain;

      const res = await PUT(makeReq("PUT", { role: "viewer" }), makeCtx());
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toBe("ロールの変更に失敗しました");
    });

    it("tenantIdとmemberIdの両方がクエリ条件に使われる", async () => {
      vi.mocked(parseBody).mockResolvedValueOnce({ data: { role: "admin" } });
      const chain = createChain({
        data: { id: "m-99", role: "owner", admin_users: { id: "u1", name: "T", email: "t@e.com" } },
        error: null,
      });
      tableChains["tenant_members"] = chain;

      await PUT(makeReq("PUT", { role: "admin" }), makeCtx("t-99", "m-99"));
      expect(chain.eq).toHaveBeenCalledWith("id", "m-99");
      expect(chain.eq).toHaveBeenCalledWith("tenant_id", "t-99");
    });
  });

  // ===== DELETE =====
  describe("DELETE: メンバー削除", () => {
    it("認証失敗で403を返す", async () => {
      vi.mocked(verifyPlatformAdmin).mockResolvedValueOnce(null);
      const res = await DELETE(makeReq("DELETE"), makeCtx());
      expect(res.status).toBe(403);
    });

    it("メンバーが存在しない場合404を返す", async () => {
      tableChains["tenant_members"] = createChain({ data: null, error: null });

      const res = await DELETE(makeReq("DELETE"), makeCtx());
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toBe("メンバーが見つかりません");
    });

    it("最後のオーナーを削除しようとすると400を返す", async () => {
      let callCount = 0;
      const chain = createChain();
      chain.then = vi.fn((resolve: any) => {
        callCount++;
        if (callCount === 1) {
          // メンバー存在確認: roleがowner
          return resolve({
            data: {
              id: "member-1",
              role: "owner",
              admin_user_id: "u1",
              admin_users: { id: "u1", name: "山田", email: "y@e.com" },
            },
            error: null,
          });
        }
        if (callCount === 2) {
          // オーナー数チェック: 他にオーナーなし（count=0）
          return resolve({ count: 0, error: null });
        }
        return resolve({ data: null, error: null });
      });
      tableChains["tenant_members"] = chain;

      const res = await DELETE(makeReq("DELETE"), makeCtx());
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("オーナーは最低1人必要です");
    });

    it("他にオーナーがいればオーナーも削除できる", async () => {
      let callCount = 0;
      const chain = createChain();
      chain.then = vi.fn((resolve: any) => {
        callCount++;
        if (callCount === 1) {
          return resolve({
            data: { id: "member-1", role: "owner", admin_user_id: "u1", admin_users: { id: "u1", name: "山田", email: "y@e.com" } },
            error: null,
          });
        }
        if (callCount === 2) {
          // 他にオーナーが1人いる
          return resolve({ count: 1, error: null });
        }
        // 削除成功
        return resolve({ data: null, error: null });
      });
      tableChains["tenant_members"] = chain;
      tableChains["admin_users"] = createChain({ data: null, error: null });

      const res = await DELETE(makeReq("DELETE"), makeCtx());
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
    });

    it("admin ロールのメンバーはオーナーチェックなしで削除可能", async () => {
      let callCount = 0;
      const chain = createChain();
      chain.then = vi.fn((resolve: any) => {
        callCount++;
        if (callCount === 1) {
          return resolve({
            data: { id: "member-1", role: "admin", admin_user_id: "u1", admin_users: { id: "u1", name: "田中", email: "t@e.com" } },
            error: null,
          });
        }
        // 削除成功（オーナーチェックは通らない）
        return resolve({ data: null, error: null });
      });
      tableChains["tenant_members"] = chain;
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
        if (callCount === 1) {
          return resolve({
            data: { id: "member-1", role: "admin", admin_user_id: "u1", admin_users: { id: "u1", name: "田中", email: "t@e.com" } },
            error: null,
          });
        }
        // 削除失敗
        return resolve({ data: null, error: { message: "delete failed" } });
      });
      tableChains["tenant_members"] = chain;

      const res = await DELETE(makeReq("DELETE"), makeCtx());
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toBe("メンバーの削除に失敗しました");
    });

    it("削除後にadmin_usersが無効化される", async () => {
      let callCount = 0;
      const chain = createChain();
      chain.then = vi.fn((resolve: any) => {
        callCount++;
        if (callCount === 1) {
          return resolve({
            data: { id: "member-1", role: "admin", admin_user_id: "u1", admin_users: { id: "u1", name: "田中", email: "t@e.com" } },
            error: null,
          });
        }
        return resolve({ data: null, error: null });
      });
      tableChains["tenant_members"] = chain;
      tableChains["admin_users"] = createChain({ data: null, error: null });

      await DELETE(makeReq("DELETE"), makeCtx());
      const { supabaseAdmin } = await import("@/lib/supabase");
      expect(supabaseAdmin.from).toHaveBeenCalledWith("admin_users");
      expect(tableChains["admin_users"].update).toHaveBeenCalledWith({ is_active: false });
    });

    it("予期しない例外で500を返す", async () => {
      const chain = createChain();
      chain.then = vi.fn(() => { throw new Error("unexpected error"); });
      tableChains["tenant_members"] = chain;

      const res = await DELETE(makeReq("DELETE"), makeCtx());
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toBe("予期しないエラーが発生しました");
    });
  });
});
