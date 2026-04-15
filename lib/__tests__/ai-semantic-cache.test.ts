// AI Semantic Cache テスト
import { describe, it, expect, vi, beforeEach } from "vitest";

// Supabase モック
const mockFrom = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

vi.mock("@/lib/tenant", () => ({
  tenantPayload: (tenantId: string | null) => (tenantId ? { tenant_id: tenantId } : {}),
}));

import { generateIntentHash, reportCacheQuality, findCachedResponse, saveCachedResponse, invalidateCache, cleanExpiredCache } from "@/lib/ai-semantic-cache";

// チェーンモックヘルパー
function chainMock(finalValue: unknown) {
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  chain.select = vi.fn(self);
  chain.insert = vi.fn(self);
  chain.update = vi.fn(self);
  chain.delete = vi.fn(self);
  chain.eq = vi.fn(self);
  chain.gte = vi.fn(self);
  chain.order = vi.fn(self);
  chain.limit = vi.fn(self);
  chain.lt = vi.fn(self);
  chain.single = vi.fn().mockResolvedValue(finalValue);
  return chain;
}

describe("generateIntentHash", () => {
  it("同じテキストに同じハッシュを返す", () => {
    const hash1 = generateIntentHash("予約したいです");
    const hash2 = generateIntentHash("予約したいです");
    expect(hash1).toBe(hash2);
  });

  it("空白の違いを無視する", () => {
    const hash1 = generateIntentHash("予約 したい です");
    const hash2 = generateIntentHash("予約　したい　です");
    expect(hash1).toBe(hash2);
  });

  it("句読点の違いを無視する", () => {
    const hash1 = generateIntentHash("予約したいです");
    const hash2 = generateIntentHash("予約したいです。");
    expect(hash1).toBe(hash2);
  });

  it("大文字小文字を無視する（英字部分）", () => {
    const hash1 = generateIntentHash("Hello World");
    const hash2 = generateIntentHash("hello world");
    expect(hash1).toBe(hash2);
  });

  it("異なるテキストに異なるハッシュを返す", () => {
    const hash1 = generateIntentHash("予約したいです");
    const hash2 = generateIntentHash("キャンセルしたいです");
    expect(hash1).not.toBe(hash2);
  });

  it("64文字のハッシュを返す", () => {
    const hash = generateIntentHash("テスト入力");
    expect(hash).toHaveLength(64);
  });

  it("括弧や感嘆符を無視する", () => {
    const hash1 = generateIntentHash("予約したい");
    const hash2 = generateIntentHash("予約したい！");
    expect(hash1).toBe(hash2);
  });
});

describe("reportCacheQuality", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("approve時に+0.1のスコア加算（上限1.0）", async () => {
    // 1回目のfrom: select → single（質スコア取得）
    const selectChain = chainMock({ data: { quality_score: 0.8 }, error: null });
    // 2回目のfrom: update → eq（更新）
    const updateChain = {
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    };

    mockFrom
      .mockReturnValueOnce(selectChain)
      .mockReturnValueOnce(updateChain);

    const result = await reportCacheQuality(1, true);
    expect(result).toBe(true);
  });

  it("reject時に-0.3のスコア減算（下限0.0）", async () => {
    const selectChain = chainMock({ data: { quality_score: 0.2 }, error: null });
    const updateChain = {
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    };

    mockFrom
      .mockReturnValueOnce(selectChain)
      .mockReturnValueOnce(updateChain);

    const result = await reportCacheQuality(2, false);
    expect(result).toBe(true);
  });

  it("キャッシュが見つからない場合はfalseを返す", async () => {
    const selectChain = chainMock({ data: null, error: { message: "not found" } });
    mockFrom.mockReturnValueOnce(selectChain);

    const result = await reportCacheQuality(999, true);
    expect(result).toBe(false);
  });
});

describe("findCachedResponse", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("キャッシュヒット時にoutputとcacheIdを返す", async () => {
    const cacheData = {
      id: 10,
      cached_output: { reply: "こんにちは" },
      quality_score: 0.9,
      expires_at: new Date(Date.now() + 86400000).toISOString(), // 明日
      hit_count: 5,
    };
    const selectChain = chainMock({ data: cacheData, error: null });
    // hit_count更新用のチェーン
    const updateChain = {
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    };

    mockFrom
      .mockReturnValueOnce(selectChain)
      .mockReturnValueOnce(updateChain);

    const result = await findCachedResponse("t1", "hash123", "ai_reply");
    expect(result).not.toBeNull();
    expect(result?.cacheId).toBe(10);
    expect(result?.output).toEqual({ reply: "こんにちは" });
  });

  it("キャッシュミス時にnullを返す", async () => {
    const selectChain = chainMock({ data: null, error: { message: "not found" } });
    mockFrom.mockReturnValueOnce(selectChain);

    const result = await findCachedResponse("t1", "hash_miss", "ai_reply");
    expect(result).toBeNull();
  });

  it("期限切れキャッシュはnullを返す", async () => {
    const cacheData = {
      id: 10,
      cached_output: { reply: "古いレスポンス" },
      quality_score: 0.9,
      expires_at: new Date(Date.now() - 86400000).toISOString(), // 昨日
      hit_count: 5,
    };
    const selectChain = chainMock({ data: cacheData, error: null });
    mockFrom.mockReturnValueOnce(selectChain);

    const result = await findCachedResponse("t1", "hash_expired", "ai_reply");
    expect(result).toBeNull();
  });

  it("エラー時にnullを返す（例外を投げない）", async () => {
    mockFrom.mockImplementation(() => { throw new Error("DB Error"); });

    const result = await findCachedResponse("t1", "hash123", "ai_reply");
    expect(result).toBeNull();
  });
});

describe("saveCachedResponse", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("正常保存時にcache IDを返す", async () => {
    const insertChain = {
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: 99 }, error: null }),
        }),
      }),
    };
    mockFrom.mockReturnValueOnce(insertChain);

    const result = await saveCachedResponse("t1", "hash123", { q: "test" }, { a: "reply" }, "ai_reply");
    expect(result).toBe(99);
  });

  it("DB保存エラー時にnullを返す", async () => {
    const insertChain = {
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: { message: "insert error" } }),
        }),
      }),
    };
    mockFrom.mockReturnValueOnce(insertChain);

    const result = await saveCachedResponse("t1", "hash123", {}, {}, "ai_reply");
    expect(result).toBeNull();
  });
});

describe("invalidateCache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("正常削除時にtrueを返す", async () => {
    const deleteChain = {
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }),
    };
    mockFrom.mockReturnValueOnce(deleteChain);

    const result = await invalidateCache("t1", "hash123");
    expect(result).toBe(true);
  });

  it("エラー時にfalseを返す", async () => {
    const deleteChain = {
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: { message: "delete error" } }),
        }),
      }),
    };
    mockFrom.mockReturnValueOnce(deleteChain);

    const result = await invalidateCache("t1", "hash123");
    expect(result).toBe(false);
  });
});

describe("cleanExpiredCache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("削除された件数を返す", async () => {
    const deleteChain = {
      delete: vi.fn().mockReturnValue({
        lt: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({ data: [{ id: 1 }, { id: 2 }], error: null }),
        }),
      }),
    };
    mockFrom.mockReturnValueOnce(deleteChain);

    const result = await cleanExpiredCache();
    expect(result).toBe(2);
  });

  it("エラー時は0を返す", async () => {
    const deleteChain = {
      delete: vi.fn().mockReturnValue({
        lt: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({ data: null, error: { message: "error" } }),
        }),
      }),
    };
    mockFrom.mockReturnValueOnce(deleteChain);

    const result = await cleanExpiredCache();
    expect(result).toBe(0);
  });
});
