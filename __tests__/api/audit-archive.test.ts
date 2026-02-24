// __tests__/api/audit-archive.test.ts — 監査ログアーカイブCronのテスト
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// --- モック ---
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockDelete = vi.fn();
const mockLt = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();
const mockIn = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

const mockAcquireLock = vi.fn();
vi.mock("@/lib/distributed-lock", () => ({
  acquireLock: (...args: unknown[]) => mockAcquireLock(...args),
}));

function createRequest(cronSecret?: string): NextRequest {
  const headers: Record<string, string> = {};
  if (cronSecret) {
    headers["authorization"] = `Bearer ${cronSecret}`;
  }
  return new NextRequest("http://localhost:3000/api/cron/audit-archive", {
    method: "GET",
    headers,
  });
}

describe("GET /api/cron/audit-archive", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env.CRON_SECRET = "test-secret";

    // デフォルト: ロック取得成功
    mockAcquireLock.mockResolvedValue({
      acquired: true,
      release: vi.fn(),
    });
  });

  it("CRON_SECRET が不一致の場合は 401 を返す", async () => {
    const { GET } = await import("@/app/api/cron/audit-archive/route");
    const res = await GET(createRequest("wrong-secret"));
    expect(res.status).toBe(401);
  });

  it("CRON_SECRET が一致する場合は処理を実行する", async () => {
    // audit_logsから3年超のレコードなし
    mockLimit.mockResolvedValue({ data: [], error: null });
    mockOrder.mockReturnValue({ limit: mockLimit });
    mockLt.mockReturnValue({ order: mockOrder });
    mockSelect.mockReturnValue({ lt: mockLt });

    // archiveの5年超削除もデータなし
    const mockArchiveSelect = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockArchiveLt = vi.fn().mockReturnValue({ select: mockArchiveSelect });
    const mockArchiveDelete = vi.fn().mockReturnValue({ lt: mockArchiveLt });

    mockFrom.mockImplementation((table: string) => {
      if (table === "audit_logs") {
        return { select: mockSelect, delete: mockDelete };
      }
      if (table === "audit_logs_archive") {
        return { insert: mockInsert, delete: mockArchiveDelete };
      }
      return {};
    });

    const { GET } = await import("@/app/api/cron/audit-archive/route");
    const res = await GET(createRequest("test-secret"));
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.archivedCount).toBe(0);
    expect(json.deletedCount).toBe(0);
  });

  it("3年超のレコードをアーカイブする", async () => {
    const oldLogs = [
      { id: "log-1", action: "test", created_at: "2022-01-01T00:00:00Z" },
      { id: "log-2", action: "test2", created_at: "2022-06-01T00:00:00Z" },
    ];

    // 1回目: データあり、2回目: データなし
    let callCount = 0;
    const mockSelectChain = () => {
      callCount++;
      if (callCount === 1) {
        return { data: oldLogs, error: null };
      }
      return { data: [], error: null };
    };

    mockLimit.mockImplementation(mockSelectChain);
    mockOrder.mockReturnValue({ limit: mockLimit });
    mockLt.mockReturnValue({ order: mockOrder });
    mockSelect.mockReturnValue({ lt: mockLt });

    // INSERT成功
    mockInsert.mockResolvedValue({ error: null });

    // DELETE成功
    mockIn.mockResolvedValue({ error: null });
    mockDelete.mockReturnValue({ in: mockIn });

    // archive DELETE（5年超）
    const mockArchiveSelect = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockArchiveLt = vi.fn().mockReturnValue({ select: mockArchiveSelect });
    const mockArchiveDelete = vi.fn().mockReturnValue({ lt: mockArchiveLt });

    mockFrom.mockImplementation((table: string) => {
      if (table === "audit_logs") {
        return { select: mockSelect, delete: mockDelete };
      }
      if (table === "audit_logs_archive") {
        return { insert: mockInsert, delete: mockArchiveDelete };
      }
      return {};
    });

    const { GET } = await import("@/app/api/cron/audit-archive/route");
    const res = await GET(createRequest("test-secret"));
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.archivedCount).toBe(2);
  });

  it("5年超のアーカイブを削除する", async () => {
    // audit_logsに3年超のレコードなし
    mockLimit.mockResolvedValue({ data: [], error: null });
    mockOrder.mockReturnValue({ limit: mockLimit });
    mockLt.mockReturnValue({ order: mockOrder });
    mockSelect.mockReturnValue({ lt: mockLt });

    // archive DELETE（5年超）に3件あり
    const mockArchiveSelect = vi.fn().mockResolvedValue({
      data: [{ id: "arc-1" }, { id: "arc-2" }, { id: "arc-3" }],
      error: null,
    });
    const mockArchiveLt = vi.fn().mockReturnValue({ select: mockArchiveSelect });
    const mockArchiveDelete = vi.fn().mockReturnValue({ lt: mockArchiveLt });

    mockFrom.mockImplementation((table: string) => {
      if (table === "audit_logs") {
        return { select: mockSelect };
      }
      if (table === "audit_logs_archive") {
        return { insert: mockInsert, delete: mockArchiveDelete };
      }
      return {};
    });

    const { GET } = await import("@/app/api/cron/audit-archive/route");
    const res = await GET(createRequest("test-secret"));
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.deletedCount).toBe(3);
  });

  it("排他制御でロック取得失敗時はスキップする", async () => {
    mockAcquireLock.mockResolvedValue({
      acquired: false,
      release: vi.fn(),
    });

    const { GET } = await import("@/app/api/cron/audit-archive/route");
    const res = await GET(createRequest("test-secret"));
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.skipped).toBeDefined();
  });

  it("排他制御のロックキーが正しい", async () => {
    mockLimit.mockResolvedValue({ data: [], error: null });
    mockOrder.mockReturnValue({ limit: mockLimit });
    mockLt.mockReturnValue({ order: mockOrder });
    mockSelect.mockReturnValue({ lt: mockLt });

    const mockArchiveSelect = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockArchiveLt = vi.fn().mockReturnValue({ select: mockArchiveSelect });
    const mockArchiveDelete = vi.fn().mockReturnValue({ lt: mockArchiveLt });

    mockFrom.mockImplementation((table: string) => {
      if (table === "audit_logs") {
        return { select: mockSelect };
      }
      if (table === "audit_logs_archive") {
        return { insert: mockInsert, delete: mockArchiveDelete };
      }
      return {};
    });

    const { GET } = await import("@/app/api/cron/audit-archive/route");
    await GET(createRequest("test-secret"));
    expect(mockAcquireLock).toHaveBeenCalledWith("cron:audit-archive", 300);
  });
});
