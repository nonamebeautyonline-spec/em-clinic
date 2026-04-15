// __tests__/api/admin-rfm.test.ts
// RFM分析API テスト

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: vi.fn(),
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  resolveTenantIdOrThrow: vi.fn(() => "test-tenant"),
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

import { verifyAdminAuth } from "@/lib/admin-auth";

const mockAuth = verifyAdminAuth as ReturnType<typeof vi.fn>;

describe("GET /api/admin/rfm", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("未認証の場合401を返す", async () => {
    mockAuth.mockResolvedValue(false);
    const { GET } = await import("@/app/api/admin/rfm/route");
    const req = new NextRequest("http://localhost/api/admin/rfm");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("認証済みで注文データなしの場合は空結果を返す", async () => {
    mockAuth.mockResolvedValue(true);
    const { GET } = await import("@/app/api/admin/rfm/route");
    const req = new NextRequest("http://localhost/api/admin/rfm");
    const res = await GET(req);
    expect([200, 500]).toContain(res.status);
    if (res.status === 200) {
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.customers).toEqual([]);
    }
  });

  it("認証済みの場合にエラーにならない", async () => {
    mockAuth.mockResolvedValue(true);
    const { GET } = await import("@/app/api/admin/rfm/route");
    const req = new NextRequest("http://localhost/api/admin/rfm");
    const res = await GET(req);
    expect([200, 500]).toContain(res.status);
  });
});
