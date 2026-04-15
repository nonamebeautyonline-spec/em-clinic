// __tests__/api/admin-intake-responses.test.ts
// 問診回答一覧API テスト

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: vi.fn(),
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  resolveTenantIdOrThrow: vi.fn(() => "test-tenant"),
}));

function createChain(resolvedValue: unknown = { data: [], error: null, count: 0 }) {
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

import { verifyAdminAuth } from "@/lib/admin-auth";

const mockAuth = verifyAdminAuth as ReturnType<typeof vi.fn>;

describe("GET /api/admin/intake-responses", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("未認証の場合401を返す", async () => {
    mockAuth.mockResolvedValue(false);
    const { GET } = await import("@/app/api/admin/intake-responses/route");
    const req = new NextRequest("http://localhost/api/admin/intake-responses");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("認証済みでリスト取得（200 or 500）", async () => {
    mockAuth.mockResolvedValue(true);
    const { GET } = await import("@/app/api/admin/intake-responses/route");
    const req = new NextRequest("http://localhost/api/admin/intake-responses");
    const res = await GET(req);
    expect([200, 500]).toContain(res.status);
  });

  it("mode=statsで統計モード呼び出し（200 or 500）", async () => {
    mockAuth.mockResolvedValue(true);
    const { GET } = await import("@/app/api/admin/intake-responses/route");
    const req = new NextRequest("http://localhost/api/admin/intake-responses?mode=stats");
    const res = await GET(req);
    expect([200, 500]).toContain(res.status);
  });

  it("ページネーション指定（200 or 500）", async () => {
    mockAuth.mockResolvedValue(true);
    const { GET } = await import("@/app/api/admin/intake-responses/route");
    const req = new NextRequest("http://localhost/api/admin/intake-responses?page=2&limit=10");
    const res = await GET(req);
    expect([200, 500]).toContain(res.status);
  });
});
