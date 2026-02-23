// __tests__/api/platform-misc.test.ts
// プラットフォーム系小型APIルートの統合テスト
// 対象: impersonate, members, errors, health, impersonate/exit,
//        audit, alerts, sessions

import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================
// 共通モック
// ============================================================

function createChain(defaultResolve = { data: null, error: null }) {
  const chain: any = {};
  [
    "insert", "update", "delete", "select", "eq", "neq", "gt", "gte", "lt", "lte",
    "in", "is", "not", "order", "limit", "range", "single", "maybeSingle", "upsert",
    "ilike", "or", "count", "csv", "head",
  ].forEach((m) => {
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

const mockVerifyPlatformAdmin = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => getOrCreateChain(table)),
    rpc: vi.fn(() => createChain({ data: [], error: null })),
  },
}));

vi.mock("@/lib/platform-auth", () => ({
  verifyPlatformAdmin: (...args: any[]) => mockVerifyPlatformAdmin(...args),
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  withTenant: vi.fn((query: any) => query),
  tenantPayload: vi.fn((tid: any) => (tid ? { tenant_id: tid } : {})),
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
  createSession: vi.fn().mockResolvedValue(undefined),
  validateSession: vi.fn().mockResolvedValue(true),
}));

// jose モック（impersonate で SignJWT / jwtVerify を使用）
// SignJWT は `new SignJWT(payload)` で呼ばれるため class で定義
vi.mock("jose", () => ({
  SignJWT: class MockSignJWT {
    constructor(_payload: any) {}
    setProtectedHeader() { return this; }
    setIssuedAt() { return this; }
    setExpirationTime() { return this; }
    async sign() { return "mock-jwt-token"; }
  },
  jwtVerify: vi.fn().mockResolvedValue({
    payload: {
      userId: "platform-admin-1",
      email: "admin@test.com",
      name: "テスト管理者",
      platformRole: "platform_admin",
      tenantId: "test-tenant",
    },
  }),
}));

// crypto モック（sessions で createHash を使用）
vi.mock("crypto", () => ({
  createHash: vi.fn().mockReturnValue({
    update: vi.fn().mockReturnThis(),
    digest: vi.fn().mockReturnValue("mock-hash"),
  }),
}));

// @upstash/redis モック（health チェックで使用）
vi.mock("@upstash/redis", () => ({
  Redis: vi.fn().mockImplementation(() => ({
    ping: vi.fn().mockResolvedValue("PONG"),
  })),
}));

// NextRequest互換のモック生成（cookies対応）
function createReq(method: string, url: string, body?: any, cookies?: Record<string, string>) {
  const req = new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  }) as any;
  req.nextUrl = new URL(url);
  // cookies モック
  const cookieMap = new Map(Object.entries(cookies || {}));
  req.cookies = {
    get: (name: string) => {
      const val = cookieMap.get(name);
      return val ? { value: val } : undefined;
    },
  };
  return req;
}

// ============================================================
// テスト対象ルートのインポート
// ============================================================

import { POST as impersonatePOST } from "@/app/api/platform/impersonate/route";
import { GET as membersGET } from "@/app/api/platform/members/route";
import { GET as errorsGET } from "@/app/api/platform/errors/route";
import { GET as healthGET } from "@/app/api/platform/health/route";
import { POST as impersonateExitPOST } from "@/app/api/platform/impersonate/exit/route";
import { GET as auditGET } from "@/app/api/platform/audit/route";
import { GET as alertsGET } from "@/app/api/platform/alerts/route";
import { GET as sessionsGET } from "@/app/api/platform/sessions/route";

// ============================================================
// beforeEach
// ============================================================
beforeEach(() => {
  vi.clearAllMocks();
  tableChains = {};
  mockVerifyPlatformAdmin.mockResolvedValue({
    userId: "platform-admin-1",
    email: "admin@test.com",
    name: "テスト管理者",
    tenantId: null,
    platformRole: "platform_admin",
  });
});

// ============================================================
// 1. impersonate
// ============================================================
describe("impersonate API", () => {
  it("認証失敗 → 403", async () => {
    mockVerifyPlatformAdmin.mockResolvedValue(null);
    const res = await impersonatePOST(
      createReq("POST", "http://localhost/api/platform/impersonate", {
        tenantId: "tenant-1",
      }),
    );
    expect(res.status).toBe(403);
  });

  it("POST テナント存在しない → 404", async () => {
    const tenantsChain = getOrCreateChain("tenants");
    tenantsChain.then = vi.fn((resolve: any) => resolve({ data: null, error: { message: "not found" } }));

    const res = await impersonatePOST(
      createReq("POST", "http://localhost/api/platform/impersonate", {
        tenantId: "nonexistent",
      }),
    );
    expect(res.status).toBe(404);
  });

  it("POST 無効テナント → 400", async () => {
    const tenantsChain = getOrCreateChain("tenants");
    tenantsChain.then = vi.fn((resolve: any) => resolve({
      data: { id: "tenant-1", name: "テスト", slug: "test", is_active: false },
      error: null,
    }));

    const res = await impersonatePOST(
      createReq("POST", "http://localhost/api/platform/impersonate", {
        tenantId: "tenant-1",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("POST 正常系 → インパーソネーション開始", async () => {
    // テナント取得
    const tenantsChain = getOrCreateChain("tenants");
    tenantsChain.then = vi.fn((resolve: any) => resolve({
      data: { id: "tenant-1", name: "テストクリニック", slug: "test-clinic", is_active: true },
      error: null,
    }));

    // テナントメンバー取得
    const membersChain = getOrCreateChain("tenant_members");
    membersChain.then = vi.fn((resolve: any) => resolve({
      data: [{
        admin_user_id: "user-1",
        admin_users: { id: "user-1", name: "テスト医師", email: "dr@test.com", username: "dr_test" },
      }],
      error: null,
    }));

    const res = await impersonatePOST(
      createReq("POST", "http://localhost/api/platform/impersonate", {
        tenantId: "tenant-1",
      }, { admin_session: "original-jwt" }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.tenantName).toBe("テストクリニック");
  });
});

// ============================================================
// 2. members
// ============================================================
describe("members API", () => {
  it("認証失敗 → 403", async () => {
    mockVerifyPlatformAdmin.mockResolvedValue(null);
    const res = await membersGET(
      createReq("GET", "http://localhost/api/platform/members"),
    );
    expect(res.status).toBe(403);
  });

  it("GET 正常系 → メンバー一覧を返す", async () => {
    // admin_users
    const usersChain = getOrCreateChain("admin_users");
    usersChain.then = vi.fn((resolve: any) => resolve({
      data: [{ id: "u1", email: "a@test.com", name: "管理者A", is_active: true, platform_role: null, tenant_id: "t1", created_at: "2026-01-01", updated_at: "2026-01-01" }],
      count: 1,
      error: null,
    }));

    // tenants
    const tenantsChain = getOrCreateChain("tenants");
    tenantsChain.then = vi.fn((resolve: any) => resolve({
      data: [{ id: "t1", name: "テナントA", slug: "tenant-a" }],
      error: null,
    }));

    // tenant_members
    const membersChain = getOrCreateChain("tenant_members");
    membersChain.then = vi.fn((resolve: any) => resolve({
      data: [{ admin_user_id: "u1", tenant_id: "t1", role: "admin" }],
      error: null,
    }));

    const res = await membersGET(
      createReq("GET", "http://localhost/api/platform/members"),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.members).toBeDefined();
    expect(json.total).toBeDefined();
  });
});

// ============================================================
// 3. errors
// ============================================================
describe("errors API", () => {
  it("認証失敗 → 403", async () => {
    mockVerifyPlatformAdmin.mockResolvedValue(null);
    const res = await errorsGET(
      createReq("GET", "http://localhost/api/platform/errors"),
    );
    expect(res.status).toBe(403);
  });

  it("GET 正常系 → エラーログを返す", async () => {
    // audit_logs (2回呼ばれる: ページング + 集計)
    const auditChain = getOrCreateChain("audit_logs");
    auditChain.then = vi.fn((resolve: any) => resolve({ data: [], count: 0, error: null }));

    // tenants（集計用）
    const tenantsChain = getOrCreateChain("tenants");
    tenantsChain.then = vi.fn((resolve: any) => resolve({ data: [], error: null }));

    const res = await errorsGET(
      createReq("GET", "http://localhost/api/platform/errors"),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.errors).toBeDefined();
    expect(json.dailyCounts).toBeDefined();
    expect(json.pagination).toBeDefined();
  });
});

// ============================================================
// 4. health
// ============================================================
describe("health API", () => {
  it("認証失敗 → 403", async () => {
    mockVerifyPlatformAdmin.mockResolvedValue(null);
    const res = await healthGET(
      createReq("GET", "http://localhost/api/platform/health"),
    );
    expect(res.status).toBe(403);
  });

  it("GET 正常系 → ヘルスチェック結果を返す", async () => {
    // tenants (DB check)
    const tenantsChain = getOrCreateChain("tenants");
    tenantsChain.then = vi.fn((resolve: any) => resolve({ data: [{ id: "t1" }], error: null }));

    // admin_sessions (アクティブセッション数)
    const sessionsChain = getOrCreateChain("admin_sessions");
    sessionsChain.then = vi.fn((resolve: any) => resolve({ count: 5, error: null }));

    // audit_logs (直近24h)
    const auditChain = getOrCreateChain("audit_logs");
    auditChain.then = vi.fn((resolve: any) => resolve({ count: 100, error: null }));

    // Redis環境変数設定
    process.env.UPSTASH_REDIS_REST_URL = "https://test.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";

    const res = await healthGET(
      createReq("GET", "http://localhost/api/platform/health"),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.checks).toBeDefined();
    expect(json.stats).toBeDefined();
    expect(json.timestamp).toBeDefined();
  });
});

// ============================================================
// 5. impersonate/exit
// ============================================================
describe("impersonate/exit API", () => {
  it("元のセッションCookieなし → 400", async () => {
    const res = await impersonateExitPOST(
      createReq("POST", "http://localhost/api/platform/impersonate/exit", {}, {}),
    );
    expect(res.status).toBe(400);
  });

  it("POST 正常系 → インパーソネーション終了", async () => {
    const res = await impersonateExitPOST(
      createReq("POST", "http://localhost/api/platform/impersonate/exit", {}, {
        platform_original_session: "original-jwt-token",
        admin_session: "impersonated-jwt-token",
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.redirectUrl).toBeDefined();
  });
});

// ============================================================
// 6. audit
// ============================================================
describe("audit API", () => {
  it("認証失敗 → 403", async () => {
    mockVerifyPlatformAdmin.mockResolvedValue(null);
    const res = await auditGET(
      createReq("GET", "http://localhost/api/platform/audit"),
    );
    expect(res.status).toBe(403);
  });

  it("GET 正常系 → 監査ログ一覧を返す", async () => {
    const auditChain = getOrCreateChain("audit_logs");
    auditChain.then = vi.fn((resolve: any) => resolve({ data: [], count: 0, error: null }));

    const res = await auditGET(
      createReq("GET", "http://localhost/api/platform/audit"),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.logs).toBeDefined();
    expect(json.pagination).toBeDefined();
  });

  it("GET フィルター付き → 正常レスポンス", async () => {
    const auditChain = getOrCreateChain("audit_logs");
    auditChain.then = vi.fn((resolve: any) => resolve({ data: [], count: 0, error: null }));

    const res = await auditGET(
      createReq("GET", "http://localhost/api/platform/audit?tenant_id=t1&action=login&start=2026-01-01&end=2026-01-31&search=test"),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });
});

// ============================================================
// 7. alerts
// ============================================================
describe("alerts API", () => {
  it("認証失敗 → 403", async () => {
    mockVerifyPlatformAdmin.mockResolvedValue(null);
    const res = await alertsGET(
      createReq("GET", "http://localhost/api/platform/alerts"),
    );
    expect(res.status).toBe(403);
  });

  it("GET 正常系 → アラート一覧を返す", async () => {
    const alertsChain = getOrCreateChain("security_alerts");
    alertsChain.then = vi.fn((resolve: any) => resolve({ data: [], count: 0, error: null }));

    const res = await alertsGET(
      createReq("GET", "http://localhost/api/platform/alerts"),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.alerts).toBeDefined();
    expect(json.unacknowledgedCount).toBeDefined();
    expect(json.pagination).toBeDefined();
  });

  it("GET フィルター付き → 正常レスポンス", async () => {
    const alertsChain = getOrCreateChain("security_alerts");
    alertsChain.then = vi.fn((resolve: any) => resolve({ data: [], count: 0, error: null }));

    const res = await alertsGET(
      createReq("GET", "http://localhost/api/platform/alerts?severity=high&acknowledged=false"),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });
});

// ============================================================
// 8. sessions
// ============================================================
describe("sessions API", () => {
  it("認証失敗 → 401", async () => {
    mockVerifyPlatformAdmin.mockResolvedValue(null);
    const res = await sessionsGET(
      createReq("GET", "http://localhost/api/platform/sessions"),
    );
    expect(res.status).toBe(401);
  });

  it("GET 正常系 → セッション一覧を返す", async () => {
    const sessionsChain = getOrCreateChain("admin_sessions");
    sessionsChain.then = vi.fn((resolve: any) => resolve({
      data: [
        {
          id: "sess-1",
          ip_address: "127.0.0.1",
          user_agent: "TestAgent/1.0",
          created_at: "2026-01-01T00:00:00Z",
          last_activity: "2026-01-01T01:00:00Z",
          expires_at: "2026-01-02T00:00:00Z",
          token_hash: "mock-hash",
        },
      ],
      error: null,
    }));

    const res = await sessionsGET(
      createReq("GET", "http://localhost/api/platform/sessions", undefined, {
        admin_session: "current-jwt-token",
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.sessions).toHaveLength(1);
    expect(json.sessions[0].isCurrent).toBe(true);
  });

  it("GET DB エラー → 500", async () => {
    const sessionsChain = getOrCreateChain("admin_sessions");
    sessionsChain.then = vi.fn((resolve: any) => resolve({
      data: null,
      error: { message: "DB error" },
    }));

    const res = await sessionsGET(
      createReq("GET", "http://localhost/api/platform/sessions"),
    );
    expect(res.status).toBe(500);
  });
});
