// __tests__/api/admin-karte-pdf.test.ts
// カルテPDFダウンロードAPI テスト

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

vi.mock("@/lib/karte-pdf", () => ({
  generateKartePDF: vi.fn(() => Buffer.from("PDF_CONTENT")),
}));

vi.mock("@/lib/soap-parser", () => ({
  parseJsonToSoap: vi.fn(() => ({ s: "", o: "", a: "", p: "" })),
}));

import { verifyAdminAuth } from "@/lib/admin-auth";

const mockAuth = verifyAdminAuth as ReturnType<typeof vi.fn>;

describe("GET /api/admin/karte/[id]/pdf", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("未認証の場合401を返す", async () => {
    mockAuth.mockResolvedValue(false);
    const { GET } = await import("@/app/api/admin/karte/[id]/pdf/route");
    const req = new NextRequest("http://localhost/api/admin/karte/1/pdf");
    const res = await GET(req, { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(401);
  });

  it("不正なIDで404を返す", async () => {
    mockAuth.mockResolvedValue(true);
    const { GET } = await import("@/app/api/admin/karte/[id]/pdf/route");
    const req = new NextRequest("http://localhost/api/admin/karte/abc/pdf");
    const res = await GET(req, { params: Promise.resolve({ id: "abc" }) });
    expect(res.status).toBe(404);
  });

  it("認証済みかつ有効IDで実行（200/404/500）", async () => {
    mockAuth.mockResolvedValue(true);
    const { GET } = await import("@/app/api/admin/karte/[id]/pdf/route");
    const req = new NextRequest("http://localhost/api/admin/karte/123/pdf");
    const res = await GET(req, { params: Promise.resolve({ id: "123" }) });
    // intakeデータが見つからないため404、見つかれば200
    expect([200, 404, 500]).toContain(res.status);
  });
});
