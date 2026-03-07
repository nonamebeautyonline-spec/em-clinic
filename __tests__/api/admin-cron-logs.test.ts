// __tests__/api/admin-cron-logs.test.ts — Cron実行履歴API テスト
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- モック ---
const mockVerifyAdminAuth = vi.fn();
vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: (...args: unknown[]) => mockVerifyAdminAuth(...args),
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  withTenant: vi.fn((q: unknown) => q),
}));

// Supabaseクエリチェーン: 全メソッドが自分自身を返し、最終的にthen可能
function createQueryChain(result: { data: unknown; error: unknown; count: unknown }) {
  const chain: Record<string, unknown> = {};
  const self = new Proxy(chain, {
    get(target, prop) {
      if (prop === "then") {
        // thenable にする（awaitされたときに結果を返す）
        return (resolve: (v: unknown) => void) => resolve(result);
      }
      if (prop === "eq" || prop === "select" || prop === "order" || prop === "range") {
        if (!target[prop as string]) {
          target[prop as string] = vi.fn().mockReturnValue(self);
        }
        return target[prop as string];
      }
      return target[prop as string];
    },
  });
  return self;
}

const mockFrom = vi.fn();
vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

// リクエスト生成ヘルパー
function createMockRequest(url: string) {
  return new Request(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
}

import { GET } from "@/app/api/admin/cron-logs/route";

describe("Cron実行履歴API - GET", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyAdminAuth.mockResolvedValue(true);
  });

  it("認証なし → 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const req = createMockRequest("http://localhost/api/admin/cron-logs");
    const res = await GET(req as any);
    expect(res.status).toBe(401);
  });

  it("正常にログ一覧を返す", async () => {
    const mockLogs = [
      {
        id: "log-1",
        cron_name: "send-scheduled",
        started_at: "2026-03-07T10:00:00Z",
        finished_at: "2026-03-07T10:00:05Z",
        status: "success",
        result_summary: { sent: 5 },
        error_message: null,
        duration_ms: 5000,
      },
    ];

    const chain = createQueryChain({ data: mockLogs, error: null, count: 1 });
    mockFrom.mockReturnValue(chain);

    const req = createMockRequest("http://localhost/api/admin/cron-logs");
    const res = await GET(req as any);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.logs).toHaveLength(1);
    expect(json.logs[0].cron_name).toBe("send-scheduled");
    expect(json.total).toBe(1);
  });

  it("cron_nameフィルタが適用される", async () => {
    const chain = createQueryChain({ data: [], error: null, count: 0 });
    mockFrom.mockReturnValue(chain);

    const req = createMockRequest("http://localhost/api/admin/cron-logs?cron_name=send-scheduled");
    const res = await GET(req as any);
    expect(res.status).toBe(200);

    // eq が cron_name で呼ばれたことを確認
    expect(chain.eq).toHaveBeenCalledWith("cron_name", "send-scheduled");
  });

  it("statusフィルタが適用される", async () => {
    const chain = createQueryChain({ data: [], error: null, count: 0 });
    mockFrom.mockReturnValue(chain);

    const req = createMockRequest("http://localhost/api/admin/cron-logs?status=failed");
    const res = await GET(req as any);
    expect(res.status).toBe(200);

    expect(chain.eq).toHaveBeenCalledWith("status", "failed");
  });

  it("不正なstatusフィルタは無視される", async () => {
    const chain = createQueryChain({ data: [], error: null, count: 0 });
    mockFrom.mockReturnValue(chain);

    const req = createMockRequest("http://localhost/api/admin/cron-logs?status=invalid");
    const res = await GET(req as any);
    expect(res.status).toBe(200);

    // invalid statusでeqは呼ばれない
    expect(chain.eq).not.toHaveBeenCalledWith("status", "invalid");
  });

  it("limitが200を超えない", async () => {
    const chain = createQueryChain({ data: [], error: null, count: 0 });
    mockFrom.mockReturnValue(chain);

    const req = createMockRequest("http://localhost/api/admin/cron-logs?limit=500");
    const res = await GET(req as any);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.limit).toBe(200);
  });

  it("DB障害時 → 500", async () => {
    const chain = createQueryChain({
      data: null,
      error: { message: "DB connection error" },
      count: null,
    });
    mockFrom.mockReturnValue(chain);

    const req = createMockRequest("http://localhost/api/admin/cron-logs");
    const res = await GET(req as any);
    expect(res.status).toBe(500);
  });
});
