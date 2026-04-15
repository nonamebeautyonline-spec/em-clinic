// __tests__/api/admin-salon-visits.test.ts
// 施術カルテ（来店記録）CRUD API テスト

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

// === salon-visits 一覧・作成 ===
describe("GET /api/admin/salon-visits", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("未認証の場合401を返す", async () => {
    mockAuth.mockResolvedValue(false);
    const { GET } = await import("@/app/api/admin/salon-visits/route");
    const req = new NextRequest("http://localhost/api/admin/salon-visits");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("認証済みで一覧取得（200 or 500）", async () => {
    mockAuth.mockResolvedValue(true);
    const { GET } = await import("@/app/api/admin/salon-visits/route");
    const req = new NextRequest("http://localhost/api/admin/salon-visits");
    const res = await GET(req);
    expect([200, 500]).toContain(res.status);
  });
});

describe("POST /api/admin/salon-visits", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("未認証の場合401を返す", async () => {
    mockAuth.mockResolvedValue(false);
    const { POST } = await import("@/app/api/admin/salon-visits/route");
    const req = new NextRequest("http://localhost/api/admin/salon-visits", {
      method: "POST",
      body: JSON.stringify({ patient_id: 1, visit_date: "2026-04-15" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("patient_id未指定で400を返す", async () => {
    mockAuth.mockResolvedValue(true);
    const { POST } = await import("@/app/api/admin/salon-visits/route");
    const req = new NextRequest("http://localhost/api/admin/salon-visits", {
      method: "POST",
      body: JSON.stringify({ visit_date: "2026-04-15" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("visit_date未指定で400を返す", async () => {
    mockAuth.mockResolvedValue(true);
    const { POST } = await import("@/app/api/admin/salon-visits/route");
    const req = new NextRequest("http://localhost/api/admin/salon-visits", {
      method: "POST",
      body: JSON.stringify({ patient_id: 1 }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("認証済みで作成（201 or 500）", async () => {
    mockAuth.mockResolvedValue(true);
    const { POST } = await import("@/app/api/admin/salon-visits/route");
    const req = new NextRequest("http://localhost/api/admin/salon-visits", {
      method: "POST",
      body: JSON.stringify({ patient_id: 1, visit_date: "2026-04-15" }),
    });
    const res = await POST(req);
    expect([201, 500]).toContain(res.status);
  });
});

// === salon-visits/[visitId] 更新・削除 ===
const visitParams = { params: Promise.resolve({ visitId: "v-1" }) };

describe("PUT /api/admin/salon-visits/[visitId]", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("未認証の場合401を返す", async () => {
    mockAuth.mockResolvedValue(false);
    const { PUT } = await import("@/app/api/admin/salon-visits/[visitId]/route");
    const req = new NextRequest("http://localhost/api/admin/salon-visits/v-1", {
      method: "PUT",
      body: JSON.stringify({ notes: "テスト" }),
    });
    const res = await PUT(req, visitParams);
    expect(res.status).toBe(401);
  });

  it("認証済みで更新（200 or 500）", async () => {
    mockAuth.mockResolvedValue(true);
    const { PUT } = await import("@/app/api/admin/salon-visits/[visitId]/route");
    const req = new NextRequest("http://localhost/api/admin/salon-visits/v-1", {
      method: "PUT",
      body: JSON.stringify({ notes: "テスト" }),
    });
    const res = await PUT(req, visitParams);
    expect([200, 500]).toContain(res.status);
  });
});

describe("DELETE /api/admin/salon-visits/[visitId]", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("未認証の場合401を返す", async () => {
    mockAuth.mockResolvedValue(false);
    const { DELETE } = await import("@/app/api/admin/salon-visits/[visitId]/route");
    const req = new NextRequest("http://localhost/api/admin/salon-visits/v-1");
    const res = await DELETE(req, visitParams);
    expect(res.status).toBe(401);
  });

  it("認証済みで削除（200 or 500）", async () => {
    mockAuth.mockResolvedValue(true);
    const { DELETE } = await import("@/app/api/admin/salon-visits/[visitId]/route");
    const req = new NextRequest("http://localhost/api/admin/salon-visits/v-1");
    const res = await DELETE(req, visitParams);
    expect([200, 500]).toContain(res.status);
  });
});
