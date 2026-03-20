// __tests__/api/role-permissions.test.ts
// ロール別メニュー権限API（app/api/admin/role-permissions/route.ts）のテスト
import { describe, it, expect, vi, beforeEach } from "vitest";

// === モック設定 ===
const mockVerifyAdminAuth = vi.fn().mockResolvedValue(true);
const mockGetAdminTenantRole = vi.fn().mockResolvedValue("owner");
vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: mockVerifyAdminAuth,
  getAdminTenantRole: mockGetAdminTenantRole,
}));

vi.mock("@/lib/menu-permissions", () => ({
  isFullAccessRole: vi.fn((role: string) => role === "owner" || role === "admin"),
  ALL_MENU_KEYS: ["dashboard", "accounting", "line", "reservations", "reorders", "karte", "doctor", "payments", "bank_reconcile", "shipping", "shipping_tracking", "shipping_settings", "view_mypage", "merge_patients", "intake_form", "schedule", "notification_settings", "products", "inventory", "tracking_sources", "settings", "help"],
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  resolveTenantIdOrThrow: vi.fn(() => "test-tenant"),
  tenantPayload: vi.fn(() => ({ tenant_id: "test-tenant" })),
}));

// === Supabase モック（supabaseAdmin経由）===
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

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => getOrCreateChain(table)),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  tableChains = {};
  mockVerifyAdminAuth.mockResolvedValue(true);
  mockGetAdminTenantRole.mockResolvedValue("owner");
});

// ======================================
// GET: ロール別権限取得
// ======================================
describe("role-permissions GET", () => {
  it("認証NG -> 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);

    const { GET } = await import("@/app/api/admin/role-permissions/route");
    const req = new Request("http://localhost/api/admin/role-permissions", { method: "GET" });

    const res = await GET(req as never);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("UNAUTHORIZED");
  });

  it("editor ロールは 403", async () => {
    mockGetAdminTenantRole.mockResolvedValue("editor");

    const { GET } = await import("@/app/api/admin/role-permissions/route");
    const req = new Request("http://localhost/api/admin/role-permissions", { method: "GET" });

    const res = await GET(req as never);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toBe("FORBIDDEN");
  });

  it("viewer ロールは 403", async () => {
    mockGetAdminTenantRole.mockResolvedValue("viewer");

    const { GET } = await import("@/app/api/admin/role-permissions/route");
    const req = new Request("http://localhost/api/admin/role-permissions", { method: "GET" });

    const res = await GET(req as never);
    expect(res.status).toBe(403);
  });

  it("正常系: 権限データを返す", async () => {
    const permissionRows = [
      { role: "editor", menu_key: "dashboard", can_edit: true },
      { role: "editor", menu_key: "line", can_edit: false },
      { role: "viewer", menu_key: "dashboard", can_edit: false },
    ];
    tableChains["role_menu_permissions"] = createChain({ data: permissionRows, error: null });

    const { GET } = await import("@/app/api/admin/role-permissions/route");
    const req = new Request("http://localhost/api/admin/role-permissions", { method: "GET" });

    const res = await GET(req as never);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.permissions).toBeDefined();
    expect(json.permissions.editor.dashboard).toBe(true);
    expect(json.permissions.editor.line).toBe(false);
    expect(json.permissions.viewer.dashboard).toBe(false);
  });

  it("admin ロールもアクセス可能", async () => {
    mockGetAdminTenantRole.mockResolvedValue("admin");
    tableChains["role_menu_permissions"] = createChain({ data: [], error: null });

    const { GET } = await import("@/app/api/admin/role-permissions/route");
    const req = new Request("http://localhost/api/admin/role-permissions", { method: "GET" });

    const res = await GET(req as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.permissions).toEqual({});
  });

  it("DBエラー -> 500", async () => {
    tableChains["role_menu_permissions"] = createChain({ data: null, error: { message: "DB error" } });

    const { GET } = await import("@/app/api/admin/role-permissions/route");
    const req = new Request("http://localhost/api/admin/role-permissions", { method: "GET" });

    const res = await GET(req as never);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.message).toContain("失敗");
  });
});

// ======================================
// PUT: ロール権限の一括更新
// ======================================
describe("role-permissions PUT", () => {
  it("認証NG -> 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);

    const { PUT } = await import("@/app/api/admin/role-permissions/route");
    const req = new Request("http://localhost/api/admin/role-permissions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "editor", menuKeys: { dashboard: true } }),
    });

    const res = await PUT(req as never);
    expect(res.status).toBe(401);
  });

  it("editor ロールは 403", async () => {
    mockGetAdminTenantRole.mockResolvedValue("editor");

    const { PUT } = await import("@/app/api/admin/role-permissions/route");
    const req = new Request("http://localhost/api/admin/role-permissions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "editor", menuKeys: { dashboard: true } }),
    });

    const res = await PUT(req as never);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toBe("FORBIDDEN");
  });

  it("不正なロール（ownerは編集不可）-> 400", async () => {
    const { PUT } = await import("@/app/api/admin/role-permissions/route");
    const req = new Request("http://localhost/api/admin/role-permissions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "owner", menuKeys: { dashboard: true } }),
    });

    const res = await PUT(req as never);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.message).toContain("editor");
  });

  it("不正なロール（admin権限は編集不可）-> 400", async () => {
    const { PUT } = await import("@/app/api/admin/role-permissions/route");
    const req = new Request("http://localhost/api/admin/role-permissions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "admin", menuKeys: { dashboard: true } }),
    });

    const res = await PUT(req as never);
    expect(res.status).toBe(400);
  });

  it("roleが空 -> 400", async () => {
    const { PUT } = await import("@/app/api/admin/role-permissions/route");
    const req = new Request("http://localhost/api/admin/role-permissions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "", menuKeys: { dashboard: true } }),
    });

    const res = await PUT(req as never);
    expect(res.status).toBe(400);
  });

  it("menuKeysがオブジェクトでない -> 400", async () => {
    const { PUT } = await import("@/app/api/admin/role-permissions/route");
    const req = new Request("http://localhost/api/admin/role-permissions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "editor", menuKeys: "invalid" }),
    });

    const res = await PUT(req as never);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.message).toContain("オブジェクト");
  });

  it("menuKeysが配列 -> 400", async () => {
    const { PUT } = await import("@/app/api/admin/role-permissions/route");
    const req = new Request("http://localhost/api/admin/role-permissions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "editor", menuKeys: ["dashboard"] }),
    });

    const res = await PUT(req as never);
    expect(res.status).toBe(400);
  });

  it("不正なメニューキー -> 400", async () => {
    const { PUT } = await import("@/app/api/admin/role-permissions/route");
    const req = new Request("http://localhost/api/admin/role-permissions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "editor", menuKeys: { dashboard: true, nonexistent_key: false } }),
    });

    const res = await PUT(req as never);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.message).toContain("nonexistent_key");
  });

  it("正常系: editor権限を更新", async () => {
    tableChains["role_menu_permissions"] = createChain({ data: null, error: null });

    const { PUT } = await import("@/app/api/admin/role-permissions/route");
    const req = new Request("http://localhost/api/admin/role-permissions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role: "editor",
        menuKeys: { dashboard: true, line: true, reservations: false },
      }),
    });

    const res = await PUT(req as never);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
  });

  it("正常系: viewer権限を更新", async () => {
    tableChains["role_menu_permissions"] = createChain({ data: null, error: null });

    const { PUT } = await import("@/app/api/admin/role-permissions/route");
    const req = new Request("http://localhost/api/admin/role-permissions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role: "viewer",
        menuKeys: { dashboard: true },
      }),
    });

    const res = await PUT(req as never);
    expect(res.status).toBe(200);
  });

  it("正常系: 空のmenuKeysでも成功（全権限削除）", async () => {
    tableChains["role_menu_permissions"] = createChain({ data: null, error: null });

    const { PUT } = await import("@/app/api/admin/role-permissions/route");
    const req = new Request("http://localhost/api/admin/role-permissions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "editor", menuKeys: {} }),
    });

    const res = await PUT(req as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("DELETE失敗 -> 500", async () => {
    tableChains["role_menu_permissions"] = createChain({ data: null, error: { message: "delete failed" } });

    const { PUT } = await import("@/app/api/admin/role-permissions/route");
    const req = new Request("http://localhost/api/admin/role-permissions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "editor", menuKeys: { dashboard: true } }),
    });

    const res = await PUT(req as never);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.message).toContain("失敗");
  });

  it("INSERT失敗 -> 500", async () => {
    // delete成功、insert失敗のシーケンス
    const chain = createChain();
    let thenCallCount = 0;
    chain.then = vi.fn((resolve: (val: Record<string, unknown>) => unknown) => {
      thenCallCount++;
      if (thenCallCount === 1) {
        // delete 成功
        return resolve({ data: null, error: null });
      }
      // insert 失敗
      return resolve({ data: null, error: { message: "insert failed" } });
    });
    tableChains["role_menu_permissions"] = chain;

    const { PUT } = await import("@/app/api/admin/role-permissions/route");
    const req = new Request("http://localhost/api/admin/role-permissions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "editor", menuKeys: { dashboard: true } }),
    });

    const res = await PUT(req as never);
    expect(res.status).toBe(500);
  });
});
