// __tests__/api/platform-tenants-members.test.ts
// テナントメンバー一覧取得・追加API（platform/tenants/[tenantId]/members）のテスト
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

// bcryptjs のモック
vi.mock("bcryptjs", () => ({
  default: { hash: vi.fn().mockResolvedValue("hashed-password-123") },
}));

// username のモック
vi.mock("@/lib/username", () => ({
  generateUsername: vi.fn().mockResolvedValue("LP-TEST1"),
}));

import { GET, POST } from "@/app/api/platform/tenants/[tenantId]/members/route";
import { verifyPlatformAdmin } from "@/lib/platform-auth";
import { parseBody } from "@/lib/validations/helpers";
import { NextRequest } from "next/server";

// テスト用ヘルパー
function makeReq(method = "GET", body?: object) {
  const url = "http://localhost:3000/api/platform/tenants/tenant-1/members";
  return new NextRequest(url, {
    method,
    ...(body ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } } : {}),
  });
}

function makeCtx(tenantId = "tenant-1") {
  return { params: Promise.resolve({ tenantId }) };
}

// ===== テスト =====
describe("platform/tenants/[tenantId]/members API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableChains = {};
  });

  // ===== GET =====
  describe("GET: メンバー一覧取得", () => {
    it("認証失敗で403を返す", async () => {
      vi.mocked(verifyPlatformAdmin).mockResolvedValueOnce(null);
      const res = await GET(makeReq(), makeCtx());
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(json.error).toBe("権限がありません");
    });

    it("テナントが存在しない場合404を返す", async () => {
      tableChains["tenants"] = createChain({ data: null, error: null });
      const res = await GET(makeReq(), makeCtx());
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toBe("テナントが見つかりません");
    });

    it("正常にメンバー一覧を返す", async () => {
      // テナント存在確認: OK
      const tenantsChain = createChain({ data: { id: "tenant-1" }, error: null });
      tableChains["tenants"] = tenantsChain;

      // メンバー一覧
      const membersData = [
        { id: "m1", role: "owner", created_at: "2026-01-01", admin_users: { id: "u1", name: "山田", email: "yamada@example.com" } },
        { id: "m2", role: "admin", created_at: "2026-01-02", admin_users: { id: "u2", name: "田中", email: "tanaka@example.com" } },
      ];
      const membersChain = createChain({ data: membersData, error: null });
      tableChains["tenant_members"] = membersChain;

      const res = await GET(makeReq(), makeCtx());
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.members).toHaveLength(2);
      expect(json.members[0].role).toBe("owner");
    });

    it("メンバーが0件の場合空配列を返す", async () => {
      tableChains["tenants"] = createChain({ data: { id: "tenant-1" }, error: null });
      tableChains["tenant_members"] = createChain({ data: [], error: null });

      const res = await GET(makeReq(), makeCtx());
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.members).toEqual([]);
    });

    it("DBエラーで500を返す", async () => {
      tableChains["tenants"] = createChain({ data: { id: "tenant-1" }, error: null });
      tableChains["tenant_members"] = createChain({ data: null, error: { message: "query failed" } });

      const res = await GET(makeReq(), makeCtx());
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toBe("メンバー一覧の取得に失敗しました");
    });

    it("予期しない例外で500を返す", async () => {
      tableChains["tenants"] = createChain({ data: { id: "tenant-1" }, error: null });
      const membersChain = createChain();
      membersChain.then = vi.fn(() => { throw new Error("unexpected"); });
      tableChains["tenant_members"] = membersChain;

      const res = await GET(makeReq(), makeCtx());
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toBe("予期しないエラーが発生しました");
    });
  });

  // ===== POST =====
  describe("POST: メンバー追加", () => {
    const validBody = {
      name: "新メンバー",
      email: "new@example.com",
      password: "password123",
      role: "admin",
    };

    it("認証失敗で403を返す", async () => {
      vi.mocked(verifyPlatformAdmin).mockResolvedValueOnce(null);
      const res = await POST(makeReq("POST", validBody), makeCtx());
      expect(res.status).toBe(403);
    });

    it("バリデーションエラーでparseBodyのエラーを返す", async () => {
      const errorResponse = new Response(JSON.stringify({ ok: false, error: "入力値が不正です" }), { status: 400 });
      vi.mocked(parseBody).mockResolvedValueOnce({ error: errorResponse as any });
      const res = await POST(makeReq("POST"), makeCtx());
      expect(res.status).toBe(400);
    });

    it("テナントが存在しない場合404を返す", async () => {
      vi.mocked(parseBody).mockResolvedValueOnce({ data: validBody });
      tableChains["tenants"] = createChain({ data: null, error: null });

      const res = await POST(makeReq("POST", validBody), makeCtx());
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toBe("テナントが見つかりません");
    });

    it("メールアドレス重複で409を返す", async () => {
      vi.mocked(parseBody).mockResolvedValueOnce({ data: validBody });
      tableChains["tenants"] = createChain({ data: { id: "tenant-1", name: "テスト" }, error: null });
      tableChains["admin_users"] = createChain({ data: { id: "existing-user" }, error: null });

      const res = await POST(makeReq("POST", validBody), makeCtx());
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error).toBe("このメールアドレスは既に使用されています");
    });

    it("正常にメンバーが作成され201を返す", async () => {
      vi.mocked(parseBody).mockResolvedValueOnce({ data: validBody });

      // テナント存在確認
      tableChains["tenants"] = createChain({ data: { id: "tenant-1", name: "テスト" }, error: null });

      // admin_users: メール重複なし → ユーザー作成成功
      let adminCallCount = 0;
      const adminChain = createChain();
      adminChain.then = vi.fn((resolve: any) => {
        adminCallCount++;
        if (adminCallCount === 1) return resolve({ data: null, error: null }); // メール重複チェック: なし
        if (adminCallCount === 2) return resolve({ data: { id: "new-user-1", username: "LP-TEST1" }, error: null }); // INSERT成功
        return resolve({ data: null, error: null });
      });
      tableChains["admin_users"] = adminChain;

      // tenant_members: 紐付け成功
      tableChains["tenant_members"] = createChain({
        data: { id: "member-1", role: "admin", created_at: "2026-01-01" },
        error: null,
      });

      const res = await POST(makeReq("POST", validBody), makeCtx());
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.member.admin_users.email).toBe("new@example.com");
      expect(json.member.admin_users.username).toBe("LP-TEST1");
    });

    it("ユーザー作成失敗で500を返す", async () => {
      vi.mocked(parseBody).mockResolvedValueOnce({ data: validBody });
      tableChains["tenants"] = createChain({ data: { id: "tenant-1", name: "テスト" }, error: null });

      let adminCallCount = 0;
      const adminChain = createChain();
      adminChain.then = vi.fn((resolve: any) => {
        adminCallCount++;
        if (adminCallCount === 1) return resolve({ data: null, error: null }); // 重複なし
        if (adminCallCount === 2) return resolve({ data: null, error: { message: "insert failed" } }); // INSERT失敗
        return resolve({ data: null, error: null });
      });
      tableChains["admin_users"] = adminChain;

      const res = await POST(makeReq("POST", validBody), makeCtx());
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toBe("ユーザーの作成に失敗しました");
    });

    it("メンバー紐付け失敗で500を返し、ユーザーがロールバック削除される", async () => {
      vi.mocked(parseBody).mockResolvedValueOnce({ data: validBody });
      tableChains["tenants"] = createChain({ data: { id: "tenant-1", name: "テスト" }, error: null });

      let adminCallCount = 0;
      const adminChain = createChain();
      adminChain.then = vi.fn((resolve: any) => {
        adminCallCount++;
        if (adminCallCount === 1) return resolve({ data: null, error: null }); // 重複なし
        if (adminCallCount === 2) return resolve({ data: { id: "new-user-1", username: "LP-TEST1" }, error: null }); // INSERT成功
        return resolve({ data: null, error: null }); // ロールバック削除
      });
      tableChains["admin_users"] = adminChain;

      // tenant_members: 紐付け失敗
      tableChains["tenant_members"] = createChain({ data: null, error: { message: "member insert failed" } });

      const res = await POST(makeReq("POST", validBody), makeCtx());
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toBe("メンバーの追加に失敗しました");
      // ロールバック: admin_usersのdeleteが呼ばれることを確認
      expect(adminChain.delete).toHaveBeenCalled();
    });
  });
});
