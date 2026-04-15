// __tests__/api/platform-batch2.test.ts
// プラットフォーム管理系APIルートの統合テスト（バッチ2）
// 対象: churn分析, TOTP認証, AI安全アクション, Square OAuthコールバック

// TOTP loginルートがモジュールレベルでJWT_SECRETをチェックするため
// vi.hoisted内で設定して、モジュールインポート前に確実に反映させる
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.hoisted(() => {
  process.env.JWT_SECRET = "test-jwt-secret-for-vitest";
});

// ============================================================
// 共通モック
// ============================================================
type SupabaseChain = Record<string, ReturnType<typeof vi.fn>>;
function createChain(defaultResolve: Record<string, unknown> = { data: null, error: null }) {
  const chain: SupabaseChain = {};
  [
    "insert", "update", "delete", "select", "eq", "neq", "gt", "gte", "lt", "lte",
    "in", "is", "not", "or", "order", "limit", "range", "single", "maybeSingle", "upsert",
    "ilike", "count", "csv", "rpc",
  ].forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.then = vi.fn((resolve: (val: unknown) => unknown) => resolve(defaultResolve));
  return chain;
}

let tableChains: Record<string, SupabaseChain> = {};
function getOrCreateChain(table: string) {
  if (!tableChains[table]) tableChains[table] = createChain();
  return tableChains[table];
}

// プラットフォーム管理者認証モック
const mockVerifyPlatformAdmin = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => getOrCreateChain(table)),
    rpc: vi.fn(() => createChain({ data: [], error: null })),
  },
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn((table: string) => getOrCreateChain(table)),
  })),
}));

vi.mock("@/lib/platform-auth", () => ({
  verifyPlatformAdmin: (...args: unknown[]) => mockVerifyPlatformAdmin(...args),
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(),
}));

vi.mock("@/lib/validations/helpers", () => ({
  parseBody: vi.fn(async (req: Request, _schema: unknown) => {
    const body = await req.clone().json();
    return { data: body };
  }),
}));

vi.mock("@/lib/validations/platform", () => ({
  totpLoginSchema: {},
}));

// TOTP関連モック
vi.mock("@/lib/totp", () => ({
  verifyTOTP: vi.fn(() => true),
}));

vi.mock("@/lib/crypto", () => ({
  decrypt: vi.fn((s: string) => s),
}));

vi.mock("@/lib/session", () => ({
  createSession: vi.fn(() => Promise.resolve()),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(() => ({ limited: false })),
  getClientIp: vi.fn(() => "127.0.0.1"),
}));

vi.mock("@/lib/redis", () => ({
  redis: {
    get: vi.fn(() => null),
    del: vi.fn(),
  },
}));

vi.mock("jose", () => ({
  SignJWT: class MockSignJWT {
    setProtectedHeader() { return this; }
    setIssuedAt() { return this; }
    setExpirationTime() { return this; }
    async sign() { return "mock-jwt-token"; }
  },
}));

// AI Safe Actions モック
vi.mock("@/lib/ai-safe-actions", () => ({
  listActionProposals: vi.fn(() => []),
  proposeAction: vi.fn(() => 1),
  approveAction: vi.fn(() => true),
  executeAction: vi.fn(() => ({ success: true, result: "done" })),
  rejectAction: vi.fn(() => true),
  validateActionParams: vi.fn(() => ({ valid: true, errors: [] })),
}));

// Square OAuth モック
vi.mock("@/lib/settings", () => ({
  getSetting: vi.fn(() => null),
  setSetting: vi.fn(),
}));

vi.mock("@/lib/square-oauth", () => ({
  decodeSquareState: vi.fn(() => ({ tenantId: "test-tenant" })),
  exchangeSquareCode: vi.fn(() => ({
    access_token: "sq_token",
    refresh_token: "sq_refresh",
    expires_at: "2027-01-01",
    merchant_id: "merchant-1",
  })),
  fetchSquareMerchant: vi.fn(() => ({ businessName: "テスト店舗" })),
  fetchSquareLocations: vi.fn(() => [{ id: "loc-1", name: "本店" }]),
  getSquareApplicationId: vi.fn(() => "sq-app-id"),
}));

// NextRequest互換
function createReq(method: string, url: string, body?: unknown) {
  const req = new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  }) as Request & { nextUrl: URL; cookies: { set: ReturnType<typeof vi.fn> } };
  req.nextUrl = new URL(url);
  return req;
}

// ============================================================
// テスト対象インポート
// ============================================================
import { GET as churnGET } from "@/app/api/platform/analytics/churn/route";
import { POST as totpLoginPOST } from "@/app/api/platform/totp/login/route";
import { GET as safeActionsGET, POST as safeActionsPOST } from "@/app/api/platform/ai-safe-actions/route";
import { GET as squareOauthGET } from "@/app/api/admin/square-oauth/callback/route";

beforeEach(() => {
  vi.clearAllMocks();
  tableChains = {};
  mockVerifyPlatformAdmin.mockResolvedValue({ email: "admin@test.com" });
});

// ============================================================
// 1. churn分析
// ============================================================
describe("platform/analytics/churn API", () => {
  it("GET 認証失敗 → 403", async () => {
    mockVerifyPlatformAdmin.mockResolvedValue(null);
    const res = await churnGET(createReq("GET", "http://localhost/api/platform/analytics/churn") as any);
    expect(res.status).toBe(403);
  });

  it("GET テナントなし → 空配列", async () => {
    const tenantsChain = createChain({ data: [], error: null });
    tableChains["tenants"] = tenantsChain;

    const res = await churnGET(createReq("GET", "http://localhost/api/platform/analytics/churn") as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.tenants).toEqual([]);
  });

  it("GET テナントあり → リスクスコア計算", async () => {
    const tenantsChain = createChain({ data: [{ id: "t1", name: "テスト", slug: "test", is_active: true }], error: null });
    tableChains["tenants"] = tenantsChain;
    const membersChain = createChain({ data: [{ tenant_id: "t1", admin_user_id: "u1" }], error: null });
    tableChains["tenant_members"] = membersChain;
    const sessionsChain = createChain({ data: [], error: null });
    tableChains["admin_sessions"] = sessionsChain;
    const ordersChain = createChain({ data: [], error: null });
    tableChains["orders"] = ordersChain;
    const invoicesChain = createChain({ data: [], error: null });
    tableChains["billing_invoices"] = invoicesChain;

    const res = await churnGET(createReq("GET", "http://localhost/api/platform/analytics/churn") as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.tenants).toHaveLength(1);
    expect(json.tenants[0]).toHaveProperty("riskScore");
    // ログインなし → +40点
    expect(json.tenants[0].riskScore).toBeGreaterThanOrEqual(40);
  });
});

// ============================================================
// 2. TOTP認証
// ============================================================
describe("platform/totp/login API", () => {
  it("POST pendingTotpTokenなし（バリデーションエラー） → 400系", async () => {
    const res = await totpLoginPOST(createReq("POST", "http://localhost/api/platform/totp/login", {}) as any);
    // parseBodyモックがデータをそのまま返すので、redisで userId=null → 401
    expect(res.status).toBe(401);
  });

  it("POST Redis にユーザーなし → 401", async () => {
    const { redis } = await import("@/lib/redis");
    (redis.get as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await totpLoginPOST(createReq("POST", "http://localhost/api/platform/totp/login", {
      pendingTotpToken: "token-123",
      token: "123456",
    }) as any);
    expect(res.status).toBe(401);
  });

  it("POST TOTP正常 → 200 + JWT", async () => {
    const { redis } = await import("@/lib/redis");
    (redis.get as ReturnType<typeof vi.fn>).mockResolvedValue("user-1");

    // admin_users からユーザー取得
    const usersChain = createChain({
      data: {
        id: "user-1",
        email: "admin@test.com",
        name: "Admin",
        username: "admin",
        tenant_id: null,
        platform_role: "platform_admin",
        totp_secret: "encrypted-secret",
        totp_enabled: true,
        totp_backup_codes: [],
        is_active: true,
      },
      error: null,
    });
    tableChains["admin_users"] = usersChain;

    const res = await totpLoginPOST(createReq("POST", "http://localhost/api/platform/totp/login", {
      pendingTotpToken: "token-123",
      token: "123456",
    }) as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.user).toBeDefined();
  });

  it("POST TOTP不一致 → 401", async () => {
    const { redis } = await import("@/lib/redis");
    (redis.get as ReturnType<typeof vi.fn>).mockResolvedValue("user-1");

    const { verifyTOTP } = await import("@/lib/totp");
    (verifyTOTP as ReturnType<typeof vi.fn>).mockReturnValue(false);

    const usersChain = createChain({
      data: {
        id: "user-1",
        email: "admin@test.com",
        name: "Admin",
        username: "admin",
        tenant_id: null,
        platform_role: "platform_admin",
        totp_secret: "encrypted-secret",
        totp_enabled: true,
        totp_backup_codes: [],
        is_active: true,
      },
      error: null,
    });
    tableChains["admin_users"] = usersChain;

    const res = await totpLoginPOST(createReq("POST", "http://localhost/api/platform/totp/login", {
      pendingTotpToken: "token-123",
      token: "000000",
    }) as any);
    expect(res.status).toBe(401);
  });

  it("POST レート制限 → 429", async () => {
    const { redis } = await import("@/lib/redis");
    (redis.get as ReturnType<typeof vi.fn>).mockResolvedValue("user-1");

    const { checkRateLimit } = await import("@/lib/rate-limit");
    (checkRateLimit as ReturnType<typeof vi.fn>).mockResolvedValue({ limited: true });

    const res = await totpLoginPOST(createReq("POST", "http://localhost/api/platform/totp/login", {
      pendingTotpToken: "token-123",
      token: "123456",
    }) as any);
    expect(res.status).toBe(429);
  });
});

// ============================================================
// 3. AI安全アクション
// ============================================================
describe("platform/ai-safe-actions API", () => {
  it("GET 認証失敗 → 401", async () => {
    mockVerifyPlatformAdmin.mockResolvedValue(null);
    const res = await safeActionsGET(createReq("GET", "http://localhost/api/platform/ai-safe-actions") as any);
    expect(res.status).toBe(401);
  });

  it("GET 提案一覧 → 200", async () => {
    const res = await safeActionsGET(createReq("GET", "http://localhost/api/platform/ai-safe-actions") as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.proposals).toBeDefined();
  });

  it("GET statusフィルタ → 200", async () => {
    const res = await safeActionsGET(createReq("GET", "http://localhost/api/platform/ai-safe-actions?status=pending") as any);
    expect(res.status).toBe(200);
  });

  it("POST 認証失敗 → 401", async () => {
    mockVerifyPlatformAdmin.mockResolvedValue(null);
    const res = await safeActionsPOST(createReq("POST", "http://localhost/api/platform/ai-safe-actions", { action: "propose" }) as any);
    expect(res.status).toBe(401);
  });

  it("POST propose 正常 → 200", async () => {
    const res = await safeActionsPOST(createReq("POST", "http://localhost/api/platform/ai-safe-actions", {
      action: "propose",
      tenantId: "t1",
      taskId: "task-1",
      actionType: "send_message",
      actionParams: { message: "test" },
    }) as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.proposalId).toBeDefined();
  });

  it("POST propose パラメータ不足 → 400", async () => {
    const res = await safeActionsPOST(createReq("POST", "http://localhost/api/platform/ai-safe-actions", {
      action: "propose",
      tenantId: "t1",
    }) as any);
    expect(res.status).toBe(400);
  });

  it("POST approve 正常 → 200", async () => {
    const res = await safeActionsPOST(createReq("POST", "http://localhost/api/platform/ai-safe-actions", {
      action: "approve",
      proposalId: 1,
    }) as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.approved).toBe(true);
  });

  it("POST execute 正常 → 200", async () => {
    const res = await safeActionsPOST(createReq("POST", "http://localhost/api/platform/ai-safe-actions", {
      action: "execute",
      proposalId: 1,
    }) as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it("POST reject 正常 → 200", async () => {
    const res = await safeActionsPOST(createReq("POST", "http://localhost/api/platform/ai-safe-actions", {
      action: "reject",
      proposalId: 1,
    }) as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.rejected).toBe(true);
  });

  it("POST 不明なaction → 400", async () => {
    const res = await safeActionsPOST(createReq("POST", "http://localhost/api/platform/ai-safe-actions", {
      action: "unknown",
    }) as any);
    expect(res.status).toBe(400);
  });

  it("POST approve proposalIdなし → 400", async () => {
    const res = await safeActionsPOST(createReq("POST", "http://localhost/api/platform/ai-safe-actions", {
      action: "approve",
    }) as any);
    expect(res.status).toBe(400);
  });
});

// ============================================================
// 4. Square OAuthコールバック
// ============================================================
describe("admin/square-oauth/callback API", () => {
  it("GET エラーパラメータ → リダイレクト（square_oauth_error=auth_denied）", async () => {
    const res = await squareOauthGET(createReq("GET", "http://localhost/api/admin/square-oauth/callback?error=access_denied") as any);
    expect(res.status).toBe(307);
    const location = res.headers.get("location") || "";
    expect(location).toContain("square_oauth_error=auth_denied");
  });

  it("GET code/stateなし → リダイレクト（missing_params）", async () => {
    const res = await squareOauthGET(createReq("GET", "http://localhost/api/admin/square-oauth/callback") as any);
    expect(res.status).toBe(307);
    const location = res.headers.get("location") || "";
    expect(location).toContain("square_oauth_error=missing_params");
  });

  it("GET 正常（code + state） → リダイレクト（success）", async () => {
    const res = await squareOauthGET(createReq("GET", "http://localhost/api/admin/square-oauth/callback?code=auth_code&state=valid_state") as any);
    expect(res.status).toBe(307);
    const location = res.headers.get("location") || "";
    expect(location).toContain("square_oauth=success");
  });

  it("GET 無効なstate → リダイレクト（invalid_state）", async () => {
    const { decodeSquareState } = await import("@/lib/square-oauth");
    (decodeSquareState as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error("invalid");
    });

    const res = await squareOauthGET(createReq("GET", "http://localhost/api/admin/square-oauth/callback?code=auth_code&state=bad_state") as any);
    expect(res.status).toBe(307);
    const location = res.headers.get("location") || "";
    expect(location).toContain("square_oauth_error=invalid_state");
  });

  it("GET ロケーション複数 → select_location", async () => {
    const { decodeSquareState, fetchSquareLocations } = await import("@/lib/square-oauth");
    (decodeSquareState as ReturnType<typeof vi.fn>).mockReturnValue({ tenantId: "test-tenant" });
    (fetchSquareLocations as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "loc-1", name: "本店" },
      { id: "loc-2", name: "支店" },
    ]);

    const res = await squareOauthGET(createReq("GET", "http://localhost/api/admin/square-oauth/callback?code=auth_code&state=valid_state") as any);
    expect(res.status).toBe(307);
    const location = res.headers.get("location") || "";
    expect(location).toContain("square_oauth=select_location");
  });
});
