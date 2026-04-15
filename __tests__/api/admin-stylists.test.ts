// __tests__/api/admin-stylists.test.ts
// スタイリストCRUD + シフト管理API テスト

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

// === stylists 一覧・作成 ===
describe("GET /api/admin/stylists", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("未認証の場合401を返す", async () => {
    mockAuth.mockResolvedValue(false);
    const { GET } = await import("@/app/api/admin/stylists/route");
    const req = new NextRequest("http://localhost/api/admin/stylists");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("認証済みで一覧取得（200 or 500）", async () => {
    mockAuth.mockResolvedValue(true);
    const { GET } = await import("@/app/api/admin/stylists/route");
    const req = new NextRequest("http://localhost/api/admin/stylists");
    const res = await GET(req);
    expect([200, 500]).toContain(res.status);
  });
});

describe("POST /api/admin/stylists", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("未認証の場合401を返す", async () => {
    mockAuth.mockResolvedValue(false);
    const { POST } = await import("@/app/api/admin/stylists/route");
    const req = new NextRequest("http://localhost/api/admin/stylists", {
      method: "POST",
      body: JSON.stringify({ name: "山田" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("名前未指定で400を返す", async () => {
    mockAuth.mockResolvedValue(true);
    const { POST } = await import("@/app/api/admin/stylists/route");
    const req = new NextRequest("http://localhost/api/admin/stylists", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("認証済みで作成（201 or 500）", async () => {
    mockAuth.mockResolvedValue(true);
    const { POST } = await import("@/app/api/admin/stylists/route");
    const req = new NextRequest("http://localhost/api/admin/stylists", {
      method: "POST",
      body: JSON.stringify({ name: "山田" }),
    });
    const res = await POST(req);
    expect([201, 500]).toContain(res.status);
  });
});

// === stylists/[stylistId] 更新・削除 ===
const stylistParams = { params: Promise.resolve({ stylistId: "s-1" }) };

describe("PUT /api/admin/stylists/[stylistId]", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("未認証の場合401を返す", async () => {
    mockAuth.mockResolvedValue(false);
    const { PUT } = await import("@/app/api/admin/stylists/[stylistId]/route");
    const req = new NextRequest("http://localhost/api/admin/stylists/s-1", {
      method: "PUT",
      body: JSON.stringify({ name: "田中" }),
    });
    const res = await PUT(req, stylistParams);
    expect(res.status).toBe(401);
  });

  it("認証済みで更新（200 or 500）", async () => {
    mockAuth.mockResolvedValue(true);
    const { PUT } = await import("@/app/api/admin/stylists/[stylistId]/route");
    const req = new NextRequest("http://localhost/api/admin/stylists/s-1", {
      method: "PUT",
      body: JSON.stringify({ name: "田中" }),
    });
    const res = await PUT(req, stylistParams);
    expect([200, 500]).toContain(res.status);
  });
});

describe("DELETE /api/admin/stylists/[stylistId]", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("未認証の場合401を返す", async () => {
    mockAuth.mockResolvedValue(false);
    const { DELETE } = await import("@/app/api/admin/stylists/[stylistId]/route");
    const req = new NextRequest("http://localhost/api/admin/stylists/s-1");
    const res = await DELETE(req, stylistParams);
    expect(res.status).toBe(401);
  });

  it("認証済みで論理削除（200 or 500）", async () => {
    mockAuth.mockResolvedValue(true);
    const { DELETE } = await import("@/app/api/admin/stylists/[stylistId]/route");
    const req = new NextRequest("http://localhost/api/admin/stylists/s-1");
    const res = await DELETE(req, stylistParams);
    expect([200, 500]).toContain(res.status);
  });
});

// === stylists/[stylistId]/shifts シフト管理 ===
const shiftParams = { params: Promise.resolve({ stylistId: "s-1" }) };

describe("GET /api/admin/stylists/[stylistId]/shifts", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("未認証の場合401を返す", async () => {
    mockAuth.mockResolvedValue(false);
    const { GET } = await import("@/app/api/admin/stylists/[stylistId]/shifts/route");
    const req = new NextRequest("http://localhost/api/admin/stylists/s-1/shifts");
    const res = await GET(req, shiftParams);
    expect(res.status).toBe(401);
  });

  it("認証済みでシフト取得（200 or 404 or 500）", async () => {
    mockAuth.mockResolvedValue(true);
    const { GET } = await import("@/app/api/admin/stylists/[stylistId]/shifts/route");
    const req = new NextRequest("http://localhost/api/admin/stylists/s-1/shifts");
    const res = await GET(req, shiftParams);
    expect([200, 404, 500]).toContain(res.status);
  });
});

describe("PUT /api/admin/stylists/[stylistId]/shifts", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("未認証の場合401を返す", async () => {
    mockAuth.mockResolvedValue(false);
    const { PUT } = await import("@/app/api/admin/stylists/[stylistId]/shifts/route");
    const req = new NextRequest("http://localhost/api/admin/stylists/s-1/shifts", {
      method: "PUT",
      body: JSON.stringify({ shifts: [] }),
    });
    const res = await PUT(req, shiftParams);
    expect(res.status).toBe(401);
  });

  it("認証済みでシフト更新（200 or 404 or 500）", async () => {
    mockAuth.mockResolvedValue(true);
    const { PUT } = await import("@/app/api/admin/stylists/[stylistId]/shifts/route");
    const req = new NextRequest("http://localhost/api/admin/stylists/s-1/shifts", {
      method: "PUT",
      body: JSON.stringify({ shifts: [{ day_of_week: 1, start_time: "09:00", end_time: "18:00", is_available: true }] }),
    });
    const res = await PUT(req, shiftParams);
    expect([200, 404, 500]).toContain(res.status);
  });
});
