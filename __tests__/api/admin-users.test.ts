// __tests__/api/admin-users.test.ts
// 管理者ユーザー CRUD API（app/api/admin/users/route.ts）のテスト
import { describe, it, expect, vi, beforeEach } from "vitest";

// === モック設定 ===
const mockVerifyAdminAuth = vi.fn().mockResolvedValue(true);
vi.mock("@/lib/admin-auth", () => ({ verifyAdminAuth: mockVerifyAdminAuth }));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  withTenant: vi.fn((query) => query),
  tenantPayload: vi.fn(() => ({ tenant_id: "test-tenant" })),
}));

const mockSendWelcomeEmail = vi.fn().mockResolvedValue({ success: true });
vi.mock("@/lib/email", () => ({
  sendWelcomeEmail: mockSendWelcomeEmail,
}));

const mockGenerateUsername = vi.fn().mockResolvedValue("LP-A1B2C");
vi.mock("@/lib/username", () => ({
  generateUsername: mockGenerateUsername,
}));

// === Supabase モック（createClient経由） ===
let tableChains: Record<string, any> = {};

function createChain(defaultResolve = { data: null, error: null }) {
  const chain: any = {};
  ["insert", "update", "delete", "select", "eq", "neq", "gt", "gte", "lt", "lte",
   "in", "is", "not", "order", "limit", "range", "upsert",
   "ilike", "or", "count", "csv"].forEach(m => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.single = vi.fn().mockReturnValue(chain);
  chain.maybeSingle = vi.fn().mockReturnValue(chain);
  chain.then = vi.fn((resolve: any) => resolve(defaultResolve));
  return chain;
}

function getOrCreateChain(table: string) {
  if (!tableChains[table]) tableChains[table] = createChain();
  return tableChains[table];
}

// admin-users は createClient を直接使うので @supabase/supabase-js をモック
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn((table: string) => getOrCreateChain(table)),
  })),
}));

// supabaseAdmin も念のためモック（generateUsername が内部で使う）
vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => getOrCreateChain(table)),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  tableChains = {};
  mockVerifyAdminAuth.mockResolvedValue(true);
  mockSendWelcomeEmail.mockResolvedValue({ success: true });
  mockGenerateUsername.mockResolvedValue("LP-A1B2C");
});

// ======================================
// GET: 管理者一覧
// ======================================
describe("admin/users GET", () => {
  it("認証NG -> 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);

    const { GET } = await import("@/app/api/admin/users/route");
    const req = new Request("http://localhost/api/admin/users", { method: "GET" });

    const res = await GET(req as never);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("unauthorized");
  });

  it("正常系: ユーザー一覧を返す", async () => {
    const users = [
      { id: "1", email: "admin@example.com", name: "管理者A", username: "LP-A1B2C", is_active: true, created_at: "2026-01-01", updated_at: "2026-01-01" },
      { id: "2", email: "admin2@example.com", name: "管理者B", username: "LP-D3E4F", is_active: true, created_at: "2026-01-02", updated_at: "2026-01-02" },
    ];
    tableChains["admin_users"] = createChain({ data: users, error: null });

    const { GET } = await import("@/app/api/admin/users/route");
    const req = new Request("http://localhost/api/admin/users", { method: "GET" });

    const res = await GET(req as never);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.users).toHaveLength(2);
    expect(json.users[0].email).toBe("admin@example.com");
  });

  it("DBエラー -> 500", async () => {
    tableChains["admin_users"] = createChain({ data: null, error: { message: "DB error" } });

    const { GET } = await import("@/app/api/admin/users/route");
    const req = new Request("http://localhost/api/admin/users", { method: "GET" });

    const res = await GET(req as never);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("database_error");
  });
});

// ======================================
// POST: 管理者作成（招待メール送信）
// ======================================
describe("admin/users POST", () => {
  it("認証NG -> 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);

    const { POST } = await import("@/app/api/admin/users/route");
    const req = new Request("http://localhost/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "new@example.com", name: "新規管理者" }),
    });

    const res = await POST(req as never);
    expect(res.status).toBe(401);
  });

  it("バリデーション: email なし -> 400", async () => {
    const { POST } = await import("@/app/api/admin/users/route");
    const req = new Request("http://localhost/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "", name: "テスト" }),
    });

    const res = await POST(req as never);
    expect(res.status).toBe(400);
  });

  it("バリデーション: name なし -> 400", async () => {
    const { POST } = await import("@/app/api/admin/users/route");
    const req = new Request("http://localhost/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "test@example.com", name: "" }),
    });

    const res = await POST(req as never);
    expect(res.status).toBe(400);
  });

  it("バリデーション: 不正なメールアドレス -> 400", async () => {
    const { POST } = await import("@/app/api/admin/users/route");
    const req = new Request("http://localhost/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "not-an-email", name: "テスト" }),
    });

    const res = await POST(req as never);
    expect(res.status).toBe(400);
  });

  it("重複メールアドレス -> 400", async () => {
    // 既存ユーザーあり（single で返す）
    tableChains["admin_users"] = createChain({ data: { id: "existing-id" }, error: null });

    const { POST } = await import("@/app/api/admin/users/route");
    const req = new Request("http://localhost/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "existing@example.com", name: "既存ユーザー" }),
    });

    const res = await POST(req as never);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("既に登録");
  });

  it("正常系: ユーザー作成 + 招待メール送信成功", async () => {
    // 重複チェック: なし → insert成功 → token成功
    const chain = createChain();
    // single呼び出し: 1回目（重複チェック）-> null, 2回目（insert結果）-> 新規ユーザー
    let singleCallCount = 0;
    chain.single = vi.fn().mockReturnValue(chain);
    chain.then = vi.fn((resolve: any) => {
      singleCallCount++;
      if (singleCallCount === 1) {
        // 重複チェック: 存在しない
        return resolve({ data: null, error: null });
      }
      if (singleCallCount === 2) {
        // insert結果
        return resolve({ data: { id: "new-user-id", email: "new@example.com", name: "新規管理者", username: "LP-A1B2C" }, error: null });
      }
      // token insert
      return resolve({ data: null, error: null });
    });
    tableChains["admin_users"] = chain;
    tableChains["password_reset_tokens"] = createChain({ data: null, error: null });

    const { POST } = await import("@/app/api/admin/users/route");
    const req = new Request("http://localhost/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "new@example.com", name: "新規管理者" }),
    });

    const res = await POST(req as never);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.user.email).toBe("new@example.com");
    expect(json.message).toContain("招待メール");
    expect(mockSendWelcomeEmail).toHaveBeenCalled();
  });

  it("メール送信失敗 -> 200 + warning", async () => {
    mockSendWelcomeEmail.mockResolvedValue({ success: false, error: "SMTP error" });

    const chain = createChain();
    let singleCallCount = 0;
    chain.single = vi.fn().mockReturnValue(chain);
    chain.then = vi.fn((resolve: any) => {
      singleCallCount++;
      if (singleCallCount === 1) return resolve({ data: null, error: null });
      if (singleCallCount === 2) return resolve({ data: { id: "uid", email: "a@b.com", name: "X", username: "LP-X1Y2Z" }, error: null });
      return resolve({ data: null, error: null });
    });
    tableChains["admin_users"] = chain;
    tableChains["password_reset_tokens"] = createChain({ data: null, error: null });

    const { POST } = await import("@/app/api/admin/users/route");
    const req = new Request("http://localhost/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "a@b.com", name: "X" }),
    });

    const res = await POST(req as never);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.warning).toContain("メール送信に失敗");
    expect(json.setupUrl).toBeDefined();
  });

  it("insert失敗 -> 500", async () => {
    const chain = createChain();
    let singleCallCount = 0;
    chain.single = vi.fn().mockReturnValue(chain);
    chain.then = vi.fn((resolve: any) => {
      singleCallCount++;
      if (singleCallCount === 1) return resolve({ data: null, error: null });
      // insert失敗
      return resolve({ data: null, error: { message: "insert failed" } });
    });
    tableChains["admin_users"] = chain;

    const { POST } = await import("@/app/api/admin/users/route");
    const req = new Request("http://localhost/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "fail@example.com", name: "失敗テスト" }),
    });

    const res = await POST(req as never);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toContain("失敗");
  });
});

// ======================================
// DELETE: 管理者削除
// ======================================
describe("admin/users DELETE", () => {
  it("認証NG -> 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);

    const { DELETE } = await import("@/app/api/admin/users/route");
    const req = new Request("http://localhost/api/admin/users?id=123", { method: "DELETE" });

    const res = await DELETE(req as never);
    expect(res.status).toBe(401);
  });

  it("id パラメータなし -> 400", async () => {
    const { DELETE } = await import("@/app/api/admin/users/route");
    const req = new Request("http://localhost/api/admin/users", { method: "DELETE" });

    const res = await DELETE(req as never);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("id");
  });

  it("正常系: 削除成功", async () => {
    tableChains["admin_users"] = createChain({ data: null, error: null });

    const { DELETE } = await import("@/app/api/admin/users/route");
    const req = new Request("http://localhost/api/admin/users?id=user-to-delete", { method: "DELETE" });

    const res = await DELETE(req as never);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
  });

  it("DBエラー -> 500", async () => {
    tableChains["admin_users"] = createChain({ data: null, error: { message: "delete failed" } });

    const { DELETE } = await import("@/app/api/admin/users/route");
    const req = new Request("http://localhost/api/admin/users?id=user-x", { method: "DELETE" });

    const res = await DELETE(req as never);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toContain("削除");
  });
});
