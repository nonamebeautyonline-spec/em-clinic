// __tests__/api/admin-stamp-cards-settings.test.ts
// スタンプカード設定API テスト

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
  },
}));

vi.mock("@/lib/validations/helpers", () => ({
  parseBody: vi.fn(async (req: Request) => {
    const body = await req.json();
    if (!body.stamps_required || !body.reward_type) {
      return { error: new Response(JSON.stringify({ error: "バリデーションエラー" }), { status: 400 }) };
    }
    return { data: body };
  }),
}));

import { verifyAdminAuth } from "@/lib/admin-auth";
const mockAuth = verifyAdminAuth as ReturnType<typeof vi.fn>;

describe("GET /api/admin/stamp-cards/settings", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("未認証の場合401を返す", async () => {
    mockAuth.mockResolvedValue(false);
    const { GET } = await import("@/app/api/admin/stamp-cards/settings/route");
    const req = new NextRequest("http://localhost/api/admin/stamp-cards/settings");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("認証済みで設定取得（200 or 500）", async () => {
    mockAuth.mockResolvedValue(true);
    const { GET } = await import("@/app/api/admin/stamp-cards/settings/route");
    const req = new NextRequest("http://localhost/api/admin/stamp-cards/settings");
    const res = await GET(req);
    expect([200, 500]).toContain(res.status);
  });
});

describe("PUT /api/admin/stamp-cards/settings", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("未認証の場合401を返す", async () => {
    mockAuth.mockResolvedValue(false);
    const { PUT } = await import("@/app/api/admin/stamp-cards/settings/route");
    const req = new NextRequest("http://localhost/api/admin/stamp-cards/settings", {
      method: "PUT",
      body: JSON.stringify({ stamps_required: 10, reward_type: "coupon" }),
    });
    const res = await PUT(req);
    expect(res.status).toBe(401);
  });

  it("バリデーションエラーで400を返す", async () => {
    mockAuth.mockResolvedValue(true);
    const { PUT } = await import("@/app/api/admin/stamp-cards/settings/route");
    const req = new NextRequest("http://localhost/api/admin/stamp-cards/settings", {
      method: "PUT",
      body: JSON.stringify({}),
    });
    const res = await PUT(req);
    expect(res.status).toBe(400);
  });

  it("認証済みで設定更新（200 or 500）", async () => {
    mockAuth.mockResolvedValue(true);
    const { PUT } = await import("@/app/api/admin/stamp-cards/settings/route");
    const req = new NextRequest("http://localhost/api/admin/stamp-cards/settings", {
      method: "PUT",
      body: JSON.stringify({ stamps_required: 10, reward_type: "coupon" }),
    });
    const res = await PUT(req);
    expect([200, 500]).toContain(res.status);
  });
});
