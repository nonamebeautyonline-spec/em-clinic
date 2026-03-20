// __tests__/api/admin-users-rbac.test.ts
// 管理者ユーザーAPI RBAC（ロールベースアクセス制御）テスト
// POST/PATCHのロール制限・オーナー保護ロジックを重点的にテスト
import { describe, it, expect, vi, beforeEach } from "vitest";

// === モック設定 ===
const mockVerifyAdminAuth = vi.fn().mockResolvedValue(true);
const mockGetAdminTenantRole = vi.fn().mockResolvedValue("owner");
const mockGetAdminUserId = vi.fn().mockResolvedValue("caller-id");
vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: mockVerifyAdminAuth,
  getAdminTenantRole: mockGetAdminTenantRole,
  getAdminUserId: mockGetAdminUserId,
}));

vi.mock("@/lib/menu-permissions", () => ({
  isFullAccessRole: vi.fn((role: string) => role === "owner" || role === "admin"),
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  resolveTenantIdOrThrow: vi.fn(() => "test-tenant"),
  withTenant: vi.fn((query) => query),
  strictWithTenant: vi.fn((query: unknown) => query),
  tenantPayload: vi.fn(() => ({ tenant_id: "test-tenant" })),
}));

const mockSendWelcomeEmail = vi.fn().mockResolvedValue({ success: true });
vi.mock("@/lib/email", () => ({
  sendWelcomeEmail: mockSendWelcomeEmail,
}));

const mockGenerateUsername = vi.fn().mockResolvedValue("LP-R1B2C");
vi.mock("@/lib/username", () => ({
  generateUsername: mockGenerateUsername,
}));

// === Supabase モック（createClient経由）===
let tableChains: Record<string, Record<string, ReturnType<typeof vi.fn>>> = {};

function createChain(defaultResolve: Record<string, unknown> = { data: null, error: null }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  ["insert", "update", "delete", "select", "eq", "neq", "gt", "gte", "lt", "lte",
   "in", "is", "not", "order", "limit", "range", "upsert",
   "ilike", "or", "count", "csv"].forEach(m => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.single = vi.fn().mockReturnValue(chain);
  chain.maybeSingle = vi.fn().mockReturnValue(chain);
  chain.then = vi.fn((resolve: (val: Record<string, unknown>) => unknown) => resolve(defaultResolve));
  return chain;
}

function getOrCreateChain(table: string) {
  if (!tableChains[table]) tableChains[table] = createChain();
  return tableChains[table];
}

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn((table: string) => getOrCreateChain(table)),
  })),
}));

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => getOrCreateChain(table)),
  },
}));

vi.mock("@/lib/settings", () => ({
  getSettingOrEnv: vi.fn().mockResolvedValue("https://example.com"),
}));

beforeEach(() => {
  vi.clearAllMocks();
  tableChains = {};
  mockVerifyAdminAuth.mockResolvedValue(true);
  mockGetAdminTenantRole.mockResolvedValue("owner");
  mockGetAdminUserId.mockResolvedValue("caller-id");
  mockSendWelcomeEmail.mockResolvedValue({ success: true });
});

// ======================================
// POST: ロール制限テスト
// ======================================
describe("admin/users POST — RBAC制限", () => {
  it("editor ロールは 403（ユーザー作成不可）", async () => {
    mockGetAdminTenantRole.mockResolvedValue("editor");

    const { POST } = await import("@/app/api/admin/users/route");
    const req = new Request("http://localhost/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "new@example.com", name: "新規" }),
    });

    const res = await POST(req as never);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toContain("権限");
  });

  it("viewer ロールは 403（ユーザー作成不可）", async () => {
    mockGetAdminTenantRole.mockResolvedValue("viewer");

    const { POST } = await import("@/app/api/admin/users/route");
    const req = new Request("http://localhost/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "new@example.com", name: "新規" }),
    });

    const res = await POST(req as never);
    expect(res.status).toBe(403);
  });

  it("admin ロールはユーザー作成可能", async () => {
    mockGetAdminTenantRole.mockResolvedValue("admin");

    // 重複なし → insert成功 → token成功
    const chain = createChain();
    let singleCallCount = 0;
    chain.single = vi.fn().mockReturnValue(chain);
    chain.then = vi.fn((resolve: (val: Record<string, unknown>) => unknown) => {
      singleCallCount++;
      if (singleCallCount === 1) return resolve({ data: null, error: null });
      if (singleCallCount === 2) return resolve({ data: { id: "new-id", email: "new@example.com", name: "新規", username: "LP-R1B2C" }, error: null });
      return resolve({ data: null, error: null });
    });
    tableChains["admin_users"] = chain;
    tableChains["tenant_members"] = createChain({ data: null, error: null });
    tableChains["password_reset_tokens"] = createChain({ data: null, error: null });

    const { POST } = await import("@/app/api/admin/users/route");
    const req = new Request("http://localhost/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "new@example.com", name: "新規" }),
    });

    const res = await POST(req as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("role=owner での招待は拒否される（editor/viewerのみ許可）", async () => {
    // 重複チェック: なし
    const chain = createChain();
    chain.single = vi.fn().mockReturnValue(chain);
    chain.then = vi.fn((resolve: (val: Record<string, unknown>) => unknown) =>
      resolve({ data: null, error: null })
    );
    tableChains["admin_users"] = chain;

    const { POST } = await import("@/app/api/admin/users/route");
    const req = new Request("http://localhost/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "new@example.com", name: "新規", role: "owner" }),
    });

    const res = await POST(req as never);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.message).toContain("editor");
  });

  it("role=admin での招待は拒否される（editor/viewerのみ許可）", async () => {
    const chain = createChain();
    chain.single = vi.fn().mockReturnValue(chain);
    chain.then = vi.fn((resolve: (val: Record<string, unknown>) => unknown) =>
      resolve({ data: null, error: null })
    );
    tableChains["admin_users"] = chain;

    const { POST } = await import("@/app/api/admin/users/route");
    const req = new Request("http://localhost/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "new@example.com", name: "新規", role: "admin" }),
    });

    const res = await POST(req as never);
    expect(res.status).toBe(400);
  });
});

// ======================================
// PATCH: ロール変更 — RBAC制限
// ======================================
describe("admin/users PATCH — RBAC制限", () => {
  it("認証NG -> 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);

    const { PATCH } = await import("@/app/api/admin/users/route");
    const req = new Request("http://localhost/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "target-id", role: "editor" }),
    });

    const res = await PATCH(req as never);
    expect(res.status).toBe(401);
  });

  it("editor ロールは 403（ロール変更不可）", async () => {
    mockGetAdminTenantRole.mockResolvedValue("editor");

    const { PATCH } = await import("@/app/api/admin/users/route");
    const req = new Request("http://localhost/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "target-id", role: "viewer" }),
    });

    const res = await PATCH(req as never);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toContain("権限");
  });

  it("viewer ロールは 403（ロール変更不可）", async () => {
    mockGetAdminTenantRole.mockResolvedValue("viewer");

    const { PATCH } = await import("@/app/api/admin/users/route");
    const req = new Request("http://localhost/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "target-id", role: "editor" }),
    });

    const res = await PATCH(req as never);
    expect(res.status).toBe(403);
  });

  it("正常系: ownerがeditorに変更", async () => {
    tableChains["tenant_members"] = createChain({ data: null, error: null });

    const { PATCH } = await import("@/app/api/admin/users/route");
    const req = new Request("http://localhost/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "target-id", role: "editor" }),
    });

    const res = await PATCH(req as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("正常系: adminがviewerに変更", async () => {
    mockGetAdminTenantRole.mockResolvedValue("admin");
    tableChains["tenant_members"] = createChain({ data: null, error: null });

    const { PATCH } = await import("@/app/api/admin/users/route");
    const req = new Request("http://localhost/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "target-id", role: "viewer" }),
    });

    const res = await PATCH(req as never);
    expect(res.status).toBe(200);
  });

  it("ownerのみがownerロールを付与可能", async () => {
    tableChains["tenant_members"] = createChain({ data: null, error: null });

    const { PATCH } = await import("@/app/api/admin/users/route");
    const req = new Request("http://localhost/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "target-id", role: "owner" }),
    });

    const res = await PATCH(req as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("adminがownerロールを付与しようとすると 400", async () => {
    mockGetAdminTenantRole.mockResolvedValue("admin");

    const { PATCH } = await import("@/app/api/admin/users/route");
    const req = new Request("http://localhost/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "target-id", role: "owner" }),
    });

    const res = await PATCH(req as never);
    // adminの許可値リストにownerがないので400
    expect(res.status).toBe(400);
  });

  it("自身をownerから降格させることは禁止 -> 400", async () => {
    mockGetAdminUserId.mockResolvedValue("caller-id");

    const { PATCH } = await import("@/app/api/admin/users/route");
    const req = new Request("http://localhost/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "caller-id", role: "admin" }),
    });

    const res = await PATCH(req as never);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.message).toContain("降格");
  });

  it("自身をownerのまま維持する変更は成功", async () => {
    mockGetAdminUserId.mockResolvedValue("caller-id");
    tableChains["tenant_members"] = createChain({ data: null, error: null });

    const { PATCH } = await import("@/app/api/admin/users/route");
    const req = new Request("http://localhost/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "caller-id", role: "owner" }),
    });

    const res = await PATCH(req as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("userIdが未指定 -> 400", async () => {
    const { PATCH } = await import("@/app/api/admin/users/route");
    const req = new Request("http://localhost/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "editor" }),
    });

    const res = await PATCH(req as never);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.message).toContain("userId");
  });

  it("roleが未指定 -> 400", async () => {
    const { PATCH } = await import("@/app/api/admin/users/route");
    const req = new Request("http://localhost/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "target-id" }),
    });

    const res = await PATCH(req as never);
    expect(res.status).toBe(400);
  });

  it("不正なロール値 -> 400", async () => {
    const { PATCH } = await import("@/app/api/admin/users/route");
    const req = new Request("http://localhost/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "target-id", role: "superadmin" }),
    });

    const res = await PATCH(req as never);
    expect(res.status).toBe(400);
  });

  it("DBエラー -> 500", async () => {
    tableChains["tenant_members"] = createChain({ data: null, error: { message: "update failed" } });

    const { PATCH } = await import("@/app/api/admin/users/route");
    const req = new Request("http://localhost/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "target-id", role: "editor" }),
    });

    const res = await PATCH(req as never);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.message).toContain("失敗");
  });
});
