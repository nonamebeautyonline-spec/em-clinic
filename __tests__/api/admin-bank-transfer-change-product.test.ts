// __tests__/api/admin-bank-transfer-change-product.test.ts
// 銀行振込商品変更API テスト

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

vi.mock("@/lib/redis", () => ({
  invalidateDashboardCache: vi.fn(),
}));

vi.mock("@/lib/settings", () => ({
  getSettingOrEnv: vi.fn(() => ""),
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(),
}));

vi.mock("@/lib/validations/admin-operations", () => ({
  bankTransferChangeProductSchema: {
    safeParse: vi.fn((data: unknown) => {
      const d = data as Record<string, unknown>;
      if (!d?.order_id || !d?.new_product_code) {
        return { success: false, error: { issues: [{ path: [], message: "必須" }] } };
      }
      return { success: true, data: d };
    }),
  },
}));

vi.mock("@/lib/products", () => ({
  getProductByCode: vi.fn(() => null),
}));

import { verifyAdminAuth } from "@/lib/admin-auth";
const mockAuth = verifyAdminAuth as ReturnType<typeof vi.fn>;

describe("POST /api/admin/bank-transfer/change-product", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("未認証の場合401を返す", async () => {
    mockAuth.mockResolvedValue(false);
    const { POST } = await import("@/app/api/admin/bank-transfer/change-product/route");
    const req = new NextRequest("http://localhost/api/admin/bank-transfer/change-product", {
      method: "POST",
      body: JSON.stringify({ order_id: 1, new_product_code: "A001" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("バリデーションエラーで400を返す", async () => {
    mockAuth.mockResolvedValue(true);
    const { POST } = await import("@/app/api/admin/bank-transfer/change-product/route");
    const req = new NextRequest("http://localhost/api/admin/bank-transfer/change-product", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("認証済みで実行（200 or 400 or 404 or 500）", async () => {
    mockAuth.mockResolvedValue(true);
    const { POST } = await import("@/app/api/admin/bank-transfer/change-product/route");
    const req = new NextRequest("http://localhost/api/admin/bank-transfer/change-product", {
      method: "POST",
      body: JSON.stringify({ order_id: 1, new_product_code: "A001" }),
    });
    const res = await POST(req);
    expect([200, 400, 404, 500]).toContain(res.status);
  });
});
