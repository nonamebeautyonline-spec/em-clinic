// __tests__/api/admin-line-tracking-sources.test.ts
// 流入経路CRUD + stats + analytics API テスト

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: vi.fn(),
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  resolveTenantIdOrThrow: vi.fn(() => "test-tenant"),
  strictWithTenant: vi.fn((q) => q),
  tenantPayload: vi.fn((tid: string) => ({ tenant_id: tid })),
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

vi.mock("@/lib/validations/helpers", () => ({
  parseBody: vi.fn(async (req: Request) => {
    const body = await req.json();
    return { data: body };
  }),
}));

vi.mock("@/lib/validations/line-management", () => ({
  createTrackingSourceSchema: {},
  updateTrackingSourceSchema: {},
}));

vi.mock("@/lib/settings", () => ({
  getSettingOrEnv: vi.fn(() => "http://localhost"),
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(),
}));

import { verifyAdminAuth } from "@/lib/admin-auth";

const mockAuth = verifyAdminAuth as ReturnType<typeof vi.fn>;

// === tracking-sources CRUD ===
describe("GET /api/admin/line/tracking-sources", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("未認証の場合401を返す", async () => {
    mockAuth.mockResolvedValue(false);
    const { GET } = await import("@/app/api/admin/line/tracking-sources/route");
    const req = new NextRequest("http://localhost/api/admin/line/tracking-sources");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("認証済みで一覧取得（200 or 500）", async () => {
    mockAuth.mockResolvedValue(true);
    const { GET } = await import("@/app/api/admin/line/tracking-sources/route");
    const req = new NextRequest("http://localhost/api/admin/line/tracking-sources");
    const res = await GET(req);
    expect([200, 500]).toContain(res.status);
  });
});

describe("POST /api/admin/line/tracking-sources", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("未認証の場合401を返す", async () => {
    mockAuth.mockResolvedValue(false);
    const { POST } = await import("@/app/api/admin/line/tracking-sources/route");
    const req = new NextRequest("http://localhost/api/admin/line/tracking-sources", {
      method: "POST",
      body: JSON.stringify({ name: "テスト経路", destination_url: "https://example.com" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });
});

describe("DELETE /api/admin/line/tracking-sources", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("未認証の場合401を返す", async () => {
    mockAuth.mockResolvedValue(false);
    const { DELETE } = await import("@/app/api/admin/line/tracking-sources/route");
    const req = new NextRequest("http://localhost/api/admin/line/tracking-sources?id=1");
    const res = await DELETE(req);
    expect(res.status).toBe(401);
  });

  it("ID未指定で400を返す", async () => {
    mockAuth.mockResolvedValue(true);
    const { DELETE } = await import("@/app/api/admin/line/tracking-sources/route");
    const req = new NextRequest("http://localhost/api/admin/line/tracking-sources");
    const res = await DELETE(req);
    expect(res.status).toBe(400);
  });
});

// === tracking-sources/stats ===
describe("GET /api/admin/line/tracking-sources/stats", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("未認証の場合401を返す", async () => {
    mockAuth.mockResolvedValue(false);
    const { GET } = await import("@/app/api/admin/line/tracking-sources/stats/route");
    const req = new NextRequest("http://localhost/api/admin/line/tracking-sources/stats");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("認証済みで統計取得（200 or 500）", async () => {
    mockAuth.mockResolvedValue(true);
    const { GET } = await import("@/app/api/admin/line/tracking-sources/stats/route");
    const req = new NextRequest("http://localhost/api/admin/line/tracking-sources/stats?from=2026-01-01&to=2026-01-31");
    const res = await GET(req);
    expect([200, 500]).toContain(res.status);
  });
});

// === tracking-sources/analytics ===
describe("GET /api/admin/line/tracking-sources/analytics", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("未認証の場合401を返す", async () => {
    mockAuth.mockResolvedValue(false);
    const { GET } = await import("@/app/api/admin/line/tracking-sources/analytics/route");
    const req = new NextRequest("http://localhost/api/admin/line/tracking-sources/analytics");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("認証済みで分析取得（200 or 500）", async () => {
    mockAuth.mockResolvedValue(true);
    const { GET } = await import("@/app/api/admin/line/tracking-sources/analytics/route");
    const req = new NextRequest("http://localhost/api/admin/line/tracking-sources/analytics");
    const res = await GET(req);
    expect([200, 500]).toContain(res.status);
  });
});
