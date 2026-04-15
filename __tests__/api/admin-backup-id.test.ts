// __tests__/api/admin-backup-id.test.ts
// バックアップ詳細/削除 API のテスト
// 対象: app/api/admin/backup/[id]/route.ts

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// === モック定義 ===
const mockVerifyAdminAuth = vi.fn();
vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: (...args: unknown[]) => mockVerifyAdminAuth(...args),
}));

const mockResolveTenantIdOrThrow = vi.fn();
vi.mock("@/lib/tenant", () => ({
  resolveTenantIdOrThrow: (...args: unknown[]) => mockResolveTenantIdOrThrow(...args),
}));

const mockGetBackupStatus = vi.fn();
const mockDeleteBackup = vi.fn();
vi.mock("@/lib/tenant-backup", () => ({
  getBackupStatus: (...args: unknown[]) => mockGetBackupStatus(...args),
  deleteBackup: (...args: unknown[]) => mockDeleteBackup(...args),
}));

const mockLogAudit = vi.fn();
vi.mock("@/lib/audit", () => ({
  logAudit: (...args: unknown[]) => mockLogAudit(...args),
}));

import { GET, DELETE } from "@/app/api/admin/backup/[id]/route";

describe("GET /api/admin/backup/[id]", () => {
  const makeReq = () => new NextRequest("http://localhost/api/admin/backup/123", { method: "GET" });
  const makeParams = (id = "123") => ({ params: Promise.resolve({ id }) });

  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyAdminAuth.mockResolvedValue(true);
    mockResolveTenantIdOrThrow.mockReturnValue("tenant-1");
  });

  // ── 認証テスト ──
  it("未認証時は401を返す", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const res = await GET(makeReq(), makeParams());
    expect(res.status).toBe(401);
  });

  // ── テナントID未解決 ──
  it("テナントID未解決時はbadRequestを返す", async () => {
    mockResolveTenantIdOrThrow.mockReturnValue(null);
    const res = await GET(makeReq(), makeParams());
    expect(res.status).toBe(400);
  });

  // ── 正常系: バックアップ取得 ──
  it("バックアップ詳細を返す（file_urlを除外）", async () => {
    mockGetBackupStatus.mockResolvedValue({
      id: "123",
      tenant_id: "tenant-1",
      status: "completed",
      file_url: "s3://secret-path",
      created_at: "2025-01-01",
    });

    const res = await GET(makeReq(), makeParams());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.backup.status).toBe("completed");
    // file_urlが除外されていること
    expect(body.backup.file_url).toBeUndefined();
  });

  // ── バックアップ未発見 ──
  it("バックアップが見つからない場合は404を返す", async () => {
    mockGetBackupStatus.mockResolvedValue(null);
    const res = await GET(makeReq(), makeParams());
    expect(res.status).toBe(404);
  });

  // ── 他テナントのバックアップ ──
  it("別テナントのバックアップにはアクセスできない", async () => {
    mockGetBackupStatus.mockResolvedValue({
      id: "123",
      tenant_id: "other-tenant",
      status: "completed",
    });
    const res = await GET(makeReq(), makeParams());
    expect(res.status).toBe(404);
  });

  // ── 例外時は500 ──
  it("例外発生時は500を返す", async () => {
    mockGetBackupStatus.mockRejectedValue(new Error("DB error"));
    const res = await GET(makeReq(), makeParams());
    expect(res.status).toBe(500);
  });
});

describe("DELETE /api/admin/backup/[id]", () => {
  const makeReq = () => new NextRequest("http://localhost/api/admin/backup/123", { method: "DELETE" });
  const makeParams = (id = "123") => ({ params: Promise.resolve({ id }) });

  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyAdminAuth.mockResolvedValue(true);
    mockResolveTenantIdOrThrow.mockReturnValue("tenant-1");
  });

  // ── 認証テスト ──
  it("未認証時は401を返す", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const res = await DELETE(makeReq(), makeParams());
    expect(res.status).toBe(401);
  });

  // ── 正常系: 削除成功 ──
  it("バックアップを正常に削除する", async () => {
    mockGetBackupStatus.mockResolvedValue({
      id: "123",
      tenant_id: "tenant-1",
      status: "completed",
    });
    mockDeleteBackup.mockResolvedValue(true);

    const res = await DELETE(makeReq(), makeParams());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(mockDeleteBackup).toHaveBeenCalledWith("123", "tenant-1");
    expect(mockLogAudit).toHaveBeenCalled();
  });

  // ── バックアップ未発見 ──
  it("バックアップが見つからない場合は404を返す", async () => {
    mockGetBackupStatus.mockResolvedValue(null);
    const res = await DELETE(makeReq(), makeParams());
    expect(res.status).toBe(404);
  });

  // ── 削除失敗 ──
  it("削除に失敗した場合は500を返す", async () => {
    mockGetBackupStatus.mockResolvedValue({
      id: "123",
      tenant_id: "tenant-1",
      status: "completed",
    });
    mockDeleteBackup.mockResolvedValue(false);

    const res = await DELETE(makeReq(), makeParams());
    expect(res.status).toBe(500);
  });

  // ── 他テナントのバックアップは削除不可 ──
  it("別テナントのバックアップは削除できない", async () => {
    mockGetBackupStatus.mockResolvedValue({
      id: "123",
      tenant_id: "other-tenant",
      status: "completed",
    });
    const res = await DELETE(makeReq(), makeParams());
    expect(res.status).toBe(404);
    expect(mockDeleteBackup).not.toHaveBeenCalled();
  });

  // ── 例外時は500 ──
  it("例外発生時は500を返す", async () => {
    mockGetBackupStatus.mockRejectedValue(new Error("DB error"));
    const res = await DELETE(makeReq(), makeParams());
    expect(res.status).toBe(500);
  });
});
