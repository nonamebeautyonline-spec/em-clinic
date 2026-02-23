// __tests__/api/login.test.ts
// 管理者ログインAPI テスト
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

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn((table: string) => getOrCreateChain(table)),
  })),
}));

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: { from: vi.fn((table: string) => getOrCreateChain(table)) },
}));

// --- レート制限モック ---
const mockCheckRateLimit = vi.fn().mockResolvedValue({ limited: false, remaining: 5 });
const mockResetRateLimit = vi.fn();
const mockGetClientIp = vi.fn().mockReturnValue("127.0.0.1");

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: (...args: any[]) => mockCheckRateLimit(...args),
  resetRateLimit: (...args: any[]) => mockResetRateLimit(...args),
  getClientIp: (...args: any[]) => mockGetClientIp(...args),
}));

// --- bcrypt モック ---
const mockBcryptCompare = vi.fn();
vi.mock("bcryptjs", () => ({
  default: { compare: (...args: any[]) => mockBcryptCompare(...args) },
  compare: (...args: any[]) => mockBcryptCompare(...args),
}));

// --- jose モック ---
// `new SignJWT(...)` に対応するため class として定義
vi.mock("jose", () => {
  class MockSignJWT {
    constructor(_payload: any) {}
    setProtectedHeader() { return this; }
    setIssuedAt() { return this; }
    setExpirationTime() { return this; }
    async sign() { return "mock-jwt-token"; }
  }
  return { SignJWT: MockSignJWT };
});

// --- セッション モック ---
vi.mock("@/lib/session", () => ({
  createSession: vi.fn().mockResolvedValue("session-1"),
}));

// --- 監査ログ モック ---
vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(),
}));

// --- ログインアラート モック ---
vi.mock("@/lib/notifications/login-alert", () => ({
  sendLoginAlertIfNewIp: vi.fn().mockResolvedValue(undefined),
}));

// --- テナント モック ---
vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => null),
  withTenant: vi.fn((q: any) => q),
  tenantPayload: vi.fn(() => ({ tenant_id: "test-tenant" })),
}));

function createMockRequest(method: string, url: string, body?: any) {
  const req = new Request(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "user-agent": "test-agent",
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return req as any;
}

import { POST } from "@/app/api/admin/login/route";

describe("管理者ログイン API - POST", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableChains = {};
    mockCheckRateLimit.mockResolvedValue({ limited: false, remaining: 5 });
    mockBcryptCompare.mockResolvedValue(true);
  });

  it("バリデーションエラー（usernameなし）→ 400", async () => {
    const req = createMockRequest("POST", "http://localhost/api/admin/login", {
      password: "test-password",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("バリデーションエラー（passwordなし）→ 400", async () => {
    const req = createMockRequest("POST", "http://localhost/api/admin/login", {
      username: "TESTUSER",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("ユーザーID単位レート制限 → 429", async () => {
    // 1回目: ユーザー制限 = limited
    // 2回目: IP制限 = ok
    let callCount = 0;
    mockCheckRateLimit.mockImplementation(async () => {
      callCount++;
      if (callCount === 1) return { limited: true, remaining: 0 };
      return { limited: false, remaining: 10 };
    });

    const req = createMockRequest("POST", "http://localhost/api/admin/login", {
      username: "TESTUSER",
      password: "test-password",
    });
    const res = await POST(req);
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.error).toContain("ログイン試行回数");
  });

  it("IP単位レート制限 → 429", async () => {
    let callCount = 0;
    mockCheckRateLimit.mockImplementation(async () => {
      callCount++;
      if (callCount === 1) return { limited: false, remaining: 5 };
      return { limited: true, remaining: 0 };
    });

    const req = createMockRequest("POST", "http://localhost/api/admin/login", {
      username: "TESTUSER",
      password: "test-password",
    });
    const res = await POST(req);
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.error).toContain("IP");
  });

  it("ユーザーが見つからない → 401", async () => {
    const chain = getOrCreateChain("admin_users");
    chain.then = vi.fn((resolve: any) => resolve({ data: null, error: { message: "Not found" } }));

    const req = createMockRequest("POST", "http://localhost/api/admin/login", {
      username: "UNKNOWN",
      password: "test-password",
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toContain("ユーザーIDまたはパスワードが正しくありません");
  });

  it("アカウント無効 → 401", async () => {
    const chain = getOrCreateChain("admin_users");
    chain.then = vi.fn((resolve: any) => resolve({
      data: {
        id: "user-1",
        email: "test@example.com",
        name: "Test",
        username: "TESTUSER",
        password_hash: "hashed",
        is_active: false,
        tenant_id: "t1",
        platform_role: "tenant_admin",
      },
      error: null,
    }));

    const req = createMockRequest("POST", "http://localhost/api/admin/login", {
      username: "TESTUSER",
      password: "test-password",
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toContain("無効化");
  });

  it("パスワード不一致 → 401", async () => {
    const chain = getOrCreateChain("admin_users");
    chain.then = vi.fn((resolve: any) => resolve({
      data: {
        id: "user-1",
        email: "test@example.com",
        name: "Test",
        username: "TESTUSER",
        password_hash: "hashed",
        is_active: true,
        tenant_id: "t1",
        platform_role: "tenant_admin",
      },
      error: null,
    }));
    mockBcryptCompare.mockResolvedValue(false);

    const req = createMockRequest("POST", "http://localhost/api/admin/login", {
      username: "TESTUSER",
      password: "wrong-password",
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toContain("ユーザーIDまたはパスワードが正しくありません");
  });

  it("正常ログイン → 200 + JWT Cookie", async () => {
    const chain = getOrCreateChain("admin_users");
    let callCount = 0;
    chain.then = vi.fn((resolve: any) => {
      callCount++;
      if (callCount === 1) {
        // ユーザー取得
        return resolve({
          data: {
            id: "user-1",
            email: "test@example.com",
            name: "テストユーザー",
            username: "TESTUSER",
            password_hash: "hashed",
            is_active: true,
            tenant_id: "t1",
            platform_role: "tenant_admin",
          },
          error: null,
        });
      }
      // tenant_members のロール取得
      return resolve({ data: { role: "admin" }, error: null });
    });
    const tenantsChain = getOrCreateChain("tenant_members");
    tenantsChain.then = vi.fn((resolve: any) => resolve({ data: { role: "admin" }, error: null }));

    const req = createMockRequest("POST", "http://localhost/api/admin/login", {
      username: "TESTUSER",
      password: "correct-password",
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.user.id).toBe("user-1");
    expect(json.user.username).toBe("TESTUSER");
    expect(json.user.name).toBe("テストユーザー");

    // Cookie にadmin_sessionが設定されている
    const cookies = res.headers.getSetCookie?.() || [];
    const hasSessionCookie = cookies.some((c: string) => c.includes("admin_session"));
    expect(hasSessionCookie).toBe(true);

    // レート制限リセットが呼ばれる
    expect(mockResetRateLimit).toHaveBeenCalledWith("login:user:TESTUSER");
  });

  it("usernameは大文字に正規化される", async () => {
    const chain = getOrCreateChain("admin_users");
    chain.then = vi.fn((resolve: any) => resolve({ data: null, error: { message: "Not found" } }));

    const req = createMockRequest("POST", "http://localhost/api/admin/login", {
      username: "testuser",
      password: "test-password",
    });
    await POST(req);

    // checkRateLimitが大文字ユーザー名で呼ばれる
    expect(mockCheckRateLimit).toHaveBeenCalledWith("login:user:TESTUSER", 5, 1800);
  });

  it("テナントIDなしでログイン → redirectUrlなし", async () => {
    const chain = getOrCreateChain("admin_users");
    chain.then = vi.fn((resolve: any) => resolve({
      data: {
        id: "user-1",
        email: "test@example.com",
        name: "Test",
        username: "TESTUSER",
        password_hash: "hashed",
        is_active: true,
        tenant_id: null,
        platform_role: "super_admin",
      },
      error: null,
    }));

    const req = createMockRequest("POST", "http://localhost/api/admin/login", {
      username: "TESTUSER",
      password: "correct-password",
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.redirectUrl).toBeNull();
  });
});
