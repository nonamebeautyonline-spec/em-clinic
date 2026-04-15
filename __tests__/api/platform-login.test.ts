// __tests__/api/platform-login.test.ts
// プラットフォームログインAPI テスト

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// 環境変数設定（モジュールロード前に）
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
process.env.JWT_SECRET = "test-jwt-secret-key-for-testing-1234567890";
process.env.ADMIN_TOKEN = "test-admin-token";

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(() => Promise.resolve({ limited: false })),
  resetRateLimit: vi.fn(),
  getClientIp: vi.fn(() => "127.0.0.1"),
}));

vi.mock("@/lib/validations/helpers", () => ({
  parseBody: vi.fn(async (req: Request) => {
    const body = await req.json();
    if (!body.username || !body.password) {
      return { error: new Response(JSON.stringify({ error: "必須項目" }), { status: 400 }) };
    }
    return { data: body };
  }),
}));

vi.mock("@/lib/validations/admin-login", () => ({
  adminLoginSchema: {},
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
  createSession: vi.fn(() => Promise.resolve()),
}));

vi.mock("@/lib/redis", () => ({
  redis: {
    set: vi.fn(),
    get: vi.fn(),
  },
}));

vi.mock("bcryptjs", () => ({
  default: { compare: vi.fn(() => false) },
  compare: vi.fn(() => false),
}));

function createChain(resolvedValue: unknown = { data: null, error: { message: "not found" } }) {
  const handler: ProxyHandler<object> = {
    get: (_target, prop) => {
      if (prop === "then") {
        return (resolve: (v: unknown) => void) => resolve(resolvedValue);
      }
      return vi.fn(() => new Proxy({}, handler));
    },
  };
  return new Proxy({}, handler);
}

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => createChain()),
  })),
}));

describe("POST /api/platform/login", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("ユーザーが見つからない場合401を返す", async () => {
    const { POST } = await import("@/app/api/platform/login/route");
    const req = new NextRequest("http://localhost/api/platform/login", {
      method: "POST",
      body: JSON.stringify({ username: "unknown", password: "pass123" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("バリデーションエラーで400を返す", async () => {
    const { POST } = await import("@/app/api/platform/login/route");
    const req = new NextRequest("http://localhost/api/platform/login", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
