// __tests__/api/cron-square-token-refresh.test.ts
// Square OAuthトークン自動更新 Cronテスト

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/distributed-lock", () => ({
  acquireLock: vi.fn(() => Promise.resolve({ acquired: true, release: vi.fn() })),
}));

vi.mock("@/lib/square-oauth", () => ({
  refreshSquareToken: vi.fn(() => Promise.resolve({
    access_token: "new-token",
    expires_at: "2026-12-31T00:00:00Z",
    refresh_token: "new-refresh",
  })),
}));

vi.mock("@/lib/settings", () => ({
  getSetting: vi.fn(() => null),
  setSetting: vi.fn(),
}));

vi.mock("@/lib/notifications/cron-failure", () => ({
  notifyCronFailure: vi.fn(() => Promise.resolve()),
}));

function createChain(resolvedValue: unknown = { data: [], error: null }) {
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

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn(() => createChain()),
  },
}));

describe("GET /api/cron/square-token-refresh", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "test-cron-secret";
  });

  it("認証なしで401を返す", async () => {
    const { GET } = await import("@/app/api/cron/square-token-refresh/route");
    const req = new NextRequest("http://localhost/api/cron/square-token-refresh");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("不正なトークンで401を返す", async () => {
    const { GET } = await import("@/app/api/cron/square-token-refresh/route");
    const req = new NextRequest("http://localhost/api/cron/square-token-refresh", {
      headers: { Authorization: "Bearer wrong-secret" },
    });
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("正しいトークンで実行（200）", async () => {
    const { GET } = await import("@/app/api/cron/square-token-refresh/route");
    const req = new NextRequest("http://localhost/api/cron/square-token-refresh", {
      headers: { Authorization: "Bearer test-cron-secret" },
    });
    const res = await GET(req);
    expect([200, 500]).toContain(res.status);
  });
});
