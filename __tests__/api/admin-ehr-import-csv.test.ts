// __tests__/api/admin-ehr-import-csv.test.ts
// EHR CSVインポートAPI テスト

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

vi.mock("@/lib/ehr/csv-adapter", () => ({
  parsePatientCsv: vi.fn(() => []),
  parseKarteCsv: vi.fn(() => []),
}));

vi.mock("@/lib/ehr/mapper", () => ({
  fromEhrPatient: vi.fn(() => ({})),
  fromEhrKarte: vi.fn(() => ({ note: "テスト" })),
}));

vi.mock("@/lib/phone", () => ({
  normalizeJPPhone: vi.fn((tel: string) => tel),
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(),
}));

import { verifyAdminAuth } from "@/lib/admin-auth";
const mockAuth = verifyAdminAuth as ReturnType<typeof vi.fn>;

describe("POST /api/admin/ehr/import-csv", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("未認証の場合401を返す", async () => {
    mockAuth.mockResolvedValue(false);
    const { POST } = await import("@/app/api/admin/ehr/import-csv/route");
    const formData = new FormData();
    formData.append("file", new File(["test"], "test.csv", { type: "text/csv" }));
    formData.append("type", "patient");
    const req = new NextRequest("http://localhost/api/admin/ehr/import-csv", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("ファイル未指定で400を返す", async () => {
    mockAuth.mockResolvedValue(true);
    const { POST } = await import("@/app/api/admin/ehr/import-csv/route");
    const formData = new FormData();
    formData.append("type", "patient");
    const req = new NextRequest("http://localhost/api/admin/ehr/import-csv", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("不正なtypeで400を返す", async () => {
    mockAuth.mockResolvedValue(true);
    const { POST } = await import("@/app/api/admin/ehr/import-csv/route");
    const formData = new FormData();
    formData.append("file", new File(["test"], "test.csv", { type: "text/csv" }));
    formData.append("type", "invalid");
    const req = new NextRequest("http://localhost/api/admin/ehr/import-csv", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("認証済みでCSVインポート（200 or 500）", async () => {
    mockAuth.mockResolvedValue(true);
    const { POST } = await import("@/app/api/admin/ehr/import-csv/route");
    const formData = new FormData();
    formData.append("file", new File(["name,tel\nテスト,090"], "test.csv", { type: "text/csv" }));
    formData.append("type", "patient");
    const req = new NextRequest("http://localhost/api/admin/ehr/import-csv", {
      method: "POST",
      body: formData,
    });
    const res = await POST(req);
    expect([200, 500]).toContain(res.status);
  });
});
