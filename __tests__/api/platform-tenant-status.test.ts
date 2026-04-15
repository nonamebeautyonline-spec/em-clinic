// __tests__/api/platform-tenant-status.test.ts
// テナントステータスAPI (app/api/platform/tenants/[tenantId]/status/route.ts) のテスト
import { describe, it, expect, vi, beforeEach } from "vitest";

process.env.JWT_SECRET = "test-jwt-secret";

// --- チェーンビルダー ---
function createChain(defaultResolve: Record<string, unknown> = { data: null, error: null }) {
  const chain: Record<string, unknown> = {};
  [
    "insert", "update", "delete", "select", "eq", "neq", "gt", "gte", "lt", "lte",
    "in", "is", "not", "order", "limit", "range", "single", "maybeSingle", "upsert",
    "ilike", "or", "count", "csv",
  ].forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.then = vi.fn((resolve: (val: unknown) => void) => resolve(defaultResolve));
  return chain;
}

let tableChains: Record<string, Record<string, unknown>> = {};
function getOrCreateChain(table: string) {
  if (!tableChains[table]) tableChains[table] = createChain();
  return tableChains[table];
}

const mockVerifyPlatformAdmin = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => getOrCreateChain(table)),
  },
}));

vi.mock("@/lib/platform-auth", () => ({
  verifyPlatformAdmin: (...args: unknown[]) => mockVerifyPlatformAdmin(...args),
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(),
}));

vi.mock("@/lib/validations/helpers", () => ({
  parseBody: vi.fn().mockResolvedValue({ data: { isActive: true }, error: null }),
}));

vi.mock("@/lib/validations/platform-tenant", () => ({
  updateTenantStatusSchema: {},
}));

vi.mock("@/lib/tenant-lifecycle", () => ({
  deriveLifecycleStatus: vi.fn().mockReturnValue("active"),
  getAllowedTransitions: vi.fn().mockReturnValue(["suspended", "churned"]),
}));

function createReq(method: string, url: string, body?: unknown) {
  const req = new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  Object.assign(req, { nextUrl: new URL(url) });
  return req as unknown as import("next/server").NextRequest;
}

function createCtx(tenantId: string) {
  return { params: Promise.resolve({ tenantId }) };
}

import { GET, PUT, PATCH } from "@/app/api/platform/tenants/[tenantId]/status/route";

describe("GET /api/platform/tenants/[tenantId]/status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableChains = {};
    mockVerifyPlatformAdmin.mockResolvedValue({
      userId: "admin-1",
      email: "admin@test.com",
      name: "テスト管理者",
      platformRole: "platform_admin",
    });
  });

  it("認証失敗 → 403", async () => {
    mockVerifyPlatformAdmin.mockResolvedValue(null);
    const res = await GET(
      createReq("GET", "http://localhost/api/platform/tenants/t1/status"),
      createCtx("t1"),
    );
    expect(res.status).toBe(403);
  });

  it("テナント未発見 → 404", async () => {
    tableChains["tenants"] = createChain({ data: null, error: null });

    const res = await GET(
      createReq("GET", "http://localhost/api/platform/tenants/t1/status"),
      createCtx("t1"),
    );
    expect(res.status).toBe(404);
  });

  it("正常系 → ライフサイクル状態を返す", async () => {
    tableChains["tenants"] = createChain({
      data: { id: "t1", name: "テストクリニック", is_active: true, created_at: "2026-01-01", deleted_at: null, suspended_at: null, suspend_reason: null },
      error: null,
    });
    tableChains["tenant_plans"] = createChain({
      data: { status: "active", plan_name: "standard", payment_failed_at: null, started_at: "2026-01-01" },
      error: null,
    });

    const res = await GET(
      createReq("GET", "http://localhost/api/platform/tenants/t1/status"),
      createCtx("t1"),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.lifecycle).toBeDefined();
    expect(json.lifecycle.current).toBe("active");
  });
});

describe("PUT /api/platform/tenants/[tenantId]/status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableChains = {};
    mockVerifyPlatformAdmin.mockResolvedValue({
      userId: "admin-1",
      email: "admin@test.com",
      name: "テスト管理者",
      platformRole: "platform_admin",
    });
  });

  it("認証失敗 → 403", async () => {
    mockVerifyPlatformAdmin.mockResolvedValue(null);
    const res = await PUT(
      createReq("PUT", "http://localhost/api/platform/tenants/t1/status", { targetStatus: "suspended" }),
      createCtx("t1"),
    );
    expect(res.status).toBe(403);
  });

  it("不正なステータス → 400", async () => {
    const res = await PUT(
      createReq("PUT", "http://localhost/api/platform/tenants/t1/status", { targetStatus: "invalid" }),
      createCtx("t1"),
    );
    expect(res.status).toBe(400);
  });

  it("遷移不可のステータス → 400", async () => {
    const { getAllowedTransitions } = await import("@/lib/tenant-lifecycle");
    vi.mocked(getAllowedTransitions).mockReturnValueOnce([]);

    tableChains["tenants"] = createChain({
      data: { id: "t1", name: "テスト", is_active: true, created_at: "2026-01-01", deleted_at: null, suspended_at: null, suspend_reason: null },
      error: null,
    });
    tableChains["tenant_plans"] = createChain({ data: null, error: null });

    const res = await PUT(
      createReq("PUT", "http://localhost/api/platform/tenants/t1/status", { targetStatus: "suspended" }),
      createCtx("t1"),
    );
    expect(res.status).toBe(400);
  });

  it("正常系 → 状態遷移成功", async () => {
    tableChains["tenants"] = createChain({
      data: { id: "t1", name: "テスト", is_active: true, created_at: "2026-01-01", deleted_at: null, suspended_at: null, suspend_reason: null },
      error: null,
    });
    tableChains["tenant_plans"] = createChain({ data: { status: "active" }, error: null });
    tableChains["admin_users"] = createChain({ data: null, error: null });

    const res = await PUT(
      createReq("PUT", "http://localhost/api/platform/tenants/t1/status", { targetStatus: "suspended" }),
      createCtx("t1"),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.to).toBe("suspended");
  });
});

describe("PATCH /api/platform/tenants/[tenantId]/status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableChains = {};
    mockVerifyPlatformAdmin.mockResolvedValue({
      userId: "admin-1",
      email: "admin@test.com",
      name: "テスト管理者",
      platformRole: "platform_admin",
    });
  });

  it("認証失敗 → 403", async () => {
    mockVerifyPlatformAdmin.mockResolvedValue(null);
    const res = await PATCH(
      createReq("PATCH", "http://localhost/api/platform/tenants/t1/status", { isActive: true }),
      createCtx("t1"),
    );
    expect(res.status).toBe(403);
  });

  it("正常系（有効化）→ 200", async () => {
    tableChains["tenants"] = createChain({
      data: { id: "t1", name: "テスト", is_active: false },
      error: null,
    });
    tableChains["admin_users"] = createChain({ data: null, error: null });

    const res = await PATCH(
      createReq("PATCH", "http://localhost/api/platform/tenants/t1/status", { isActive: true }),
      createCtx("t1"),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });
});
