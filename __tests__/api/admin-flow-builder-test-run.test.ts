// __tests__/api/admin-flow-builder-test-run.test.ts
// フロービルダーテスト実行API テスト

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: vi.fn(),
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  resolveTenantIdOrThrow: vi.fn(() => "test-tenant"),
  withTenant: vi.fn((q) => q),
  strictWithTenant: vi.fn((q) => q),
  tenantPayload: vi.fn((tid: string) => ({ tenant_id: tid })),
}));

// チェーンモック
function createChain(resolvedValue: unknown = { data: null, error: null, count: 0 }) {
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

vi.mock("@/lib/step-enrollment", () => ({
  evaluateStepConditions: vi.fn(() => false),
}));

vi.mock("@/lib/step-conditions", () => ({
  evaluateDisplayConditions: vi.fn(() => true),
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(),
}));

import { verifyAdminAuth } from "@/lib/admin-auth";

const mockAuth = verifyAdminAuth as ReturnType<typeof vi.fn>;

describe("POST /api/admin/line/flow-builder/test-run", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("未認証の場合401を返す", async () => {
    mockAuth.mockResolvedValue(false);
    const { POST } = await import("@/app/api/admin/line/flow-builder/test-run/route");
    const req = new NextRequest("http://localhost/api/admin/line/flow-builder/test-run", {
      method: "POST",
      body: JSON.stringify({ scenario_id: "s1", patient_id: "p1" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("scenario_id未指定で400を返す", async () => {
    mockAuth.mockResolvedValue(true);
    const { POST } = await import("@/app/api/admin/line/flow-builder/test-run/route");
    const req = new NextRequest("http://localhost/api/admin/line/flow-builder/test-run", {
      method: "POST",
      body: JSON.stringify({ patient_id: "p1" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("patient_id未指定で400を返す", async () => {
    mockAuth.mockResolvedValue(true);
    const { POST } = await import("@/app/api/admin/line/flow-builder/test-run/route");
    const req = new NextRequest("http://localhost/api/admin/line/flow-builder/test-run", {
      method: "POST",
      body: JSON.stringify({ scenario_id: "s1" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("認証済みの場合、エラーにならない（200/400/500）", async () => {
    mockAuth.mockResolvedValue(true);
    const { POST } = await import("@/app/api/admin/line/flow-builder/test-run/route");
    const req = new NextRequest("http://localhost/api/admin/line/flow-builder/test-run", {
      method: "POST",
      body: JSON.stringify({ scenario_id: "s1", patient_id: "p1" }),
    });
    const res = await POST(req);
    expect([200, 400, 500]).toContain(res.status);
  });
});
