// __tests__/api/admin-hotpepper-import.test.ts
// HotPepper CSVインポートAPI テスト

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: vi.fn(),
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  resolveTenantIdOrThrow: vi.fn(() => "test-tenant"),
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

vi.mock("@/lib/hotpepper-csv-parser", () => ({
  parseHotpepperCsv: vi.fn(() => []),
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(),
}));

import { verifyAdminAuth } from "@/lib/admin-auth";

const mockAuth = verifyAdminAuth as ReturnType<typeof vi.fn>;

describe("POST /api/admin/hotpepper/import-csv", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("未認証の場合401を返す", async () => {
    mockAuth.mockResolvedValue(false);
    const { POST } = await import("@/app/api/admin/hotpepper/import-csv/route");
    const formData = new FormData();
    formData.append("file", new File(["test"], "test.csv", { type: "text/csv" }));
    const req = new NextRequest("http://localhost/api/admin/hotpepper/import-csv", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("ファイル未指定で400を返す", async () => {
    mockAuth.mockResolvedValue(true);
    const { POST } = await import("@/app/api/admin/hotpepper/import-csv/route");
    const formData = new FormData();
    const req = new NextRequest("http://localhost/api/admin/hotpepper/import-csv", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("空CSVで400を返す", async () => {
    mockAuth.mockResolvedValue(true);
    const { POST } = await import("@/app/api/admin/hotpepper/import-csv/route");
    const formData = new FormData();
    formData.append("file", new File([""], "empty.csv", { type: "text/csv" }));
    const req = new NextRequest("http://localhost/api/admin/hotpepper/import-csv", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("データ行なしCSVで400を返す", async () => {
    mockAuth.mockResolvedValue(true);
    const { parseHotpepperCsv } = await import("@/lib/hotpepper-csv-parser");
    (parseHotpepperCsv as ReturnType<typeof vi.fn>).mockReturnValue([]);

    const { POST } = await import("@/app/api/admin/hotpepper/import-csv/route");
    const formData = new FormData();
    formData.append("file", new File(["header1,header2"], "data.csv", { type: "text/csv" }));
    const req = new NextRequest("http://localhost/api/admin/hotpepper/import-csv", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
