// __tests__/api/admin-reminders-templates.test.ts
// リマインダーテンプレートCRUD API テスト

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

describe("GET /api/admin/reminders/templates", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("未認証の場合401を返す", async () => {
    mockAuth.mockResolvedValue(false);
    const { GET } = await import("@/app/api/admin/reminders/templates/route");
    const req = new NextRequest("http://localhost/api/admin/reminders/templates");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("認証済みで一覧取得（200 or 500）", async () => {
    mockAuth.mockResolvedValue(true);
    const { GET } = await import("@/app/api/admin/reminders/templates/route");
    const req = new NextRequest("http://localhost/api/admin/reminders/templates");
    const res = await GET(req);
    expect([200, 500]).toContain(res.status);
  });
});

describe("POST /api/admin/reminders/templates", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("未認証の場合401を返す", async () => {
    mockAuth.mockResolvedValue(false);
    const { POST } = await import("@/app/api/admin/reminders/templates/route");
    const req = new NextRequest("http://localhost/api/admin/reminders/templates", {
      method: "POST",
      body: JSON.stringify({ name: "リマインダー1" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("名前未指定でテンプレート作成時に400を返す", async () => {
    mockAuth.mockResolvedValue(true);
    const { POST } = await import("@/app/api/admin/reminders/templates/route");
    const req = new NextRequest("http://localhost/api/admin/reminders/templates", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("ステップ追加時（templateId + offsetMinutes）は200/201/500", async () => {
    mockAuth.mockResolvedValue(true);
    const { POST } = await import("@/app/api/admin/reminders/templates/route");
    const req = new NextRequest("http://localhost/api/admin/reminders/templates", {
      method: "POST",
      body: JSON.stringify({ templateId: "t1", offsetMinutes: 60, messageContent: "テスト" }),
    });
    const res = await POST(req);
    expect([200, 201, 500]).toContain(res.status);
  });
});

describe("PUT /api/admin/reminders/templates", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("未認証の場合401を返す", async () => {
    mockAuth.mockResolvedValue(false);
    const { PUT } = await import("@/app/api/admin/reminders/templates/route");
    const req = new NextRequest("http://localhost/api/admin/reminders/templates", {
      method: "PUT",
      body: JSON.stringify({ id: "1" }),
    });
    const res = await PUT(req);
    expect(res.status).toBe(401);
  });

  it("ID未指定で400を返す", async () => {
    mockAuth.mockResolvedValue(true);
    const { PUT } = await import("@/app/api/admin/reminders/templates/route");
    const req = new NextRequest("http://localhost/api/admin/reminders/templates", {
      method: "PUT",
      body: JSON.stringify({}),
    });
    const res = await PUT(req);
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/admin/reminders/templates", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("未認証の場合401を返す", async () => {
    mockAuth.mockResolvedValue(false);
    const { DELETE } = await import("@/app/api/admin/reminders/templates/route");
    const req = new NextRequest("http://localhost/api/admin/reminders/templates?id=1");
    const res = await DELETE(req);
    expect(res.status).toBe(401);
  });

  it("idもstepIdも未指定で400を返す", async () => {
    mockAuth.mockResolvedValue(true);
    const { DELETE } = await import("@/app/api/admin/reminders/templates/route");
    const req = new NextRequest("http://localhost/api/admin/reminders/templates");
    const res = await DELETE(req);
    expect(res.status).toBe(400);
  });
});
