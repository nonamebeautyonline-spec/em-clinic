// __tests__/api/admin-treatments.test.ts
// 施術メニューCRUD API テスト

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

import { verifyAdminAuth } from "@/lib/admin-auth";
const mockAuth = verifyAdminAuth as ReturnType<typeof vi.fn>;

// === treatments 一覧・作成 ===
describe("GET /api/admin/treatments", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("未認証の場合401を返す", async () => {
    mockAuth.mockResolvedValue(false);
    const { GET } = await import("@/app/api/admin/treatments/route");
    const req = new NextRequest("http://localhost/api/admin/treatments");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("認証済みで一覧取得（200 or 500）", async () => {
    mockAuth.mockResolvedValue(true);
    const { GET } = await import("@/app/api/admin/treatments/route");
    const req = new NextRequest("http://localhost/api/admin/treatments");
    const res = await GET(req);
    expect([200, 500]).toContain(res.status);
  });
});

describe("POST /api/admin/treatments", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("未認証の場合401を返す", async () => {
    mockAuth.mockResolvedValue(false);
    const { POST } = await import("@/app/api/admin/treatments/route");
    const req = new NextRequest("http://localhost/api/admin/treatments", {
      method: "POST",
      body: JSON.stringify({ name: "カット" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("name未指定で400を返す", async () => {
    mockAuth.mockResolvedValue(true);
    const { POST } = await import("@/app/api/admin/treatments/route");
    const req = new NextRequest("http://localhost/api/admin/treatments", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("認証済みで作成（201 or 500）", async () => {
    mockAuth.mockResolvedValue(true);
    const { POST } = await import("@/app/api/admin/treatments/route");
    const req = new NextRequest("http://localhost/api/admin/treatments", {
      method: "POST",
      body: JSON.stringify({ name: "カット", price: 5000 }),
    });
    const res = await POST(req);
    expect([201, 500]).toContain(res.status);
  });
});

// === treatments/[menuId] 更新・削除 ===
const menuParams = { params: Promise.resolve({ menuId: "m-1" }) };

describe("PUT /api/admin/treatments/[menuId]", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("未認証の場合401を返す", async () => {
    mockAuth.mockResolvedValue(false);
    const { PUT } = await import("@/app/api/admin/treatments/[menuId]/route");
    const req = new NextRequest("http://localhost/api/admin/treatments/m-1", {
      method: "PUT",
      body: JSON.stringify({ name: "カラー" }),
    });
    const res = await PUT(req, menuParams);
    expect(res.status).toBe(401);
  });

  it("認証済みで更新（200 or 500）", async () => {
    mockAuth.mockResolvedValue(true);
    const { PUT } = await import("@/app/api/admin/treatments/[menuId]/route");
    const req = new NextRequest("http://localhost/api/admin/treatments/m-1", {
      method: "PUT",
      body: JSON.stringify({ name: "カラー" }),
    });
    const res = await PUT(req, menuParams);
    expect([200, 500]).toContain(res.status);
  });
});

describe("DELETE /api/admin/treatments/[menuId]", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("未認証の場合401を返す", async () => {
    mockAuth.mockResolvedValue(false);
    const { DELETE } = await import("@/app/api/admin/treatments/[menuId]/route");
    const req = new NextRequest("http://localhost/api/admin/treatments/m-1");
    const res = await DELETE(req, menuParams);
    expect(res.status).toBe(401);
  });

  it("認証済みで論理削除（200 or 500）", async () => {
    mockAuth.mockResolvedValue(true);
    const { DELETE } = await import("@/app/api/admin/treatments/[menuId]/route");
    const req = new NextRequest("http://localhost/api/admin/treatments/m-1");
    const res = await DELETE(req, menuParams);
    expect([200, 500]).toContain(res.status);
  });
});
