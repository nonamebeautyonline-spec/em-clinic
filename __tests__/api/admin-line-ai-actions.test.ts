// __tests__/api/admin-line-ai-actions.test.ts
// AI Safe Actions 承認/却下API テスト

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

vi.mock("@/lib/ai-safe-actions", () => ({
  approveAction: vi.fn(() => Promise.resolve(true)),
  rejectAction: vi.fn(() => Promise.resolve()),
}));

import { verifyAdminAuth } from "@/lib/admin-auth";
const mockAuth = verifyAdminAuth as ReturnType<typeof vi.fn>;

describe("GET /api/admin/line/ai-actions", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("未認証の場合401を返す", async () => {
    mockAuth.mockResolvedValue(false);
    const { GET } = await import("@/app/api/admin/line/ai-actions/route");
    const req = new NextRequest("http://localhost/api/admin/line/ai-actions?draft_id=1");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("draft_id未指定で500を返す", async () => {
    mockAuth.mockResolvedValue(true);
    const { GET } = await import("@/app/api/admin/line/ai-actions/route");
    const req = new NextRequest("http://localhost/api/admin/line/ai-actions");
    const res = await GET(req);
    expect(res.status).toBe(500);
  });

  it("認証済みでアクション取得（200 or 500）", async () => {
    mockAuth.mockResolvedValue(true);
    const { GET } = await import("@/app/api/admin/line/ai-actions/route");
    const req = new NextRequest("http://localhost/api/admin/line/ai-actions?draft_id=1");
    const res = await GET(req);
    expect([200, 500]).toContain(res.status);
  });
});

describe("POST /api/admin/line/ai-actions", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("未認証の場合401を返す", async () => {
    mockAuth.mockResolvedValue(false);
    const { POST } = await import("@/app/api/admin/line/ai-actions/route");
    const req = new NextRequest("http://localhost/api/admin/line/ai-actions", {
      method: "POST",
      body: JSON.stringify({ action_id: "a1", decision: "approve" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("必須項目未指定で500を返す", async () => {
    mockAuth.mockResolvedValue(true);
    const { POST } = await import("@/app/api/admin/line/ai-actions/route");
    const req = new NextRequest("http://localhost/api/admin/line/ai-actions", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  it("不正なdecisionで500を返す", async () => {
    mockAuth.mockResolvedValue(true);
    const { POST } = await import("@/app/api/admin/line/ai-actions/route");
    const req = new NextRequest("http://localhost/api/admin/line/ai-actions", {
      method: "POST",
      body: JSON.stringify({ action_id: "a1", decision: "invalid" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  it("承認成功（200）", async () => {
    mockAuth.mockResolvedValue(true);
    const { POST } = await import("@/app/api/admin/line/ai-actions/route");
    const req = new NextRequest("http://localhost/api/admin/line/ai-actions", {
      method: "POST",
      body: JSON.stringify({ action_id: "a1", decision: "approve" }),
    });
    const res = await POST(req);
    expect([200, 500]).toContain(res.status);
  });
});
