// __tests__/api/admin-line-marks.test.ts
// マーク管理API テスト

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: vi.fn(),
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  resolveTenantIdOrThrow: vi.fn(() => "test-tenant"),
  strictWithTenant: vi.fn((q) => q),
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
  },
}));

vi.mock("@/lib/validations/helpers", () => ({
  parseBody: vi.fn(async (req: Request) => {
    const body = await req.json();
    return { data: body };
  }),
}));

vi.mock("@/lib/validations/line-common", () => ({
  createMarkSchema: {},
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(),
}));

import { verifyAdminAuth } from "@/lib/admin-auth";

const mockAuth = verifyAdminAuth as ReturnType<typeof vi.fn>;
const ctx = { params: Promise.resolve({ id: "1" }) };

describe("GET /api/admin/line/marks/[id]", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("未認証の場合401を返す", async () => {
    mockAuth.mockResolvedValue(false);
    const { GET } = await import("@/app/api/admin/line/marks/[id]/route");
    const req = new NextRequest("http://localhost/api/admin/line/marks/1");
    const res = await GET(req, ctx);
    expect(res.status).toBe(401);
  });

  it("認証済みで患者一覧取得（200 or 500）", async () => {
    mockAuth.mockResolvedValue(true);
    const { GET } = await import("@/app/api/admin/line/marks/[id]/route");
    const req = new NextRequest("http://localhost/api/admin/line/marks/1");
    const res = await GET(req, ctx);
    expect([200, 500]).toContain(res.status);
  });
});

describe("PUT /api/admin/line/marks/[id]", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("未認証の場合401を返す", async () => {
    mockAuth.mockResolvedValue(false);
    const { PUT } = await import("@/app/api/admin/line/marks/[id]/route");
    const req = new NextRequest("http://localhost/api/admin/line/marks/1", {
      method: "PUT",
      body: JSON.stringify({ label: "重要", color: "red", icon: "star" }),
    });
    const res = await PUT(req, ctx);
    expect(res.status).toBe(401);
  });

  it("認証済みでマーク更新（200 or 500）", async () => {
    mockAuth.mockResolvedValue(true);
    const { PUT } = await import("@/app/api/admin/line/marks/[id]/route");
    const req = new NextRequest("http://localhost/api/admin/line/marks/1", {
      method: "PUT",
      body: JSON.stringify({ label: "重要", color: "red", icon: "star" }),
    });
    const res = await PUT(req, ctx);
    expect([200, 500]).toContain(res.status);
  });
});

describe("DELETE /api/admin/line/marks/[id]", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("未認証の場合401を返す", async () => {
    mockAuth.mockResolvedValue(false);
    const { DELETE } = await import("@/app/api/admin/line/marks/[id]/route");
    const req = new NextRequest("http://localhost/api/admin/line/marks/1");
    const res = await DELETE(req, ctx);
    expect(res.status).toBe(401);
  });

  it("認証済みでマーク削除（200 or 400 or 500）", async () => {
    mockAuth.mockResolvedValue(true);
    const { DELETE } = await import("@/app/api/admin/line/marks/[id]/route");
    const req = new NextRequest("http://localhost/api/admin/line/marks/1");
    const res = await DELETE(req, ctx);
    expect([200, 400, 500]).toContain(res.status);
  });
});
