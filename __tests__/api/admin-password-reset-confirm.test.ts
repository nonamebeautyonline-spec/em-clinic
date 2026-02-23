// __tests__/api/admin-password-reset-confirm.test.ts
// パスワードリセット確認 API のテスト
// 対象: app/api/admin/password-reset/confirm/route.ts
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

// password-reset/confirm は独自に createClient を呼ぶので、
// @supabase/supabase-js をモックする
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn((table: string) => getOrCreateChain(table)),
  })),
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  withTenant: vi.fn((q: any) => q),
  tenantPayload: vi.fn(() => ({ tenant_id: "test-tenant" })),
}));

// parseBody をモック
vi.mock("@/lib/validations/helpers", () => ({
  parseBody: vi.fn(),
}));

// bcryptjs をモック
vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("$2a$12$hashedpassword"),
  },
}));

function createMockRequest(method: string, url: string, body?: any) {
  return {
    method,
    url,
    nextUrl: { searchParams: new URL(url).searchParams },
    cookies: { get: vi.fn(() => undefined) },
    headers: { get: vi.fn(() => null) },
    json: body ? vi.fn().mockResolvedValue(body) : vi.fn(),
  } as any;
}

import { GET, POST } from "@/app/api/admin/password-reset/confirm/route";
import { parseBody } from "@/lib/validations/helpers";

describe("パスワードリセット確認API (password-reset/confirm/route.ts)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableChains = {};
  });

  // ========================================
  // GET: トークン検証
  // ========================================
  describe("GET: トークン検証", () => {
    it("トークンなし → 400", async () => {
      const req = createMockRequest("GET", "http://localhost/api/admin/password-reset/confirm");
      const res = await GET(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("トークンが必要です");
    });

    it("無効なトークン → 400", async () => {
      tableChains["password_reset_tokens"] = createChain({
        data: null,
        error: { message: "not found" },
      });

      const req = createMockRequest("GET", "http://localhost/api/admin/password-reset/confirm?token=invalid");
      const res = await GET(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("無効なトークンです");
    });

    it("使用済みトークン → 400", async () => {
      tableChains["password_reset_tokens"] = createChain({
        data: {
          id: 1,
          expires_at: "2099-12-31T00:00:00Z",
          used_at: "2026-02-20T00:00:00Z", // 使用済み
          admin_user_id: "u1",
          admin_users: { id: "u1", email: "test@test.com", name: "テスト" },
        },
        error: null,
      });

      const req = createMockRequest("GET", "http://localhost/api/admin/password-reset/confirm?token=used-token");
      const res = await GET(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("このリンクは既に使用されています");
    });

    it("期限切れトークン → 400", async () => {
      tableChains["password_reset_tokens"] = createChain({
        data: {
          id: 1,
          expires_at: "2020-01-01T00:00:00Z", // 期限切れ
          used_at: null,
          admin_user_id: "u1",
          admin_users: { id: "u1", email: "test@test.com", name: "テスト" },
        },
        error: null,
      });

      const req = createMockRequest("GET", "http://localhost/api/admin/password-reset/confirm?token=expired-token");
      const res = await GET(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("このリンクは有効期限切れです");
    });

    it("有効なトークン → ユーザー情報を返す", async () => {
      tableChains["password_reset_tokens"] = createChain({
        data: {
          id: 1,
          expires_at: "2099-12-31T00:00:00Z",
          used_at: null,
          admin_user_id: "u1",
          admin_users: { id: "u1", email: "admin@clinic.com", name: "管理者太郎" },
        },
        error: null,
      });

      const req = createMockRequest("GET", "http://localhost/api/admin/password-reset/confirm?token=valid-token");
      const res = await GET(req);
      const json = await res.json();
      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.user.email).toBe("admin@clinic.com");
      expect(json.user.name).toBe("管理者太郎");
    });
  });

  // ========================================
  // POST: パスワード設定
  // ========================================
  describe("POST: パスワード設定", () => {
    it("バリデーション失敗 → parseBody のエラーレスポンス", async () => {
      const mockErrorResponse = new Response(JSON.stringify({ ok: false, error: "入力値が不正です" }), { status: 400 });
      (parseBody as any).mockResolvedValue({ error: mockErrorResponse });

      const req = createMockRequest("POST", "http://localhost/api/admin/password-reset/confirm");
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("無効なトークン → 400", async () => {
      (parseBody as any).mockResolvedValue({
        data: { token: "invalid", password: "newPassword123" },
      });

      tableChains["password_reset_tokens"] = createChain({
        data: null,
        error: { message: "not found" },
      });

      const req = createMockRequest("POST", "http://localhost/api/admin/password-reset/confirm");
      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("無効なトークンです");
    });

    it("使用済みトークン → 400", async () => {
      (parseBody as any).mockResolvedValue({
        data: { token: "used-token", password: "newPassword123" },
      });

      tableChains["password_reset_tokens"] = createChain({
        data: {
          id: 1,
          admin_user_id: "u1",
          expires_at: "2099-12-31T00:00:00Z",
          used_at: "2026-02-20T00:00:00Z",
        },
        error: null,
      });

      const req = createMockRequest("POST", "http://localhost/api/admin/password-reset/confirm");
      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("このリンクは既に使用されています");
    });

    it("期限切れトークン → 400", async () => {
      (parseBody as any).mockResolvedValue({
        data: { token: "expired", password: "newPassword123" },
      });

      tableChains["password_reset_tokens"] = createChain({
        data: {
          id: 1,
          admin_user_id: "u1",
          expires_at: "2020-01-01T00:00:00Z",
          used_at: null,
        },
        error: null,
      });

      const req = createMockRequest("POST", "http://localhost/api/admin/password-reset/confirm");
      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("このリンクは有効期限切れです");
    });

    it("パスワード更新成功", async () => {
      (parseBody as any).mockResolvedValue({
        data: { token: "valid-token", password: "newSecurePassword123" },
      });

      tableChains["password_reset_tokens"] = createChain({
        data: {
          id: 1,
          admin_user_id: "u1",
          expires_at: "2099-12-31T00:00:00Z",
          used_at: null,
        },
        error: null,
      });
      tableChains["admin_users"] = createChain({ data: null, error: null });

      const req = createMockRequest("POST", "http://localhost/api/admin/password-reset/confirm");
      const res = await POST(req);
      const json = await res.json();
      expect(res.status).toBe(200);
      expect(json.ok).toBe(true);
      expect(json.message).toBe("パスワードを設定しました");
    });

    it("パスワード更新失敗 → 500", async () => {
      (parseBody as any).mockResolvedValue({
        data: { token: "valid-token", password: "newSecurePassword123" },
      });

      tableChains["password_reset_tokens"] = createChain({
        data: {
          id: 1,
          admin_user_id: "u1",
          expires_at: "2099-12-31T00:00:00Z",
          used_at: null,
        },
        error: null,
      });
      tableChains["admin_users"] = createChain({ data: null, error: { message: "update failed" } });

      const req = createMockRequest("POST", "http://localhost/api/admin/password-reset/confirm");
      const res = await POST(req);
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toBe("パスワードの更新に失敗しました");
    });
  });
});
