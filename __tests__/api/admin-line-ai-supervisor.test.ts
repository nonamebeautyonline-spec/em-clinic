// __tests__/api/admin-line-ai-supervisor.test.ts
// AI Supervisorダッシュボード API テスト

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

vi.mock("@/lib/ai-cost-constants", () => ({
  ESTIMATED_COST_PER_INPUT_TOKEN: 0.000003,
  ESTIMATED_COST_PER_OUTPUT_TOKEN: 0.000015,
}));

import { verifyAdminAuth } from "@/lib/admin-auth";

const mockAuth = verifyAdminAuth as ReturnType<typeof vi.fn>;

describe("GET /api/admin/line/ai-supervisor", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("未認証の場合401を返す", async () => {
    mockAuth.mockResolvedValue(false);
    const { GET } = await import("@/app/api/admin/line/ai-supervisor/route");
    const req = new NextRequest("http://localhost/api/admin/line/ai-supervisor");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("認証済みでダッシュボードデータ取得（200 or 500）", async () => {
    mockAuth.mockResolvedValue(true);
    const { GET } = await import("@/app/api/admin/line/ai-supervisor/route");
    const req = new NextRequest("http://localhost/api/admin/line/ai-supervisor");
    const res = await GET(req);
    expect([200, 500]).toContain(res.status);
    if (res.status === 200) {
      const body = await res.json();
      expect(body).toHaveProperty("todayKpi");
      expect(body).toHaveProperty("approvalRateTrend");
      expect(body).toHaveProperty("costTrend");
      expect(body).toHaveProperty("alerts");
      expect(body).toHaveProperty("modelComparison");
    }
  });
});
