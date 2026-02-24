// __tests__/api/account.test.ts
// アカウント管理API（パスワード変更・メールアドレス変更）テスト
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Supabase チェーンモック ---
function createChain(defaultResolve = { data: null, error: null }) {
  const chain: any = {};
  ["insert", "update", "delete", "select", "eq", "neq", "gt", "gte", "lt", "lte",
    "in", "is", "not", "order", "limit", "range", "single", "maybeSingle", "upsert",
    "ilike", "or", "count", "csv"].forEach(m => {
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

// --- 認証モック ---
const mockVerifyAdminAuth = vi.fn();
const mockGetAdminUserId = vi.fn();

vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: (...args: any[]) => mockVerifyAdminAuth(...args),
  getAdminUserId: (...args: any[]) => mockGetAdminUserId(...args),
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  withTenant: vi.fn((q: any) => q),
  tenantPayload: vi.fn(() => ({ tenantId: "test-tenant" })),
}));

// --- パスワードポリシーモック ---
vi.mock("@/lib/password-policy", () => ({
  checkPasswordHistory: vi.fn().mockResolvedValue(true),
  savePasswordHistory: vi.fn().mockResolvedValue(undefined),
}));

// --- bcrypt モック ---
const mockBcryptCompare = vi.fn();
const mockBcryptHash = vi.fn().mockResolvedValue("hashed-new-pw");

vi.mock("bcryptjs", () => ({
  default: { compare: (...args: any[]) => mockBcryptCompare(...args), hash: (...args: any[]) => mockBcryptHash(...args) },
  compare: (...args: any[]) => mockBcryptCompare(...args),
  hash: (...args: any[]) => mockBcryptHash(...args),
}));

// --- リクエスト生成ヘルパー ---
function createMockRequest(method: string, url: string, body?: any) {
  const req = new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return req as any;
}

import { PUT, PATCH } from "@/app/api/admin/account/route";

describe("アカウント管理 API - PUT パスワード変更", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableChains = {};
    mockVerifyAdminAuth.mockResolvedValue(true);
    mockGetAdminUserId.mockResolvedValue("user-1");
  });

  it("認証なし → 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const req = createMockRequest("PUT", "http://localhost/api/admin/account", {
      currentPassword: "old-pass",
      newPassword: "New-Pass-123!",
    });
    const res = await PUT(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("認証が必要です");
  });

  it("userId取得不可 → 401", async () => {
    mockGetAdminUserId.mockResolvedValue(null);
    const req = createMockRequest("PUT", "http://localhost/api/admin/account", {
      currentPassword: "old-pass",
      newPassword: "New-Pass-123!",
    });
    const res = await PUT(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("ユーザー情報を取得できません");
  });

  it("バリデーションエラー（newPasswordが短すぎ）→ 400", async () => {
    const req = createMockRequest("PUT", "http://localhost/api/admin/account", {
      currentPassword: "old-pass",
      newPassword: "short",
    });
    const res = await PUT(req);
    expect(res.status).toBe(400);
  });

  it("ユーザーが見つからない → 404", async () => {
    const chain = getOrCreateChain("admin_users");
    chain.then = vi.fn((resolve: any) => resolve({ data: null, error: { message: "Not found" } }));

    const req = createMockRequest("PUT", "http://localhost/api/admin/account", {
      currentPassword: "old-pass",
      newPassword: "New-Pass-123!",
    });
    const res = await PUT(req);
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe("ユーザーが見つかりません");
  });

  it("現在のパスワードが不一致 → 400", async () => {
    const chain = getOrCreateChain("admin_users");
    // select → single の結果: ユーザーが見つかる
    chain.then = vi.fn((resolve: any) => resolve({ data: { password_hash: "existing-hash" }, error: null }));
    mockBcryptCompare.mockResolvedValue(false);

    const req = createMockRequest("PUT", "http://localhost/api/admin/account", {
      currentPassword: "wrong-password",
      newPassword: "New-Pass-123!",
    });
    const res = await PUT(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("現在のパスワードが正しくありません");
  });

  it("パスワード変更成功 → 200", async () => {
    const chain = getOrCreateChain("admin_users");
    // 1回目: select→single（ユーザー取得）、2回目: update→eq（更新）
    let callCount = 0;
    chain.then = vi.fn((resolve: any) => {
      callCount++;
      if (callCount === 1) {
        return resolve({ data: { password_hash: "existing-hash" }, error: null });
      }
      return resolve({ data: null, error: null });
    });
    mockBcryptCompare.mockResolvedValue(true);

    const req = createMockRequest("PUT", "http://localhost/api/admin/account", {
      currentPassword: "correct-password",
      newPassword: "New-Pass-123!",
    });
    const res = await PUT(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.message).toBe("パスワードを変更しました");
  });

  it("パスワード更新DBエラー → 500", async () => {
    const chain = getOrCreateChain("admin_users");
    let callCount = 0;
    chain.then = vi.fn((resolve: any) => {
      callCount++;
      if (callCount === 1) {
        return resolve({ data: { password_hash: "existing-hash" }, error: null });
      }
      return resolve({ data: null, error: { message: "DB error" } });
    });
    mockBcryptCompare.mockResolvedValue(true);

    const req = createMockRequest("PUT", "http://localhost/api/admin/account", {
      currentPassword: "correct-password",
      newPassword: "New-Pass-123!",
    });
    const res = await PUT(req);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("パスワードの更新に失敗しました");
  });
});

describe("アカウント管理 API - PATCH メールアドレス変更", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableChains = {};
    mockVerifyAdminAuth.mockResolvedValue(true);
    mockGetAdminUserId.mockResolvedValue("user-1");
  });

  it("認証なし → 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const req = createMockRequest("PATCH", "http://localhost/api/admin/account", {
      newEmail: "new@example.com",
      password: "my-password",
    });
    const res = await PATCH(req);
    expect(res.status).toBe(401);
  });

  it("userId取得不可 → 401", async () => {
    mockGetAdminUserId.mockResolvedValue(null);
    const req = createMockRequest("PATCH", "http://localhost/api/admin/account", {
      newEmail: "new@example.com",
      password: "my-password",
    });
    const res = await PATCH(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("ユーザー情報を取得できません");
  });

  it("無効なメールアドレス → 400", async () => {
    const req = createMockRequest("PATCH", "http://localhost/api/admin/account", {
      newEmail: "not-an-email",
      password: "my-password",
    });
    const res = await PATCH(req);
    expect(res.status).toBe(400);
  });

  it("ユーザーが見つからない → 404", async () => {
    const chain = getOrCreateChain("admin_users");
    chain.then = vi.fn((resolve: any) => resolve({ data: null, error: { message: "Not found" } }));

    const req = createMockRequest("PATCH", "http://localhost/api/admin/account", {
      newEmail: "new@example.com",
      password: "my-password",
    });
    const res = await PATCH(req);
    expect(res.status).toBe(404);
  });

  it("パスワードが不一致 → 400", async () => {
    const chain = getOrCreateChain("admin_users");
    chain.then = vi.fn((resolve: any) => resolve({ data: { password_hash: "hash", tenant_id: "t1" }, error: null }));
    mockBcryptCompare.mockResolvedValue(false);

    const req = createMockRequest("PATCH", "http://localhost/api/admin/account", {
      newEmail: "new@example.com",
      password: "wrong-password",
    });
    const res = await PATCH(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("パスワードが正しくありません");
  });

  it("メールアドレス重複 → 409", async () => {
    const chain = getOrCreateChain("admin_users");
    let callCount = 0;
    chain.then = vi.fn((resolve: any) => {
      callCount++;
      if (callCount === 1) {
        // ユーザー取得成功
        return resolve({ data: { password_hash: "hash", tenant_id: "t1" }, error: null });
      }
      if (callCount === 2) {
        // 重複チェック: 既存ユーザーが見つかる
        return resolve({ data: { id: "other-user" }, error: null });
      }
      return resolve({ data: null, error: null });
    });
    mockBcryptCompare.mockResolvedValue(true);

    const req = createMockRequest("PATCH", "http://localhost/api/admin/account", {
      newEmail: "existing@example.com",
      password: "correct-password",
    });
    const res = await PATCH(req);
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toBe("このメールアドレスは既に使用されています");
  });

  it("メールアドレス変更成功 → 200", async () => {
    const chain = getOrCreateChain("admin_users");
    let callCount = 0;
    chain.then = vi.fn((resolve: any) => {
      callCount++;
      if (callCount === 1) {
        return resolve({ data: { password_hash: "hash", tenant_id: "t1" }, error: null });
      }
      if (callCount === 2) {
        // 重複チェック: 既存ユーザーなし
        return resolve({ data: null, error: null });
      }
      // update成功
      return resolve({ data: null, error: null });
    });
    mockBcryptCompare.mockResolvedValue(true);

    const req = createMockRequest("PATCH", "http://localhost/api/admin/account", {
      newEmail: "new@example.com",
      password: "correct-password",
    });
    const res = await PATCH(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.message).toContain("メールアドレスを変更しました");
  });

  it("メール更新DBエラー → 500", async () => {
    const chain = getOrCreateChain("admin_users");
    let callCount = 0;
    chain.then = vi.fn((resolve: any) => {
      callCount++;
      if (callCount === 1) {
        return resolve({ data: { password_hash: "hash", tenant_id: "t1" }, error: null });
      }
      if (callCount === 2) {
        return resolve({ data: null, error: null });
      }
      return resolve({ data: null, error: { message: "DB error" } });
    });
    mockBcryptCompare.mockResolvedValue(true);

    const req = createMockRequest("PATCH", "http://localhost/api/admin/account", {
      newEmail: "new@example.com",
      password: "correct-password",
    });
    const res = await PATCH(req);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("メールアドレスの更新に失敗しました");
  });
});
