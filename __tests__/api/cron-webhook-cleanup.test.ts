// __tests__/api/cron-webhook-cleanup.test.ts — webhook-cleanup Cronテスト

const mockAcquireLock = vi.fn();
const mockRelease = vi.fn();
const mockNotifyWebhookFailure = vi.fn();

// Supabaseモック用ヘルパー
const mockSelect = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockEq = vi.fn();
const mockLt = vi.fn();
const mockIn = vi.fn();
const mockLimit = vi.fn();

vi.mock("@/lib/distributed-lock", () => ({
  acquireLock: (...args: unknown[]) => mockAcquireLock(...args),
}));

vi.mock("@/lib/notifications/webhook-failure", () => ({
  notifyWebhookFailure: (...args: unknown[]) => {
    mockNotifyWebhookFailure(...args);
    return Promise.resolve();
  },
}));

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === "webhook_events") {
        return {
          select: (...args: unknown[]) => {
            mockSelect(...args);
            return {
              eq: (col: string, val: string) => {
                mockEq(col, val);
                return {
                  lt: (col2: string, val2: string) => {
                    mockLt(col2, val2);
                    return {
                      limit: (n: number) => {
                        mockLimit(n);
                        // selectチェーンの結果
                        return mockSelect._result || { data: [], error: null };
                      },
                    };
                  },
                };
              },
            };
          },
          update: (data: unknown) => {
            mockUpdate(data);
            return {
              in: (col: string, vals: unknown[]) => {
                mockIn(col, vals);
                return mockUpdate._result || { error: null };
              },
            };
          },
          delete: (opts?: unknown) => {
            mockDelete(opts);
            return {
              eq: (col: string, val: string) => {
                mockEq(col, val);
                return {
                  lt: (col2: string, val2: string) => {
                    mockLt(col2, val2);
                    return mockDelete._result || { count: 0, error: null };
                  },
                };
              },
            };
          },
        };
      }
      return {};
    },
  },
}));

vi.mock("@/lib/api-error", () => ({
  serverError: (err: unknown) => new Response(JSON.stringify({ error: "server error" }), { status: 500 }),
  unauthorized: () => new Response("Unauthorized", { status: 401 }),
}));

import { GET } from "@/app/api/cron/webhook-cleanup/route";
import { NextRequest } from "next/server";

function createCronRequest(withAuth = true): NextRequest {
  const headers: Record<string, string> = {};
  if (withAuth) {
    headers["authorization"] = "Bearer test-cron-secret";
  }
  return new NextRequest("http://localhost/api/cron/webhook-cleanup", {
    method: "GET",
    headers,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CRON_SECRET = "test-cron-secret";
  mockRelease.mockResolvedValue(undefined);
  mockAcquireLock.mockResolvedValue({ acquired: true, release: mockRelease });
  // デフォルト: スタックイベントなし、削除0件
  (mockSelect as unknown as Record<string, unknown>)._result = { data: [], error: null };
  (mockUpdate as unknown as Record<string, unknown>)._result = { error: null };
  (mockDelete as unknown as Record<string, unknown>)._result = { count: 0, error: null };
});

afterEach(() => {
  delete process.env.CRON_SECRET;
});

describe("GET /api/cron/webhook-cleanup", () => {
  it("認証失敗で401を返す", async () => {
    const req = createCronRequest(false);
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("ロック取得失敗でスキップする", async () => {
    mockAcquireLock.mockResolvedValue({ acquired: false, release: mockRelease });

    const req = createCronRequest();
    const res = await GET(req);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.skipped).toBeDefined();
  });

  it("スタックイベントがない場合は正常完了する", async () => {
    const req = createCronRequest();
    const res = await GET(req);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.stuck).toBe(0);
    expect(body.cleaned).toBe(0);
    expect(mockRelease).toHaveBeenCalled();
  });

  it("スタックイベントをfailedに更新して通知する", async () => {
    const stuckEvents = [
      { id: 1, event_source: "square", event_id: "evt-1", tenant_id: "t1", created_at: "2026-01-01" },
      { id: 2, event_source: "gmo", event_id: "evt-2", tenant_id: null, created_at: "2026-01-01" },
    ];
    (mockSelect as unknown as Record<string, unknown>)._result = { data: stuckEvents, error: null };

    const req = createCronRequest();
    const res = await GET(req);
    const body = await res.json();

    expect(body.ok).toBe(true);
    expect(body.stuck).toBe(2);

    // failedに更新されたか
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "failed",
        error_message: "stuck: processing timeout (5min)",
      }),
    );
    expect(mockIn).toHaveBeenCalledWith("id", [1, 2]);

    // 通知が送信されたか
    expect(mockNotifyWebhookFailure).toHaveBeenCalledTimes(2);
    expect(mockNotifyWebhookFailure).toHaveBeenCalledWith(
      "square",
      "evt-1",
      expect.any(Error),
      "t1",
    );
    expect(mockNotifyWebhookFailure).toHaveBeenCalledWith(
      "gmo",
      "evt-2",
      expect.any(Error),
      undefined,
    );
  });

  it("分散ロックのTTLが55秒で取得される", async () => {
    const req = createCronRequest();
    await GET(req);

    expect(mockAcquireLock).toHaveBeenCalledWith("cron:webhook-cleanup", 55);
  });

  it("finallyでロックがリリースされる", async () => {
    // selectでエラーを発生させる
    (mockSelect as unknown as Record<string, unknown>)._result = { data: null, error: { message: "DB error" } };

    const req = createCronRequest();
    await GET(req);

    expect(mockRelease).toHaveBeenCalled();
  });
});
