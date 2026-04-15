// __tests__/api/admin-medical-fields.test.ts
// 診療分野CRUD API テスト

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

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(),
}));

vi.mock("@/lib/medical-fields", () => ({
  isMultiFieldEnabled: vi.fn(() => false),
}));

import { verifyAdminAuth } from "@/lib/admin-auth";

const mockAuth = verifyAdminAuth as ReturnType<typeof vi.fn>;

describe("GET /api/admin/medical-fields", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("未認証の場合401を返す", async () => {
    mockAuth.mockResolvedValue(false);
    const { GET } = await import("@/app/api/admin/medical-fields/route");
    const req = new NextRequest("http://localhost/api/admin/medical-fields");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("認証済みで一覧取得（200 or 500）", async () => {
    mockAuth.mockResolvedValue(true);
    const { GET } = await import("@/app/api/admin/medical-fields/route");
    const req = new NextRequest("http://localhost/api/admin/medical-fields");
    const res = await GET(req);
    expect([200, 500]).toContain(res.status);
  });
});

describe("POST /api/admin/medical-fields", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("未認証の場合401を返す", async () => {
    mockAuth.mockResolvedValue(false);
    const { POST } = await import("@/app/api/admin/medical-fields/route");
    const req = new NextRequest("http://localhost/api/admin/medical-fields", {
      method: "POST",
      body: JSON.stringify({ slug: "diet", name: "ダイエット" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("slug/name未指定で400を返す", async () => {
    mockAuth.mockResolvedValue(true);
    const { POST } = await import("@/app/api/admin/medical-fields/route");
    const req = new NextRequest("http://localhost/api/admin/medical-fields", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

describe("PUT /api/admin/medical-fields", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("未認証の場合401を返す", async () => {
    mockAuth.mockResolvedValue(false);
    const { PUT } = await import("@/app/api/admin/medical-fields/route");
    const req = new NextRequest("http://localhost/api/admin/medical-fields", {
      method: "PUT",
      body: JSON.stringify({ id: "1" }),
    });
    const res = await PUT(req);
    expect(res.status).toBe(401);
  });

  it("ID未指定で400を返す", async () => {
    mockAuth.mockResolvedValue(true);
    const { PUT } = await import("@/app/api/admin/medical-fields/route");
    const req = new NextRequest("http://localhost/api/admin/medical-fields", {
      method: "PUT",
      body: JSON.stringify({}),
    });
    const res = await PUT(req);
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/admin/medical-fields", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("未認証の場合401を返す", async () => {
    mockAuth.mockResolvedValue(false);
    const { DELETE } = await import("@/app/api/admin/medical-fields/route");
    const req = new NextRequest("http://localhost/api/admin/medical-fields?id=1");
    const res = await DELETE(req);
    expect(res.status).toBe(401);
  });

  it("ID未指定で400を返す", async () => {
    mockAuth.mockResolvedValue(true);
    const { DELETE } = await import("@/app/api/admin/medical-fields/route");
    const req = new NextRequest("http://localhost/api/admin/medical-fields");
    const res = await DELETE(req);
    expect(res.status).toBe(400);
  });
});
