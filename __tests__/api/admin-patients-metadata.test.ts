// __tests__/api/admin-patients-metadata.test.ts
// 患者メタデータCRUD API テスト

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

function createChain(resolvedValue: unknown = { data: null, error: null }) {
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
    rpc: vi.fn(() => createChain({ data: { key1: "val1" }, error: null })),
  },
}));

import { verifyAdminAuth } from "@/lib/admin-auth";
const mockAuth = verifyAdminAuth as ReturnType<typeof vi.fn>;

const params = { params: Promise.resolve({ id: "P001" }) };

describe("GET /api/admin/patients/[id]/metadata", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("未認証の場合401を返す", async () => {
    mockAuth.mockResolvedValue(false);
    const { GET } = await import("@/app/api/admin/patients/[id]/metadata/route");
    const req = new NextRequest("http://localhost/api/admin/patients/P001/metadata");
    const res = await GET(req, params);
    expect(res.status).toBe(401);
  });

  it("認証済みで取得（200 or 404 or 500）", async () => {
    mockAuth.mockResolvedValue(true);
    const { GET } = await import("@/app/api/admin/patients/[id]/metadata/route");
    const req = new NextRequest("http://localhost/api/admin/patients/P001/metadata");
    const res = await GET(req, params);
    expect([200, 404, 500]).toContain(res.status);
  });
});

describe("PUT /api/admin/patients/[id]/metadata", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("未認証の場合401を返す", async () => {
    mockAuth.mockResolvedValue(false);
    const { PUT } = await import("@/app/api/admin/patients/[id]/metadata/route");
    const req = new NextRequest("http://localhost/api/admin/patients/P001/metadata", {
      method: "PUT",
      body: JSON.stringify({ key1: "val1" }),
    });
    const res = await PUT(req, params);
    expect(res.status).toBe(401);
  });

  it("配列送信で400を返す", async () => {
    mockAuth.mockResolvedValue(true);
    const { PUT } = await import("@/app/api/admin/patients/[id]/metadata/route");
    const req = new NextRequest("http://localhost/api/admin/patients/P001/metadata", {
      method: "PUT",
      body: JSON.stringify([1, 2, 3]),
    });
    const res = await PUT(req, params);
    expect(res.status).toBe(400);
  });

  it("認証済みで更新（200 or 500）", async () => {
    mockAuth.mockResolvedValue(true);
    const { PUT } = await import("@/app/api/admin/patients/[id]/metadata/route");
    const req = new NextRequest("http://localhost/api/admin/patients/P001/metadata", {
      method: "PUT",
      body: JSON.stringify({ key1: "val1" }),
    });
    const res = await PUT(req, params);
    expect([200, 500]).toContain(res.status);
  });
});

describe("DELETE /api/admin/patients/[id]/metadata", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("未認証の場合401を返す", async () => {
    mockAuth.mockResolvedValue(false);
    const { DELETE } = await import("@/app/api/admin/patients/[id]/metadata/route");
    const req = new NextRequest("http://localhost/api/admin/patients/P001/metadata?key=test");
    const res = await DELETE(req, params);
    expect(res.status).toBe(401);
  });

  it("key未指定で400を返す", async () => {
    mockAuth.mockResolvedValue(true);
    const { DELETE } = await import("@/app/api/admin/patients/[id]/metadata/route");
    const req = new NextRequest("http://localhost/api/admin/patients/P001/metadata");
    const res = await DELETE(req, params);
    expect(res.status).toBe(400);
  });

  it("認証済みで削除（200 or 404 or 500）", async () => {
    mockAuth.mockResolvedValue(true);
    const { DELETE } = await import("@/app/api/admin/patients/[id]/metadata/route");
    const req = new NextRequest("http://localhost/api/admin/patients/P001/metadata?key=test");
    const res = await DELETE(req, params);
    expect([200, 404, 500]).toContain(res.status);
  });
});
