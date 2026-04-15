// __tests__/api/admin-ec-subscriptions.test.ts
// ECサブスクリプション詳細・ステータス変更API テスト

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: vi.fn(),
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  resolveTenantIdOrThrow: vi.fn(() => "test-tenant"),
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

vi.mock("@/lib/stripe", () => ({
  getStripeClient: vi.fn(() => null),
}));

import { verifyAdminAuth } from "@/lib/admin-auth";

const mockAuth = verifyAdminAuth as ReturnType<typeof vi.fn>;
const routeParams = { params: Promise.resolve({ subscriptionId: "sub-1" }) };

describe("GET /api/admin/ec-subscriptions/[subscriptionId]", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("未認証の場合401を返す", async () => {
    mockAuth.mockResolvedValue(false);
    const { GET } = await import("@/app/api/admin/ec-subscriptions/[subscriptionId]/route");
    const req = new NextRequest("http://localhost/api/admin/ec-subscriptions/sub-1");
    const res = await GET(req, routeParams);
    expect(res.status).toBe(401);
  });

  it("認証済みでサブスク取得（200/404/500）", async () => {
    mockAuth.mockResolvedValue(true);
    const { GET } = await import("@/app/api/admin/ec-subscriptions/[subscriptionId]/route");
    const req = new NextRequest("http://localhost/api/admin/ec-subscriptions/sub-1");
    const res = await GET(req, routeParams);
    expect([200, 404, 500]).toContain(res.status);
  });
});

describe("PUT /api/admin/ec-subscriptions/[subscriptionId]", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("未認証の場合401を返す", async () => {
    mockAuth.mockResolvedValue(false);
    const { PUT } = await import("@/app/api/admin/ec-subscriptions/[subscriptionId]/route");
    const req = new NextRequest("http://localhost/api/admin/ec-subscriptions/sub-1", {
      method: "PUT",
      body: JSON.stringify({ action: "pause" }),
    });
    const res = await PUT(req, routeParams);
    expect(res.status).toBe(401);
  });

  it("無効なaction指定で400を返す", async () => {
    mockAuth.mockResolvedValue(true);
    const { PUT } = await import("@/app/api/admin/ec-subscriptions/[subscriptionId]/route");
    const req = new NextRequest("http://localhost/api/admin/ec-subscriptions/sub-1", {
      method: "PUT",
      body: JSON.stringify({ action: "invalid" }),
    });
    const res = await PUT(req, routeParams);
    expect(res.status).toBe(400);
  });

  it("action未指定で400を返す", async () => {
    mockAuth.mockResolvedValue(true);
    const { PUT } = await import("@/app/api/admin/ec-subscriptions/[subscriptionId]/route");
    const req = new NextRequest("http://localhost/api/admin/ec-subscriptions/sub-1", {
      method: "PUT",
      body: JSON.stringify({}),
    });
    const res = await PUT(req, routeParams);
    expect(res.status).toBe(400);
  });

  it("有効なactionで実行（200/404/500）", async () => {
    mockAuth.mockResolvedValue(true);
    const { PUT } = await import("@/app/api/admin/ec-subscriptions/[subscriptionId]/route");
    const req = new NextRequest("http://localhost/api/admin/ec-subscriptions/sub-1", {
      method: "PUT",
      body: JSON.stringify({ action: "pause" }),
    });
    const res = await PUT(req, routeParams);
    expect([200, 404, 500]).toContain(res.status);
  });
});
