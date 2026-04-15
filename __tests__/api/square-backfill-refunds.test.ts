// __tests__/api/square-backfill-refunds.test.ts
// Square返金バックフィル（app/api/square/backfill-refunds/route.ts）のテスト
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// === モック設定 ===
vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  withTenant: vi.fn((query) => query),
}));

const mockGetActiveSquareAccount = vi.fn();
vi.mock("@/lib/square-account-server", () => ({
  getActiveSquareAccount: (...args: unknown[]) => mockGetActiveSquareAccount(...args),
}));

// Supabase モック
function createChain(result: { data: unknown; error: unknown } = { data: null, error: null }) {
  const chain: Record<string, unknown> = {};
  const methods = [
    "select", "insert", "update", "delete",
    "eq", "neq", "not", "is", "in",
    "order", "limit", "single", "maybeSingle",
  ];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.then = (resolve: (v: unknown) => void) => resolve(result);
  return chain;
}

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn(() => createChain({ data: null, error: null })),
  },
}));

// fetch モック
const originalFetch = global.fetch;
const mockFetch = vi.fn();

const { GET } = await import("@/app/api/square/backfill-refunds/route");

function makeRequest(params: Record<string, string> = {}) {
  const url = new URL("http://localhost/api/square/backfill-refunds");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new NextRequest(url.toString(), { method: "GET" });
}

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = mockFetch;
  mockGetActiveSquareAccount.mockResolvedValue({
    accessToken: "sq-token-123",
    env: "sandbox",
  });
});

afterAll(() => {
  global.fetch = originalFetch;
});

describe("GET /api/square/backfill-refunds", () => {
  it("Square tokenが設定されていない場合500を返す", async () => {
    mockGetActiveSquareAccount.mockResolvedValue({ accessToken: "", env: "sandbox" });
    const res = await GET(makeRequest({ begin: "2026-01-01T00:00:00Z", end: "2026-01-31T23:59:59Z" }));
    expect(res.status).toBe(500);
  });

  it("begin/endが未指定の場合400を返す", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(400);
  });

  it("beginのみの場合400を返す", async () => {
    const res = await GET(makeRequest({ begin: "2026-01-01T00:00:00Z" }));
    expect(res.status).toBe(400);
  });

  it("正常系: 返金データを取得しDBに反映", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({
        refunds: [
          {
            id: "rfnd_001",
            payment_id: "pay_001",
            status: "COMPLETED",
            amount_money: { amount: 5000 },
            created_at: "2026-01-15T10:00:00Z",
          },
          {
            id: "rfnd_002",
            payment_id: "pay_002",
            status: "PENDING",
            amount_money: { amount: 3000 },
            updated_at: "2026-01-16T10:00:00Z",
          },
        ],
      })),
    });

    const res = await GET(makeRequest({
      begin: "2026-01-01T00:00:00Z",
      end: "2026-01-31T23:59:59Z",
    }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.processed).toBe(2);
    expect(data.results).toHaveLength(2);
    expect(data.results[0].payment_id).toBe("pay_001");
    expect(data.results[0].refund_id).toBe("rfnd_001");
  });

  it("Square APIがエラーを返した場合500を返す", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      text: () => Promise.resolve("Unauthorized"),
    });

    const res = await GET(makeRequest({
      begin: "2026-01-01T00:00:00Z",
      end: "2026-01-31T23:59:59Z",
    }));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.ok).toBe(false);
    expect(data.error).toBe("list_refunds_failed");
  });

  it("返金データが空の場合も正常レスポンスを返す", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ refunds: [] })),
    });

    const res = await GET(makeRequest({
      begin: "2026-01-01T00:00:00Z",
      end: "2026-01-31T23:59:59Z",
    }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.processed).toBe(0);
  });

  it("limitパラメータが200を超えない", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ refunds: [] })),
    });

    const res = await GET(makeRequest({
      begin: "2026-01-01T00:00:00Z",
      end: "2026-01-31T23:59:59Z",
      limit: "500",
    }));
    expect(res.status).toBe(200);
  });

  it("ページネーション: cursorがある場合は次ページを取得", async () => {
    // 1ページ目: cursor付き
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({
          refunds: [{
            id: "rfnd_001",
            payment_id: "pay_001",
            status: "COMPLETED",
            amount_money: { amount: 1000 },
            created_at: "2026-01-15T10:00:00Z",
          }],
          cursor: "next_page_token",
        })),
      })
      // 2ページ目: cursor なし
      .mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({
          refunds: [{
            id: "rfnd_002",
            payment_id: "pay_002",
            status: "COMPLETED",
            amount_money: { amount: 2000 },
            created_at: "2026-01-16T10:00:00Z",
          }],
        })),
      });

    const res = await GET(makeRequest({
      begin: "2026-01-01T00:00:00Z",
      end: "2026-01-31T23:59:59Z",
    }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.processed).toBe(2);
    // fetchが2回呼ばれた（ページネーション）
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("sandbox環境のURLを使用", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ refunds: [] })),
    });

    await GET(makeRequest({
      begin: "2026-01-01T00:00:00Z",
      end: "2026-01-31T23:59:59Z",
    }));

    const fetchUrl = mockFetch.mock.calls[0][0] as string;
    expect(fetchUrl).toContain("squareupsandbox.com");
  });

  it("production環境のURLを使用", async () => {
    mockGetActiveSquareAccount.mockResolvedValue({
      accessToken: "sq-prod-token",
      env: "production",
    });
    mockFetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ refunds: [] })),
    });

    await GET(makeRequest({
      begin: "2026-01-01T00:00:00Z",
      end: "2026-01-31T23:59:59Z",
    }));

    const fetchUrl = mockFetch.mock.calls[0][0] as string;
    expect(fetchUrl).toContain("connect.squareup.com");
  });
});
