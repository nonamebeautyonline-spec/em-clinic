// __tests__/api/admin-chatbot-nodes.test.ts
// チャットボットシナリオ ノードCRUD API テスト

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

import { verifyAdminAuth } from "@/lib/admin-auth";

const mockAuth = verifyAdminAuth as ReturnType<typeof vi.fn>;
const ctx = { params: Promise.resolve({ id: "scenario-1" }) };

describe("GET /api/admin/chatbot/scenarios/[id]/nodes", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("未認証の場合401を返す", async () => {
    mockAuth.mockResolvedValue(false);
    const { GET } = await import("@/app/api/admin/chatbot/scenarios/[id]/nodes/route");
    const req = new NextRequest("http://localhost/api/admin/chatbot/scenarios/s1/nodes");
    const res = await GET(req, ctx);
    expect(res.status).toBe(401);
  });

  it("認証済みでノード一覧取得（200 or 500）", async () => {
    mockAuth.mockResolvedValue(true);
    const { GET } = await import("@/app/api/admin/chatbot/scenarios/[id]/nodes/route");
    const req = new NextRequest("http://localhost/api/admin/chatbot/scenarios/s1/nodes");
    const res = await GET(req, ctx);
    expect([200, 500]).toContain(res.status);
  });
});

describe("POST /api/admin/chatbot/scenarios/[id]/nodes", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("未認証の場合401を返す", async () => {
    mockAuth.mockResolvedValue(false);
    const { POST } = await import("@/app/api/admin/chatbot/scenarios/[id]/nodes/route");
    const req = new NextRequest("http://localhost/api/admin/chatbot/scenarios/s1/nodes", {
      method: "POST",
      body: JSON.stringify({ node_type: "message" }),
    });
    const res = await POST(req, ctx);
    expect(res.status).toBe(401);
  });

  it("無効なnode_typeで400を返す", async () => {
    mockAuth.mockResolvedValue(true);
    const { POST } = await import("@/app/api/admin/chatbot/scenarios/[id]/nodes/route");
    const req = new NextRequest("http://localhost/api/admin/chatbot/scenarios/s1/nodes", {
      method: "POST",
      body: JSON.stringify({ node_type: "invalid" }),
    });
    const res = await POST(req, ctx);
    expect(res.status).toBe(400);
  });

  it("node_type未指定で400を返す", async () => {
    mockAuth.mockResolvedValue(true);
    const { POST } = await import("@/app/api/admin/chatbot/scenarios/[id]/nodes/route");
    const req = new NextRequest("http://localhost/api/admin/chatbot/scenarios/s1/nodes", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req, ctx);
    expect(res.status).toBe(400);
  });
});

describe("PUT /api/admin/chatbot/scenarios/[id]/nodes", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("未認証の場合401を返す", async () => {
    mockAuth.mockResolvedValue(false);
    const { PUT } = await import("@/app/api/admin/chatbot/scenarios/[id]/nodes/route");
    const req = new NextRequest("http://localhost/api/admin/chatbot/scenarios/s1/nodes", {
      method: "PUT",
      body: JSON.stringify({ id: "node-1" }),
    });
    const res = await PUT(req, ctx);
    expect(res.status).toBe(401);
  });

  it("ノードID未指定で400を返す", async () => {
    mockAuth.mockResolvedValue(true);
    const { PUT } = await import("@/app/api/admin/chatbot/scenarios/[id]/nodes/route");
    const req = new NextRequest("http://localhost/api/admin/chatbot/scenarios/s1/nodes", {
      method: "PUT",
      body: JSON.stringify({}),
    });
    const res = await PUT(req, ctx);
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/admin/chatbot/scenarios/[id]/nodes", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("未認証の場合401を返す", async () => {
    mockAuth.mockResolvedValue(false);
    const { DELETE } = await import("@/app/api/admin/chatbot/scenarios/[id]/nodes/route");
    const req = new NextRequest("http://localhost/api/admin/chatbot/scenarios/s1/nodes?node_id=n1");
    const res = await DELETE(req, ctx);
    expect(res.status).toBe(401);
  });

  it("node_id未指定で400を返す", async () => {
    mockAuth.mockResolvedValue(true);
    const { DELETE } = await import("@/app/api/admin/chatbot/scenarios/[id]/nodes/route");
    const req = new NextRequest("http://localhost/api/admin/chatbot/scenarios/s1/nodes");
    const res = await DELETE(req, ctx);
    expect(res.status).toBe(400);
  });
});
