// lib/__tests__/tenant-backup.test.ts
// テナントバックアップ/リストア機能のテスト

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFrom = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

vi.mock("@/lib/tenant", () => ({
  withTenant: vi.fn((query: unknown) => query),
  tenantPayload: vi.fn((id: string) => ({ tenant_id: id })),
}));

vi.mock("@/lib/crypto", () => ({
  encrypt: vi.fn((data: string) => `encrypted:${data}`),
  decrypt: vi.fn((data: string) => data.replace(/^encrypted:/, "")),
}));

const {
  BACKUP_TABLES,
  exportTenantData,
  importTenantData,
  listBackups,
  getBackupStatus,
  createBackup,
  decryptBackupData,
  deleteBackup,
} = await import("@/lib/tenant-backup");

/* ---------- ヘルパー ---------- */

function createMockChain(data: unknown = null, error: unknown = null) {
  const chain: Record<string, any> = {};
  const methods = ["from", "select", "insert", "update", "upsert", "delete", "eq", "neq", "in", "is", "not", "gt", "gte", "lt", "lte", "like", "ilike", "contains", "containedBy", "filter", "or", "order", "limit", "range", "single", "maybeSingle", "match", "textSearch", "csv", "rpc", "count", "head"];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.then = (resolve: any) => resolve({ data, error, count: Array.isArray(data) ? data.length : 0 });
  return chain;
}

const TENANT_ID = "test-tenant-001";

/* ---------- テスト ---------- */

describe("tenant-backup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("BACKUP_TABLES", () => {
    it("バックアップ対象テーブルが定義されている", () => {
      expect(BACKUP_TABLES.length).toBeGreaterThan(0);
      expect(BACKUP_TABLES).toContain("patients");
      expect(BACKUP_TABLES).toContain("intake");
      expect(BACKUP_TABLES).toContain("tenant_settings");
    });
  });

  describe("exportTenantData", () => {
    it("全テーブルのデータをエクスポートする", async () => {
      const mockPatients = [{ id: "p1", name: "テスト太郎" }];
      mockFrom.mockImplementation(() => createMockChain(mockPatients));

      const result = await exportTenantData(TENANT_ID);

      expect(result.version).toBe("1.0");
      expect(result.tenant_id).toBe(TENANT_ID);
      expect(result.exported_at).toBeTruthy();
      // 全テーブルのデータが含まれる
      for (const table of BACKUP_TABLES) {
        expect(result.tables[table]).toBeDefined();
        expect(result.record_counts[table]).toBe(1);
      }
    });

    it("指定テーブルのみエクスポートする", async () => {
      const mockData = [{ id: "1" }];
      mockFrom.mockImplementation(() => createMockChain(mockData));

      const result = await exportTenantData(TENANT_ID, ["patients", "intake"]);

      expect(Object.keys(result.tables)).toHaveLength(2);
      expect(result.tables["patients"]).toBeDefined();
      expect(result.tables["intake"]).toBeDefined();
    });

    it("エラー発生テーブルはスキップしてエクスポート続行", async () => {
      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return createMockChain(null, { message: "テーブルエラー" });
        }
        return createMockChain([{ id: "1" }]);
      });

      const result = await exportTenantData(TENANT_ID, ["patients", "intake"]);

      // エラーのテーブルはcontinueされてtablesに含まれない
      expect(result.record_counts["patients"]).toBeUndefined();
      // 正常テーブルはデータあり
      expect(result.tables["intake"]).toEqual([{ id: "1" }]);
    });
  });

  describe("importTenantData", () => {
    it("正常にインポートできる", async () => {
      mockFrom.mockImplementation(() => createMockChain(null));

      const exportData = {
        version: "1.0",
        exported_at: new Date().toISOString(),
        tenant_id: "source-tenant",
        tables: {
          patients: [{ id: "550e8400-e29b-41d4-a716-446655440000", name: "太郎", tenant_id: "source-tenant" }],
        },
        record_counts: { patients: 1 },
      };

      const result = await importTenantData(TENANT_ID, exportData);

      expect(result.success).toBe(true);
      expect(result.record_counts).toBeDefined();
      expect(result.record_counts!["patients"]).toBe(1);
    });

    it("空テーブルはスキップされる", async () => {
      mockFrom.mockImplementation(() => createMockChain(null));

      const exportData = {
        version: "1.0",
        exported_at: new Date().toISOString(),
        tenant_id: "source-tenant",
        tables: {
          patients: [],
          intake: [],
        },
        record_counts: { patients: 0, intake: 0 },
      };

      const result = await importTenantData(TENANT_ID, exportData);
      expect(result.success).toBe(true);
    });

    it("インサートエラー時にロールバックしてエラーを返す", async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === "patients") {
          // insertメソッドだけエラーを返すチェーンを作る
          const chain = createMockChain(null);
          chain.insert = vi.fn().mockReturnValue(
            createMockChain(null, { message: "INSERT失敗" })
          );
          return chain;
        }
        return createMockChain(null);
      });

      const exportData = {
        version: "1.0",
        exported_at: new Date().toISOString(),
        tenant_id: "source-tenant",
        tables: {
          patients: [{ id: "550e8400-e29b-41d4-a716-446655440000", name: "太郎" }],
        },
        record_counts: { patients: 1 },
      };

      const result = await importTenantData(TENANT_ID, exportData);
      expect(result.success).toBe(false);
      expect(result.error).toContain("インポートエラー");
    });
  });

  describe("listBackups", () => {
    it("バックアップ一覧を取得する", async () => {
      const mockBackups = [
        { id: "b1", name: "backup-1", status: "completed" },
        { id: "b2", name: "backup-2", status: "processing" },
      ];
      mockFrom.mockImplementation(() => createMockChain(mockBackups));

      const result = await listBackups(TENANT_ID);
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("backup-1");
    });

    it("エラー時は空配列を返す", async () => {
      mockFrom.mockImplementation(() =>
        createMockChain(null, { message: "DBエラー" })
      );

      const result = await listBackups(TENANT_ID);
      expect(result).toEqual([]);
    });
  });

  describe("getBackupStatus", () => {
    it("バックアップステータスを取得する", async () => {
      const mockBackup = { id: "b1", status: "completed" };
      mockFrom.mockImplementation(() => createMockChain(mockBackup));

      const result = await getBackupStatus("b1");
      expect(result).toBeTruthy();
      expect(result!.status).toBe("completed");
    });

    it("エラー時はnullを返す", async () => {
      mockFrom.mockImplementation(() =>
        createMockChain(null, { message: "不明エラー" })
      );

      const result = await getBackupStatus("b999");
      expect(result).toBeNull();
    });
  });

  describe("createBackup", () => {
    it("バックアップを作成して暗号化データを保存する", async () => {
      const backupRecord = { id: "backup-new", status: "processing" };
      const updatedRecord = { id: "backup-new", status: "completed", file_url: "encrypted:..." };

      let callIndex = 0;
      mockFrom.mockImplementation(() => {
        callIndex++;
        // 1回目: insert (バックアップレコード作成)
        if (callIndex === 1) return createMockChain(backupRecord);
        // 2回目以降: exportTenantDataのselect or update
        if (callIndex <= 1 + BACKUP_TABLES.length) return createMockChain([]);
        // 最後: update (完了更新)
        return createMockChain(updatedRecord);
      });

      const result = await createBackup(TENANT_ID, "テストバックアップ", "説明文");
      expect(result).toBeTruthy();
    });

    it("バックアップレコード作成失敗時にエラーをスローする", async () => {
      mockFrom.mockImplementation(() =>
        createMockChain(null, { message: "作成失敗" })
      );

      await expect(
        createBackup(TENANT_ID, "失敗テスト")
      ).rejects.toThrow("バックアップ作成エラー");
    });
  });

  describe("decryptBackupData", () => {
    it("暗号化データを復号してExportDataを返す", () => {
      const originalData = {
        version: "1.0",
        exported_at: "2026-01-01",
        tenant_id: TENANT_ID,
        tables: {},
        record_counts: {},
      };
      const encrypted = `encrypted:${JSON.stringify(originalData)}`;

      const result = decryptBackupData(encrypted);
      expect(result.version).toBe("1.0");
      expect(result.tenant_id).toBe(TENANT_ID);
    });
  });

  describe("deleteBackup", () => {
    it("バックアップを削除できる", async () => {
      mockFrom.mockImplementation(() => createMockChain(null));

      const result = await deleteBackup("b1", TENANT_ID);
      expect(result).toBe(true);
    });

    it("削除エラー時はfalseを返す", async () => {
      mockFrom.mockImplementation(() =>
        createMockChain(null, { message: "削除エラー" })
      );

      const result = await deleteBackup("b999", TENANT_ID);
      expect(result).toBe(false);
    });
  });
});
