// __tests__/api/platform-member-detail.test.ts
// メンバー管理API (app/api/platform/members/[memberId]/route.ts) のテスト
import { describe, it, expect, vi, beforeEach } from "vitest";

process.env.JWT_SECRET = "test-jwt-secret";

// --- チェーンビルダー ---
function createChain(defaultResolve: Record<string, unknown> = { data: null, error: null }) {
  const chain: Record<string, unknown> = {};
  [
    "insert", "update", "delete", "select", "eq", "neq", "gt", "gte", "lt", "lte",
    "in", "is", "not", "order", "limit", "range", "single", "maybeSingle", "upsert",
    "ilike", "or", "count", "csv", "head",
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

vi.mock("@/lib/session", () => ({
  revokeAllSessions: vi.fn().mockResolvedValue(undefined),
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

function createCtx(memberId: string) {
  return { params: Promise.resolve({ memberId }) };
}

import { GET, PATCH } from "@/app/api/platform/members/[memberId]/route";

describe("GET /api/platform/members/[memberId]", () => {
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
      createReq("GET", "http://localhost/api/platform/members/m1"),
      createCtx("m1"),
    );
    expect(res.status).toBe(403);
  });

  it("メンバー未発見 → 404", async () => {
    tableChains["admin_users"] = createChain({ data: null, error: { message: "not found" } });

    const res = await GET(
      createReq("GET", "http://localhost/api/platform/members/m1"),
      createCtx("m1"),
    );
    expect(res.status).toBe(404);
  });

  it("正常系 → メンバー詳細を返す", async () => {
    tableChains["admin_users"] = createChain({
      data: { id: "m1", email: "user@test.com", name: "テスト太郎", is_active: true, platform_role: null, tenant_id: "t1", totp_enabled: false, created_at: "2026-01-01", updated_at: "2026-01-01" },
      error: null,
    });
    tableChains["tenants"] = createChain({
      data: { name: "テストクリニック" },
      error: null,
    });
    tableChains["admin_sessions"] = createChain({ count: 2, error: null });

    const res = await GET(
      createReq("GET", "http://localhost/api/platform/members/m1"),
      createCtx("m1"),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.member.tenantName).toBe("テストクリニック");
    expect(json.member.activeSessions).toBe(2);
  });
});

describe("PATCH /api/platform/members/[memberId]", () => {
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
      createReq("PATCH", "http://localhost/api/platform/members/m1", { action: "toggle_active" }),
      createCtx("m1"),
    );
    expect(res.status).toBe(403);
  });

  it("不正なJSON → 400", async () => {
    const req = new Request("http://localhost/api/platform/members/m1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: "INVALID",
    });
    Object.assign(req, { nextUrl: new URL("http://localhost/api/platform/members/m1") });
    const res = await PATCH(
      req as unknown as import("next/server").NextRequest,
      createCtx("m1"),
    );
    expect(res.status).toBe(400);
  });

  it("自分自身の無効化を防止 → 400", async () => {
    const res = await PATCH(
      createReq("PATCH", "http://localhost/api/platform/members/admin-1", { action: "toggle_active" }),
      createCtx("admin-1"),
    );
    expect(res.status).toBe(400);
  });

  it("toggle_active: 正常系 → 200", async () => {
    tableChains["admin_users"] = createChain({
      data: { id: "m1", name: "テスト太郎", email: "user@test.com", is_active: true, platform_role: null, totp_enabled: false },
      error: null,
    });

    const res = await PATCH(
      createReq("PATCH", "http://localhost/api/platform/members/m1", { action: "toggle_active" }),
      createCtx("m1"),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.isActive).toBe(false);
  });

  it("change_role: 不正なロール → 400", async () => {
    tableChains["admin_users"] = createChain({
      data: { id: "m1", name: "テスト太郎", email: "user@test.com", is_active: true, platform_role: null, totp_enabled: false },
      error: null,
    });

    const res = await PATCH(
      createReq("PATCH", "http://localhost/api/platform/members/m1", { action: "change_role", role: "invalid" }),
      createCtx("m1"),
    );
    expect(res.status).toBe(400);
  });

  it("force_logout: 正常系 → 200", async () => {
    tableChains["admin_users"] = createChain({
      data: { id: "m1", name: "テスト太郎", email: "user@test.com", is_active: true, platform_role: null, totp_enabled: false },
      error: null,
    });

    const res = await PATCH(
      createReq("PATCH", "http://localhost/api/platform/members/m1", { action: "force_logout" }),
      createCtx("m1"),
    );
    expect(res.status).toBe(200);
  });

  it("reset_2fa: 正常系 → 200", async () => {
    tableChains["admin_users"] = createChain({
      data: { id: "m1", name: "テスト太郎", email: "user@test.com", is_active: true, platform_role: null, totp_enabled: true },
      error: null,
    });

    const res = await PATCH(
      createReq("PATCH", "http://localhost/api/platform/members/m1", { action: "reset_2fa" }),
      createCtx("m1"),
    );
    expect(res.status).toBe(200);
  });

  it("不明なアクション → 400", async () => {
    tableChains["admin_users"] = createChain({
      data: { id: "m1", name: "テスト太郎", email: "user@test.com", is_active: true, platform_role: null, totp_enabled: false },
      error: null,
    });

    const res = await PATCH(
      createReq("PATCH", "http://localhost/api/platform/members/m1", { action: "unknown" }),
      createCtx("m1"),
    );
    expect(res.status).toBe(400);
  });
});
