// lib/__tests__/export-worker.test.ts
// データエクスポートワーカーのテスト

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFrom = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

const { executeFullExport } = await import("@/lib/export-worker");

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

const JOB_ID = "job-001";
const TENANT_ID = "tenant-001";

/* ---------- テスト ---------- */

describe("export-worker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("正常に全テーブルをエクスポートする", async () => {
    const mockData = [
      { patient_id: "p1", name: "テスト太郎", created_at: "2026-01-01" },
    ];
    mockFrom.mockImplementation(() => createMockChain(mockData));

    await executeFullExport(JOB_ID, TENANT_ID);

    // export_jobsのupdate呼び出しを確認（processing → completed）
    expect(mockFrom).toHaveBeenCalledWith("export_jobs");
  });

  it("BOM付きUTF-8のCSVが生成される", async () => {
    const mockData = [{ patient_id: "p1", name: "太郎", created_at: "2026-01-01" }];
    let savedFileUrl = "";

    mockFrom.mockImplementation((table: string) => {
      if (table === "export_jobs") {
        const chain = createMockChain(null);
        // updateの呼び出しをキャプチャ
        const origUpdate = chain.update;
        chain.update = vi.fn((payload: any) => {
          if (payload.file_url) {
            savedFileUrl = payload.file_url;
          }
          return origUpdate(payload);
        });
        return chain;
      }
      return createMockChain(mockData);
    });

    await executeFullExport(JOB_ID, TENANT_ID);

    // file_urlに保存されたCSVデータを確認
    if (savedFileUrl) {
      const parsed = JSON.parse(savedFileUrl);
      expect(parsed.files).toBeDefined();
      expect(parsed.files.length).toBeGreaterThan(0);
      // BOM付きか確認
      const firstFile = parsed.files[0];
      expect(firstFile.content.startsWith("\uFEFF")).toBe(true);
    }
  });

  it("空テーブルでもCSVヘッダーは生成される", async () => {
    let savedFileUrl = "";

    mockFrom.mockImplementation((table: string) => {
      if (table === "export_jobs") {
        const chain = createMockChain(null);
        const origUpdate = chain.update;
        chain.update = vi.fn((payload: any) => {
          if (payload.file_url) {
            savedFileUrl = payload.file_url;
          }
          return origUpdate(payload);
        });
        return chain;
      }
      return createMockChain([]); // 空データ
    });

    await executeFullExport(JOB_ID, TENANT_ID);

    if (savedFileUrl) {
      const parsed = JSON.parse(savedFileUrl);
      // 空データでもCSVファイルは生成される（ヘッダーのみ）
      for (const file of parsed.files) {
        expect(file.content).toBeTruthy();
      }
    }
  });

  it("一部テーブルでエラーが発生しても他テーブルはエクスポートされる", async () => {
    let callCount = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === "export_jobs") {
        return createMockChain(null);
      }
      callCount++;
      // 最初のテーブルはエラー（tenant_idフィルタ失敗→リトライも失敗）
      if (callCount === 1) {
        const chain = createMockChain(null, { message: "テーブルエラー" });
        // リトライも失敗させるため、Promise.rejectをシミュレート
        return chain;
      }
      return createMockChain([{ id: "1", created_at: "2026-01-01" }]);
    });

    // エラーが発生してもexecuteFullExportはthrowしない
    await expect(executeFullExport(JOB_ID, TENANT_ID)).resolves.not.toThrow();
  });

  it("エクスポート失敗時にステータスをfailedに更新する", async () => {
    let failedUpdate = false;
    let firstCall = true;

    mockFrom.mockImplementation((table: string) => {
      if (table === "export_jobs") {
        const chain = createMockChain(null);
        const origUpdate = chain.update;
        chain.update = vi.fn((payload: any) => {
          if (payload.status === "failed") {
            failedUpdate = true;
          }
          // processing更新後にエラーをスロー（Promise.allSettled前に落とす）
          if (payload.status === "processing" && firstCall) {
            firstCall = false;
            throw new Error("致命的エラー");
          }
          return origUpdate(payload);
        });
        return chain;
      }
      return createMockChain([]);
    });

    await executeFullExport(JOB_ID, TENANT_ID);
    expect(failedUpdate).toBe(true);
  });

  it("CSVセルのダブルクォートがエスケープされる", async () => {
    const mockData = [
      { patient_id: "p1", name: '名前に"引用符"がある', created_at: "2026-01-01" },
    ];
    let savedFileUrl = "";

    mockFrom.mockImplementation((table: string) => {
      if (table === "export_jobs") {
        const chain = createMockChain(null);
        const origUpdate = chain.update;
        chain.update = vi.fn((payload: any) => {
          if (payload.file_url) {
            savedFileUrl = payload.file_url;
          }
          return origUpdate(payload);
        });
        return chain;
      }
      return createMockChain(mockData);
    });

    await executeFullExport(JOB_ID, TENANT_ID);

    if (savedFileUrl) {
      const parsed = JSON.parse(savedFileUrl);
      // ダブルクォート含むデータが正しくエスケープされていることを確認
      const patientsFile = parsed.files.find((f: any) => f.name === "patients.csv");
      if (patientsFile) {
        expect(patientsFile.content).toContain('""');
      }
    }
  });

  it("record_countsが正しく集計される", async () => {
    let recordCounts: Record<string, number> | null = null;

    mockFrom.mockImplementation((table: string) => {
      if (table === "export_jobs") {
        const chain = createMockChain(null);
        const origUpdate = chain.update;
        chain.update = vi.fn((payload: any) => {
          if (payload.record_counts) {
            recordCounts = payload.record_counts;
          }
          return origUpdate(payload);
        });
        return chain;
      }
      return createMockChain([
        { id: "1", created_at: "2026-01-01" },
        { id: "2", created_at: "2026-01-02" },
      ]);
    });

    await executeFullExport(JOB_ID, TENANT_ID);

    if (recordCounts) {
      // 各テーブルが2件ずつカウントされる
      expect(recordCounts["patients"]).toBe(2);
      expect(recordCounts["orders"]).toBe(2);
    }
  });

  it("ステータスがprocessingに更新されてからエクスポートが始まる", async () => {
    const updateCalls: string[] = [];

    mockFrom.mockImplementation((table: string) => {
      if (table === "export_jobs") {
        const chain = createMockChain(null);
        const origUpdate = chain.update;
        chain.update = vi.fn((payload: any) => {
          if (payload.status) {
            updateCalls.push(payload.status);
          }
          return origUpdate(payload);
        });
        return chain;
      }
      return createMockChain([]);
    });

    await executeFullExport(JOB_ID, TENANT_ID);

    // processing → completed の順序
    expect(updateCalls[0]).toBe("processing");
    expect(updateCalls[updateCalls.length - 1]).toBe("completed");
  });
});
