// __tests__/api/platform-health.test.ts
// ヘルスチェックAPI (app/api/platform/health/route.ts) のテスト
import { describe, it, expect, vi, beforeEach } from "vitest";

process.env.JWT_SECRET = "test-jwt-secret";
process.env.UPSTASH_REDIS_REST_URL = "https://test.upstash.io";
process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";

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

vi.mock("@upstash/redis", () => ({
  Redis: vi.fn().mockImplementation(() => ({
    ping: vi.fn().mockResolvedValue("PONG"),
  })),
}));

// fetch モック（LINE API, OpenAI API）
const originalFetch = globalThis.fetch;
beforeEach(() => {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
  } as Response);
});

function createReq(url = "http://localhost/api/platform/health") {
  const req = new Request(url, { method: "GET", headers: { "Content-Type": "application/json" } });
  Object.assign(req, { nextUrl: new URL(url) });
  return req as unknown as import("next/server").NextRequest;
}

import { GET } from "@/app/api/platform/health/route";

describe("GET /api/platform/health", () => {
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

  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  it("認証失敗 → 403", async () => {
    mockVerifyPlatformAdmin.mockResolvedValue(null);
    const res = await GET(createReq());
    expect(res.status).toBe(403);
  });

  it("正常系 → ヘルスチェック結果を返す", async () => {
    // tenants (DB check)
    tableChains["tenants"] = createChain({ data: [{ id: "t1" }], count: 3, error: null });
    // admin_sessions
    tableChains["admin_sessions"] = createChain({ count: 5, error: null });
    // audit_logs
    tableChains["audit_logs"] = createChain({ count: 100, error: null });
    // incidents
    tableChains["incidents"] = createChain({ count: 0, error: null });

    const res = await GET(createReq());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.checks).toBeDefined();
    expect(json.stats).toBeDefined();
    expect(json.timestamp).toBeDefined();
  });

  it("DB接続エラーでも 200 を返す（unhealthyステータス）", async () => {
    // tenants がエラー
    tableChains["tenants"] = createChain({ data: null, error: { message: "connection refused" } });
    tableChains["admin_sessions"] = createChain({ count: 0, error: null });
    tableChains["audit_logs"] = createChain({ count: 0, error: null });
    tableChains["incidents"] = createChain({ count: 0, error: null });

    const res = await GET(createReq());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.checks.database.status).toBe("unhealthy");
  });

  it("Redis未設定でもunconfiguredとして返す", async () => {
    const origUrl = process.env.UPSTASH_REDIS_REST_URL;
    const origToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    tableChains["tenants"] = createChain({ data: [{ id: "t1" }], count: 1, error: null });
    tableChains["admin_sessions"] = createChain({ count: 0, error: null });
    tableChains["audit_logs"] = createChain({ count: 0, error: null });
    tableChains["incidents"] = createChain({ count: 0, error: null });

    const res = await GET(createReq());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.checks.redis.status).toBe("unconfigured");

    process.env.UPSTASH_REDIS_REST_URL = origUrl;
    process.env.UPSTASH_REDIS_REST_TOKEN = origToken;
  });
});
