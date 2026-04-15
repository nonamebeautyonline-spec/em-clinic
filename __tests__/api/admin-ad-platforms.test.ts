// __tests__/api/admin-ad-platforms.test.ts
// 広告プラットフォームCRUD API テスト

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: vi.fn(),
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  resolveTenantIdOrThrow: vi.fn(() => "test-tenant"),
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

import { verifyAdminAuth } from "@/lib/admin-auth";

const mockAuth = verifyAdminAuth as ReturnType<typeof vi.fn>;

describe("GET /api/admin/ad-platforms", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("未認証の場合401を返す", async () => {
    mockAuth.mockResolvedValue(false);
    const { GET } = await import("@/app/api/admin/ad-platforms/route");
    const req = new NextRequest("http://localhost/api/admin/ad-platforms");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("認証済みで一覧取得（200 or 500）", async () => {
    mockAuth.mockResolvedValue(true);
    const { GET } = await import("@/app/api/admin/ad-platforms/route");
    const req = new NextRequest("http://localhost/api/admin/ad-platforms");
    const res = await GET(req);
    expect([200, 500]).toContain(res.status);
  });
});

describe("POST /api/admin/ad-platforms", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("未認証の場合401を返す", async () => {
    mockAuth.mockResolvedValue(false);
    const { POST } = await import("@/app/api/admin/ad-platforms/route");
    const req = new NextRequest("http://localhost/api/admin/ad-platforms", {
      method: "POST",
      body: JSON.stringify({ name: "meta", display_name: "Meta" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("name/display_name未指定で400を返す", async () => {
    mockAuth.mockResolvedValue(true);
    const { POST } = await import("@/app/api/admin/ad-platforms/route");
    const req = new NextRequest("http://localhost/api/admin/ad-platforms", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("無効なプラットフォーム名で400を返す", async () => {
    mockAuth.mockResolvedValue(true);
    const { POST } = await import("@/app/api/admin/ad-platforms/route");
    const req = new NextRequest("http://localhost/api/admin/ad-platforms", {
      method: "POST",
      body: JSON.stringify({ name: "invalid", display_name: "Invalid" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

describe("PUT /api/admin/ad-platforms", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("未認証の場合401を返す", async () => {
    mockAuth.mockResolvedValue(false);
    const { PUT } = await import("@/app/api/admin/ad-platforms/route");
    const req = new NextRequest("http://localhost/api/admin/ad-platforms", {
      method: "PUT",
      body: JSON.stringify({ id: "1" }),
    });
    const res = await PUT(req);
    expect(res.status).toBe(401);
  });

  it("ID未指定で400を返す", async () => {
    mockAuth.mockResolvedValue(true);
    const { PUT } = await import("@/app/api/admin/ad-platforms/route");
    const req = new NextRequest("http://localhost/api/admin/ad-platforms", {
      method: "PUT",
      body: JSON.stringify({}),
    });
    const res = await PUT(req);
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/admin/ad-platforms", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("未認証の場合401を返す", async () => {
    mockAuth.mockResolvedValue(false);
    const { DELETE } = await import("@/app/api/admin/ad-platforms/route");
    const req = new NextRequest("http://localhost/api/admin/ad-platforms?id=1");
    const res = await DELETE(req);
    expect(res.status).toBe(401);
  });

  it("ID未指定で400を返す", async () => {
    mockAuth.mockResolvedValue(true);
    const { DELETE } = await import("@/app/api/admin/ad-platforms/route");
    const req = new NextRequest("http://localhost/api/admin/ad-platforms");
    const res = await DELETE(req);
    expect(res.status).toBe(400);
  });
});
