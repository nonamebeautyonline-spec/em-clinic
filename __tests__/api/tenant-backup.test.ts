// __tests__/api/tenant-backup.test.ts
// テナントバックアップ/リストア機能のテスト
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- モック設定 ---
const mockVerifyAdminAuth = vi.fn().mockResolvedValue(true);
const mockGetAdminUserId = vi.fn().mockResolvedValue("user-123");

vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: (...args: unknown[]) => mockVerifyAdminAuth(...args),
  getAdminUserId: (...args: unknown[]) => mockGetAdminUserId(...args),
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant-id"),
  resolveTenantIdOrThrow: vi.fn(() => "test-tenant-id"),
  withTenant: vi.fn((q: unknown) => q),
  strictWithTenant: vi.fn((q: unknown) => q),
  tenantPayload: vi.fn(() => ({ tenant_id: "test-tenant-id" })),
}));

// crypto モック
vi.mock("@/lib/crypto", () => ({
  encrypt: vi.fn((data: string) => `encrypted:${data}`),
  decrypt: vi.fn((data: string) => data.replace("encrypted:", "")),
}));

// uuid モック
vi.mock("uuid", () => ({
  v4: vi.fn(() => "new-uuid-1234"),
}));

// supabaseAdmin モック
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockEq = vi.fn();
const mockNeq = vi.fn();
const mockOrder = vi.fn();
const mockSingle = vi.fn();
const mockMaybeSingle = vi.fn();

function createChainMock(finalData: unknown = null, finalError: unknown = null) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: finalData, error: finalError }),
    maybeSingle: vi.fn().mockResolvedValue({ data: finalData, error: finalError }),
  };
  // selectなど最後にthenableが必要な場合
  chain.select.mockReturnValue(chain);
  chain.insert.mockReturnValue(chain);
  chain.update.mockReturnValue(chain);
  chain.delete.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.neq.mockReturnValue(chain);
  chain.order.mockReturnValue(chain);

  // デフォルトのPromise解決（select, insert等の直接await用）
  const resolveValue = { data: finalData, error: finalError };
  Object.assign(chain, {
    then: (resolve: (v: unknown) => void) => resolve(resolveValue),
  });

  return chain;
}

const mockFromChains: Record<string, ReturnType<typeof createChainMock>> = {};
const mockFrom = vi.fn((table: string) => {
  if (!mockFromChains[table]) {
    mockFromChains[table] = createChainMock();
  }
  return mockFromChains[table];
});

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockFrom(...(args as [string])),
  },
}));

// NextRequest互換のモック
function createMockRequest(method: string, url: string, body?: Record<string, unknown>) {
  const parsedUrl = new URL(url);
  return {
    method,
    url,
    nextUrl: { searchParams: parsedUrl.searchParams },
    cookies: { get: vi.fn(() => undefined) },
    headers: { get: vi.fn((name: string) => (name === "x-tenant-id" ? "test-tenant-id" : null)) },
    json: body ? vi.fn().mockResolvedValue(body) : vi.fn(),
  } as unknown as import("next/server").NextRequest;
}

// ========================================
// lib/tenant-backup.ts のユニットテスト
// ========================================
describe("lib/tenant-backup.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // チェーンモックをリセット
    Object.keys(mockFromChains).forEach((key) => delete mockFromChains[key]);
  });

  describe("BACKUP_TABLES", () => {
    it("バックアップ対象テーブルが定義されている", async () => {
      const { BACKUP_TABLES } = await import("@/lib/tenant-backup");
      expect(BACKUP_TABLES).toBeDefined();
      expect(BACKUP_TABLES.length).toBeGreaterThan(0);
      expect(BACKUP_TABLES).toContain("patients");
      expect(BACKUP_TABLES).toContain("intake");
      expect(BACKUP_TABLES).toContain("orders");
    });
  });

  describe("exportTenantData", () => {
    it("テナントデータをエクスポートできる", async () => {
      const { exportTenantData } = await import("@/lib/tenant-backup");

      // 各テーブルのモックデータを設定
      const patientData = [{ id: "p1", name: "テスト患者", tenant_id: "test-tenant-id" }];
      mockFromChains["patients"] = createChainMock(patientData);

      const result = await exportTenantData("test-tenant-id", ["patients"]);

      expect(result.version).toBe("1.0");
      expect(result.tenant_id).toBe("test-tenant-id");
      expect(result.tables).toBeDefined();
      expect(result.record_counts).toBeDefined();
    });

    it("テーブル指定なしで全テーブルをエクスポートする", async () => {
      const { exportTenantData, BACKUP_TABLES } = await import("@/lib/tenant-backup");

      const result = await exportTenantData("test-tenant-id");

      // 全テーブル分のfromが呼ばれる
      for (const table of BACKUP_TABLES) {
        expect(mockFrom).toHaveBeenCalledWith(table);
      }
      expect(result.exported_at).toBeDefined();
    });
  });

  describe("importTenantData", () => {
    it("エクスポートデータをインポートできる", async () => {
      const { importTenantData } = await import("@/lib/tenant-backup");

      const exportData = {
        version: "1.0",
        exported_at: new Date().toISOString(),
        tenant_id: "source-tenant",
        tables: {
          patients: [
            { id: "old-uuid-1234-5678-1234-567890abcdef", name: "テスト", tenant_id: "source-tenant" },
          ],
        },
        record_counts: { patients: 1 },
      };

      const result = await importTenantData("test-tenant-id", exportData);
      expect(result.success).toBe(true);
    });

    it("空データのインポートは成功する", async () => {
      const { importTenantData } = await import("@/lib/tenant-backup");

      const exportData = {
        version: "1.0",
        exported_at: new Date().toISOString(),
        tenant_id: "source-tenant",
        tables: {},
        record_counts: {},
      };

      const result = await importTenantData("test-tenant-id", exportData);
      expect(result.success).toBe(true);
    });
  });

  describe("listBackups", () => {
    it("バックアップ一覧を取得できる", async () => {
      const { listBackups } = await import("@/lib/tenant-backup");

      const mockBackups = [
        { id: "b1", name: "バックアップ1", status: "completed" },
        { id: "b2", name: "バックアップ2", status: "processing" },
      ];
      mockFromChains["tenant_backups"] = createChainMock(mockBackups);

      const result = await listBackups("test-tenant-id");
      expect(result).toEqual(mockBackups);
    });

    it("エラー時は空配列を返す", async () => {
      const { listBackups } = await import("@/lib/tenant-backup");

      mockFromChains["tenant_backups"] = createChainMock(null, { message: "DB error" });

      const result = await listBackups("test-tenant-id");
      expect(result).toEqual([]);
    });
  });

  describe("getBackupStatus", () => {
    it("バックアップステータスを取得できる", async () => {
      const { getBackupStatus } = await import("@/lib/tenant-backup");

      const mockBackup = { id: "b1", status: "completed", name: "テスト" };
      const chain = createChainMock(mockBackup);
      mockFromChains["tenant_backups"] = chain;

      const result = await getBackupStatus("b1");
      expect(result).toEqual(mockBackup);
    });
  });

  describe("decryptBackupData", () => {
    it("暗号化データを復号できる", async () => {
      const { decryptBackupData } = await import("@/lib/tenant-backup");

      const original = {
        version: "1.0",
        exported_at: "2026-03-07T00:00:00Z",
        tenant_id: "test",
        tables: {},
        record_counts: {},
      };
      const encrypted = `encrypted:${JSON.stringify(original)}`;

      const result = decryptBackupData(encrypted);
      expect(result.version).toBe("1.0");
      expect(result.tenant_id).toBe("test");
    });
  });
});

// ========================================
// API ルートのテスト
// ========================================
describe("バックアップ API ルート", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockFromChains).forEach((key) => delete mockFromChains[key]);
    mockVerifyAdminAuth.mockResolvedValue(true);
  });

  // --- GET /api/admin/backup ---
  describe("GET /api/admin/backup", () => {
    it("認証失敗 → 401", async () => {
      mockVerifyAdminAuth.mockResolvedValue(false);
      const { GET } = await import("@/app/api/admin/backup/route");
      const req = createMockRequest("GET", "http://localhost/api/admin/backup");
      const res = await GET(req);
      expect(res.status).toBe(401);
    });

    it("認証成功 → バックアップ一覧を返す", async () => {
      const backups = [{ id: "b1", name: "テスト", status: "completed" }];
      mockFromChains["tenant_backups"] = createChainMock(backups);

      const { GET } = await import("@/app/api/admin/backup/route");
      const req = createMockRequest("GET", "http://localhost/api/admin/backup");
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.backups).toBeDefined();
    });
  });

  // --- POST /api/admin/backup ---
  describe("POST /api/admin/backup", () => {
    it("認証失敗 → 401", async () => {
      mockVerifyAdminAuth.mockResolvedValue(false);
      const { POST } = await import("@/app/api/admin/backup/route");
      const req = createMockRequest("POST", "http://localhost/api/admin/backup", {
        name: "テスト",
      });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it("無効なテーブル名 → 400", async () => {
      const { POST } = await import("@/app/api/admin/backup/route");
      const req = createMockRequest("POST", "http://localhost/api/admin/backup", {
        name: "テスト",
        tables: ["invalid_table"],
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toContain("無効なテーブル名");
    });
  });

  // --- POST /api/admin/backup/restore ---
  describe("POST /api/admin/backup/restore", () => {
    it("認証失敗 → 401", async () => {
      mockVerifyAdminAuth.mockResolvedValue(false);
      const { POST } = await import("@/app/api/admin/backup/restore/route");
      const req = createMockRequest("POST", "http://localhost/api/admin/backup/restore", {
        backup_id: "b1",
        confirm: true,
      });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it("backup_id なし → 400", async () => {
      const { POST } = await import("@/app/api/admin/backup/restore/route");
      const req = createMockRequest("POST", "http://localhost/api/admin/backup/restore", {});
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("confirm なし → 400", async () => {
      const { POST } = await import("@/app/api/admin/backup/restore/route");
      const req = createMockRequest("POST", "http://localhost/api/admin/backup/restore", {
        backup_id: "b1",
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toContain("confirm");
    });

    it("バックアップ未完了 → 400", async () => {
      const mockBackup = {
        id: "b1",
        tenant_id: "test-tenant-id",
        status: "processing",
        file_url: null,
      };
      const chain = createChainMock(mockBackup);
      mockFromChains["tenant_backups"] = chain;

      const { POST } = await import("@/app/api/admin/backup/restore/route");
      const req = createMockRequest("POST", "http://localhost/api/admin/backup/restore", {
        backup_id: "b1",
        confirm: true,
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });
  });

  // --- GET /api/admin/backup/[id] ---
  describe("GET /api/admin/backup/[id]", () => {
    it("認証失敗 → 401", async () => {
      mockVerifyAdminAuth.mockResolvedValue(false);
      const { GET } = await import("@/app/api/admin/backup/[id]/route");
      const req = createMockRequest("GET", "http://localhost/api/admin/backup/b1");
      const res = await GET(req, { params: Promise.resolve({ id: "b1" }) });
      expect(res.status).toBe(401);
    });

    it("バックアップ未存在 → 404", async () => {
      const chain = createChainMock(null);
      mockFromChains["tenant_backups"] = chain;

      const { GET } = await import("@/app/api/admin/backup/[id]/route");
      const req = createMockRequest("GET", "http://localhost/api/admin/backup/b1");
      const res = await GET(req, { params: Promise.resolve({ id: "nonexistent" }) });
      expect(res.status).toBe(404);
    });

    it("他テナントのバックアップ → 404", async () => {
      const mockBackup = {
        id: "b1",
        tenant_id: "other-tenant",
        status: "completed",
      };
      const chain = createChainMock(mockBackup);
      mockFromChains["tenant_backups"] = chain;

      const { GET } = await import("@/app/api/admin/backup/[id]/route");
      const req = createMockRequest("GET", "http://localhost/api/admin/backup/b1");
      const res = await GET(req, { params: Promise.resolve({ id: "b1" }) });
      expect(res.status).toBe(404);
    });
  });

  // --- DELETE /api/admin/backup/[id] ---
  describe("DELETE /api/admin/backup/[id]", () => {
    it("認証失敗 → 401", async () => {
      mockVerifyAdminAuth.mockResolvedValue(false);
      const { DELETE } = await import("@/app/api/admin/backup/[id]/route");
      const req = createMockRequest("DELETE", "http://localhost/api/admin/backup/b1");
      const res = await DELETE(req, { params: Promise.resolve({ id: "b1" }) });
      expect(res.status).toBe(401);
    });
  });

  // --- GET /api/admin/backup/[id]/download ---
  describe("GET /api/admin/backup/[id]/download", () => {
    it("認証失敗 → 401", async () => {
      mockVerifyAdminAuth.mockResolvedValue(false);
      const { GET } = await import("@/app/api/admin/backup/[id]/download/route");
      const req = createMockRequest("GET", "http://localhost/api/admin/backup/b1/download");
      const res = await GET(req, { params: Promise.resolve({ id: "b1" }) });
      expect(res.status).toBe(401);
    });

    it("未完了バックアップ → 400", async () => {
      const mockBackup = {
        id: "b1",
        tenant_id: "test-tenant-id",
        status: "processing",
        file_url: null,
      };
      const chain = createChainMock(mockBackup);
      mockFromChains["tenant_backups"] = chain;

      const { GET } = await import("@/app/api/admin/backup/[id]/download/route");
      const req = createMockRequest("GET", "http://localhost/api/admin/backup/b1/download");
      const res = await GET(req, { params: Promise.resolve({ id: "b1" }) });
      expect(res.status).toBe(400);
    });
  });
});

// ========================================
// セキュリティテスト
// ========================================
describe("バックアップ セキュリティ", () => {
  it("全バックアップAPIが verifyAdminAuth で認証している", async () => {
    const fs = await import("fs");
    const apiFiles = [
      "app/api/admin/backup/route.ts",
      "app/api/admin/backup/[id]/route.ts",
      "app/api/admin/backup/[id]/download/route.ts",
      "app/api/admin/backup/restore/route.ts",
    ];

    for (const file of apiFiles) {
      const src = fs.readFileSync(file, "utf-8");
      expect(src).toContain("verifyAdminAuth");
      expect(src).toContain("resolveTenantId");
    }
  });

  it("リストアAPIはconfirmフラグを要求する", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync("app/api/admin/backup/restore/route.ts", "utf-8");
    expect(src).toContain("confirm");
  });

  it("バックアップデータは暗号化されている", async () => {
    const fs = await import("fs");
    const src = fs.readFileSync("lib/tenant-backup.ts", "utf-8");
    expect(src).toContain("encrypt");
    expect(src).toContain("decrypt");
  });
});
