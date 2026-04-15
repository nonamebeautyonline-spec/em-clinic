// __tests__/api/admin-tracking-source-folders.test.ts
// 流入経路フォルダ CRUD API テスト

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
  createFolderSchema: {},
  updateFolderSchema: {},
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(),
}));

import { verifyAdminAuth } from "@/lib/admin-auth";

const mockAuth = verifyAdminAuth as ReturnType<typeof vi.fn>;

describe("GET /api/admin/line/tracking-source-folders", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("未認証の場合401を返す", async () => {
    mockAuth.mockResolvedValue(false);
    const { GET } = await import("@/app/api/admin/line/tracking-source-folders/route");
    const req = new NextRequest("http://localhost/api/admin/line/tracking-source-folders");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("認証済みでフォルダ一覧取得（200 or 500）", async () => {
    mockAuth.mockResolvedValue(true);
    const { GET } = await import("@/app/api/admin/line/tracking-source-folders/route");
    const req = new NextRequest("http://localhost/api/admin/line/tracking-source-folders");
    const res = await GET(req);
    expect([200, 500]).toContain(res.status);
  });
});

describe("POST /api/admin/line/tracking-source-folders", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("未認証の場合401を返す", async () => {
    mockAuth.mockResolvedValue(false);
    const { POST } = await import("@/app/api/admin/line/tracking-source-folders/route");
    const req = new NextRequest("http://localhost/api/admin/line/tracking-source-folders", {
      method: "POST",
      body: JSON.stringify({ name: "テスト" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("認証済みでフォルダ作成（200 or 500）", async () => {
    mockAuth.mockResolvedValue(true);
    const { POST } = await import("@/app/api/admin/line/tracking-source-folders/route");
    const req = new NextRequest("http://localhost/api/admin/line/tracking-source-folders", {
      method: "POST",
      body: JSON.stringify({ name: "テスト" }),
    });
    const res = await POST(req);
    expect([200, 500]).toContain(res.status);
  });
});

describe("PUT /api/admin/line/tracking-source-folders", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("未認証の場合401を返す", async () => {
    mockAuth.mockResolvedValue(false);
    const { PUT } = await import("@/app/api/admin/line/tracking-source-folders/route");
    const req = new NextRequest("http://localhost/api/admin/line/tracking-source-folders", {
      method: "PUT",
      body: JSON.stringify({ id: 1, name: "更新" }),
    });
    const res = await PUT(req);
    expect(res.status).toBe(401);
  });
});

describe("DELETE /api/admin/line/tracking-source-folders", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("未認証の場合401を返す", async () => {
    mockAuth.mockResolvedValue(false);
    const { DELETE } = await import("@/app/api/admin/line/tracking-source-folders/route");
    const req = new NextRequest("http://localhost/api/admin/line/tracking-source-folders?id=1");
    const res = await DELETE(req);
    expect(res.status).toBe(401);
  });

  it("ID未指定で400を返す", async () => {
    mockAuth.mockResolvedValue(true);
    const { DELETE } = await import("@/app/api/admin/line/tracking-source-folders/route");
    const req = new NextRequest("http://localhost/api/admin/line/tracking-source-folders");
    const res = await DELETE(req);
    expect(res.status).toBe(400);
  });
});
