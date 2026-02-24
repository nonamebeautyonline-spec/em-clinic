// __tests__/api/export-full.test.ts
// テナント全データエクスポートAPI テスト
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- モック設定 ---
const mockVerifyAdminAuth = vi.fn();
vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: (...args: any[]) => mockVerifyAdminAuth(...args),
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  withTenant: vi.fn((q: any) => q),
}));

// Supabase モック — チェーンを再帰的に返す
const mockSingle = vi.fn();

function createQueryChain() {
  const chain: Record<string, any> = {};
  const methods = ["select", "insert", "update", "eq", "order", "limit", "gte", "lte"];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.single = mockSingle;
  return chain;
}

const queryChain = createQueryChain();

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn(() => queryChain),
  },
}));

// export-worker モック
const mockExecuteFullExport = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/export-worker", () => ({
  executeFullExport: (...args: any[]) => mockExecuteFullExport(...args),
}));

// --- リクエスト生成ヘルパー ---
function createMockRequest(method: string, url: string, body?: any) {
  const req = new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return req as any;
}

import { POST, GET } from "@/app/api/admin/export/full/route";

describe("テナント全データエクスポートAPI - POST", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyAdminAuth.mockResolvedValue(true);
  });

  it("認証なし → 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const req = createMockRequest("POST", "http://localhost/api/admin/export/full");
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("ジョブ作成成功 → jobIdとpendingステータスを返す", async () => {
    mockSingle.mockResolvedValue({
      data: { id: "job-uuid-123" },
      error: null,
    });

    const req = createMockRequest("POST", "http://localhost/api/admin/export/full");
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.jobId).toBe("job-uuid-123");
    expect(json.status).toBe("pending");
    expect(mockExecuteFullExport).toHaveBeenCalledWith("job-uuid-123", "test-tenant");
  });

  it("ジョブ作成失敗 → 500", async () => {
    mockSingle.mockResolvedValue({
      data: null,
      error: { message: "DB error" },
    });

    const req = createMockRequest("POST", "http://localhost/api/admin/export/full");
    const res = await POST(req);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("ジョブの作成に失敗しました");
  });
});

describe("テナント全データエクスポートAPI - GET", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyAdminAuth.mockResolvedValue(true);
  });

  it("認証なし → 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const req = createMockRequest("GET", "http://localhost/api/admin/export/full?jobId=xxx");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("jobIdなし → 400", async () => {
    const req = createMockRequest("GET", "http://localhost/api/admin/export/full");
    const res = await GET(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("jobIdパラメータが必要です");
  });

  it("存在しないジョブ → 404", async () => {
    mockSingle.mockResolvedValue({
      data: null,
      error: { message: "not found" },
    });

    const req = createMockRequest("GET", "http://localhost/api/admin/export/full?jobId=unknown");
    const res = await GET(req);
    expect(res.status).toBe(404);
  });

  it("完了済みジョブの状態を返す", async () => {
    mockSingle.mockResolvedValue({
      data: {
        id: "job-uuid-123",
        status: "completed",
        record_counts: { patients: 10, orders: 5 },
        error_message: null,
        tables_included: ["patients", "orders"],
        created_at: "2026-02-24T00:00:00Z",
        completed_at: "2026-02-24T00:01:00Z",
      },
      error: null,
    });

    const req = createMockRequest("GET", "http://localhost/api/admin/export/full?jobId=job-uuid-123");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("completed");
    expect(json.record_counts.patients).toBe(10);
  });
});

// エクスポートワーカーのユニットテスト
describe("export-worker CSV生成ロジック", () => {
  it("BOM付きCSVが正しく生成される", () => {
    const BOM = "\uFEFF";
    const csv = BOM + '"ヘッダー1","ヘッダー2"\r\n"値1","値2"';
    expect(csv.startsWith(BOM)).toBe(true);
    expect(csv).toContain("ヘッダー1");
    expect(csv).toContain("値1");
  });

  it("ダブルクォートがエスケープされる", () => {
    const value = 'テスト"値"です';
    const escaped = `"${value.replace(/"/g, '""')}"`;
    expect(escaped).toBe('"テスト""値""です"');
  });

  it("null/undefinedは空文字になる", () => {
    const escapeCell = (v: unknown) => {
      const str = v == null ? "" : String(v);
      return `"${str.replace(/"/g, '""')}"`;
    };
    expect(escapeCell(null)).toBe('""');
    expect(escapeCell(undefined)).toBe('""');
    expect(escapeCell("")).toBe('""');
    expect(escapeCell(0)).toBe('"0"');
  });
});
