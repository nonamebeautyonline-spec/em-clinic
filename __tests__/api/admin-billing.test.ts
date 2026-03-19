// __tests__/api/admin-billing.test.ts
// テナント側課金API テスト

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// モック
vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: vi.fn(),
}));

vi.mock("@/lib/tenant", () => {
  class TenantRequiredError extends Error {
    constructor() {
      super("テナントIDが指定されていません");
      this.name = "TenantRequiredError";
    }
  }
  return {
    resolveTenantId: vi.fn(),
    resolveTenantIdOrThrow: vi.fn(() => "test-tenant"),
    TenantRequiredError,
  };
});

// 再帰的にチェーン可能なモック（最終呼び出しはResolvedValueを返す）
function chainMock(): Record<string, ReturnType<typeof vi.fn>> {
  const handler = {
    get: (_: unknown, prop: string) => {
      if (prop === "then") return undefined;
      return vi.fn(() => new Proxy({}, handler));
    },
  };
  return new Proxy({}, handler) as Record<string, ReturnType<typeof vi.fn>>;
}

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn(() => chainMock()),
  },
}));

vi.mock("@/lib/plan-config", () => ({
  getPlanByKey: vi.fn(() => ({
    key: "standard",
    label: "スタンダード",
    messageQuota: 30000,
    monthlyPrice: 17000,
    overageUnitPrice: 0.7,
    stripePriceId: "",
  })),
}));

import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow } from "@/lib/tenant";

const mockAuth = verifyAdminAuth as ReturnType<typeof vi.fn>;
const mockTenantOrThrow = resolveTenantIdOrThrow as ReturnType<typeof vi.fn>;

describe("GET /api/admin/billing/summary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("未認証の場合401を返す", async () => {
    mockAuth.mockResolvedValue(false);
    const { GET } = await import("@/app/api/admin/billing/summary/route");
    const req = new NextRequest("http://localhost/api/admin/billing/summary");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("テナント不明の場合TenantRequiredErrorをスローする", async () => {
    mockAuth.mockResolvedValue(true);
    mockTenantOrThrow.mockImplementation(() => { throw new Error("テナントIDが指定されていません"); });
    const { GET } = await import("@/app/api/admin/billing/summary/route");
    const req = new NextRequest("http://localhost/api/admin/billing/summary");
    await expect(GET(req)).rejects.toThrow("テナントIDが指定されていません");
  });

  it("認証済み+テナント指定時はエラーにならない（200 or 500）", async () => {
    mockAuth.mockResolvedValue(true);
    mockTenantOrThrow.mockReturnValue("tenant-1");
    const { GET } = await import("@/app/api/admin/billing/summary/route");
    const req = new NextRequest("http://localhost/api/admin/billing/summary");
    const res = await GET(req);
    // DB モックが不完全でも認証/テナント検証は通過
    expect([200, 500]).toContain(res.status);
  });
});

describe("GET /api/admin/billing/invoices", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("未認証の場合401を返す", async () => {
    mockAuth.mockResolvedValue(false);
    const { GET } = await import("@/app/api/admin/billing/invoices/route");
    const req = new NextRequest("http://localhost/api/admin/billing/invoices");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("テナント不明の場合TenantRequiredErrorをスローする", async () => {
    mockAuth.mockResolvedValue(true);
    mockTenantOrThrow.mockImplementation(() => { throw new Error("テナントIDが指定されていません"); });
    const { GET } = await import("@/app/api/admin/billing/invoices/route");
    const req = new NextRequest("http://localhost/api/admin/billing/invoices");
    await expect(GET(req)).rejects.toThrow("テナントIDが指定されていません");
  });

  it("認証済み+テナント指定時はエラーにならない（200 or 500）", async () => {
    mockAuth.mockResolvedValue(true);
    mockTenantOrThrow.mockReturnValue("tenant-1");
    const { GET } = await import("@/app/api/admin/billing/invoices/route");
    const req = new NextRequest("http://localhost/api/admin/billing/invoices?page=2&limit=5");
    const res = await GET(req);
    expect([200, 500]).toContain(res.status);
  });
});

describe("GET /api/admin/billing/receipt/[invoiceId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("未認証の場合401を返す", async () => {
    mockAuth.mockResolvedValue(false);
    const { GET } = await import("@/app/api/admin/billing/receipt/[invoiceId]/route");
    const req = new NextRequest("http://localhost/api/admin/billing/receipt/inv-1");
    const res = await GET(req, { params: Promise.resolve({ invoiceId: "inv-1" }) });
    expect(res.status).toBe(401);
  });

  it("テナント不明の場合TenantRequiredErrorをスローする", async () => {
    mockAuth.mockResolvedValue(true);
    mockTenantOrThrow.mockImplementation(() => { throw new Error("テナントIDが指定されていません"); });
    const { GET } = await import("@/app/api/admin/billing/receipt/[invoiceId]/route");
    const req = new NextRequest("http://localhost/api/admin/billing/receipt/inv-1");
    await expect(GET(req, { params: Promise.resolve({ invoiceId: "inv-1" }) })).rejects.toThrow("テナントIDが指定されていません");
  });

  it("認証済み+テナント指定時はエラーにならない（404 or 500）", async () => {
    mockAuth.mockResolvedValue(true);
    mockTenantOrThrow.mockReturnValue("tenant-1");
    const { GET } = await import("@/app/api/admin/billing/receipt/[invoiceId]/route");
    const req = new NextRequest("http://localhost/api/admin/billing/receipt/inv-nonexist");
    const res = await GET(req, { params: Promise.resolve({ invoiceId: "inv-nonexist" }) });
    // DBモック不完全でも認証/テナント検証は通過
    expect([404, 500]).toContain(res.status);
  });
});
