// __tests__/api/platform-tenant-backups.test.ts
// テナントバックアップ管理API テスト

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/platform-auth", () => ({
  verifyPlatformAdmin: vi.fn(),
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(),
}));

vi.mock("@/lib/tenant-backup", () => ({
  listBackups: vi.fn(() => Promise.resolve([])),
  createBackup: vi.fn(() => Promise.resolve({ id: "bk-1", name: "テスト" })),
  deleteBackup: vi.fn(() => Promise.resolve()),
  decryptBackupData: vi.fn(() => ({})),
  importTenantData: vi.fn(() => Promise.resolve()),
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

import { verifyPlatformAdmin } from "@/lib/platform-auth";
const mockAuth = verifyPlatformAdmin as ReturnType<typeof vi.fn>;

const ctx = { params: Promise.resolve({ tenantId: "tenant-1" }) };

describe("GET /api/platform/tenants/[tenantId]/backups", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("未認証の場合403を返す", async () => {
    mockAuth.mockResolvedValue(null);
    const { GET } = await import("@/app/api/platform/tenants/[tenantId]/backups/route");
    const req = new NextRequest("http://localhost/api/platform/tenants/tenant-1/backups");
    const res = await GET(req, ctx);
    expect(res.status).toBe(403);
  });

  it("認証済みで一覧取得", async () => {
    mockAuth.mockResolvedValue({ email: "admin@test.com", name: "Admin" });
    const { GET } = await import("@/app/api/platform/tenants/[tenantId]/backups/route");
    const req = new NextRequest("http://localhost/api/platform/tenants/tenant-1/backups");
    const res = await GET(req, ctx);
    expect(res.status).toBe(200);
  });
});

describe("POST /api/platform/tenants/[tenantId]/backups", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("未認証の場合403を返す", async () => {
    mockAuth.mockResolvedValue(null);
    const { POST } = await import("@/app/api/platform/tenants/[tenantId]/backups/route");
    const req = new NextRequest("http://localhost/api/platform/tenants/tenant-1/backups", {
      method: "POST",
      body: JSON.stringify({ action: "create" }),
    });
    const res = await POST(req, ctx);
    expect(res.status).toBe(403);
  });

  it("バックアップ作成（201）", async () => {
    mockAuth.mockResolvedValue({ email: "admin@test.com", name: "Admin" });
    const { POST } = await import("@/app/api/platform/tenants/[tenantId]/backups/route");
    const req = new NextRequest("http://localhost/api/platform/tenants/tenant-1/backups", {
      method: "POST",
      body: JSON.stringify({ action: "create", name: "テストバックアップ" }),
    });
    const res = await POST(req, ctx);
    expect(res.status).toBe(201);
  });

  it("不正なaction指定で400を返す", async () => {
    mockAuth.mockResolvedValue({ email: "admin@test.com", name: "Admin" });
    const { POST } = await import("@/app/api/platform/tenants/[tenantId]/backups/route");
    const req = new NextRequest("http://localhost/api/platform/tenants/tenant-1/backups", {
      method: "POST",
      body: JSON.stringify({ action: "invalid" }),
    });
    const res = await POST(req, ctx);
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/platform/tenants/[tenantId]/backups", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("未認証の場合403を返す", async () => {
    mockAuth.mockResolvedValue(null);
    const { DELETE } = await import("@/app/api/platform/tenants/[tenantId]/backups/route");
    const req = new NextRequest("http://localhost/api/platform/tenants/tenant-1/backups?backupId=bk-1");
    const res = await DELETE(req, ctx);
    expect(res.status).toBe(403);
  });

  it("backupId未指定で400を返す", async () => {
    mockAuth.mockResolvedValue({ email: "admin@test.com", name: "Admin" });
    const { DELETE } = await import("@/app/api/platform/tenants/[tenantId]/backups/route");
    const req = new NextRequest("http://localhost/api/platform/tenants/tenant-1/backups");
    const res = await DELETE(req, ctx);
    expect(res.status).toBe(400);
  });

  it("認証済みで削除成功", async () => {
    mockAuth.mockResolvedValue({ email: "admin@test.com", name: "Admin" });
    const { DELETE } = await import("@/app/api/platform/tenants/[tenantId]/backups/route");
    const req = new NextRequest("http://localhost/api/platform/tenants/tenant-1/backups?backupId=bk-1");
    const res = await DELETE(req, ctx);
    expect(res.status).toBe(200);
  });
});
