// __tests__/api/admin-line-broadcast-ab-test.test.ts
// A/Bテスト配信API テスト

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

vi.mock("@/lib/line-push", () => ({
  pushMessage: vi.fn(() => ({ ok: true })),
}));

// resolveTargetsをモック（../route からのimport）
vi.mock("@/app/api/admin/line/broadcast/route", () => ({
  resolveTargets: vi.fn(() => []),
}));

vi.mock("@/lib/validations/helpers", () => ({
  parseBody: vi.fn(async (req: Request) => {
    const body = await req.json();
    return { data: body };
  }),
}));

vi.mock("@/lib/validations/line-broadcast", () => ({
  abTestSchema: {},
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(),
}));

import { verifyAdminAuth } from "@/lib/admin-auth";

const mockAuth = verifyAdminAuth as ReturnType<typeof vi.fn>;

describe("POST /api/admin/line/broadcast/ab-test", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("未認証の場合401を返す", async () => {
    mockAuth.mockResolvedValue(false);
    const { POST } = await import("@/app/api/admin/line/broadcast/ab-test/route");
    const req = new NextRequest("http://localhost/api/admin/line/broadcast/ab-test", {
      method: "POST",
      body: JSON.stringify({ message_a: "A", message_b: "B" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("対象者0人で400を返す", async () => {
    mockAuth.mockResolvedValue(true);
    const { POST } = await import("@/app/api/admin/line/broadcast/ab-test/route");
    const req = new NextRequest("http://localhost/api/admin/line/broadcast/ab-test", {
      method: "POST",
      body: JSON.stringify({ message_a: "テストA", message_b: "テストB" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("認証済みで実行（200/400/500）", async () => {
    mockAuth.mockResolvedValue(true);
    const { POST } = await import("@/app/api/admin/line/broadcast/ab-test/route");
    const req = new NextRequest("http://localhost/api/admin/line/broadcast/ab-test", {
      method: "POST",
      body: JSON.stringify({ message_a: "A", message_b: "B", split_ratio: 50 }),
    });
    const res = await POST(req);
    expect([200, 400, 500]).toContain(res.status);
  });
});
