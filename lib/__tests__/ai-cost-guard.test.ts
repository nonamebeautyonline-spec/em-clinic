// lib/__tests__/ai-cost-guard.test.ts — Cost Guard テスト

import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Redisモック ---
const mockIncr = vi.fn();
const mockTtl = vi.fn();
const mockExpire = vi.fn();
const mockGet = vi.fn();
const mockSet = vi.fn();
const mockLpush = vi.fn();
const mockLtrim = vi.fn();
const mockLrange = vi.fn();

vi.mock("@/lib/redis", () => ({
  redis: {
    incr: (...args: unknown[]) => mockIncr(...args),
    ttl: (...args: unknown[]) => mockTtl(...args),
    expire: (...args: unknown[]) => mockExpire(...args),
    get: (...args: unknown[]) => mockGet(...args),
    set: (...args: unknown[]) => mockSet(...args),
    lpush: (...args: unknown[]) => mockLpush(...args),
    ltrim: (...args: unknown[]) => mockLtrim(...args),
    lrange: (...args: unknown[]) => mockLrange(...args),
  },
}));

// --- rate-limitモック ---
const mockCheckRateLimit = vi.fn();
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
}));

// --- Supabaseモック ---
const mockQueryBuilder = {
  select: vi.fn().mockReturnThis(),
  gte: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
};
vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: { from: vi.fn(() => mockQueryBuilder) },
}));
vi.mock("@/lib/tenant", () => ({
  withTenant: vi.fn(async (query: unknown) => query),
}));

import {
  checkAiRateLimit,
  checkRepeatMessage,
  checkDailyCostLimit,
  isInCooldown,
  setCooldown,
  normalizeForHash,
} from "@/lib/ai-cost-guard";

const TENANT_ID = "00000000-0000-0000-0000-000000000001";
const PATIENT_ID = "test-patient";

describe("checkAiRateLimit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // ブロックカウンターのモック（incrementBlockCount内）
    mockIncr.mockResolvedValue(1);
    mockTtl.mockResolvedValue(30);
  });

  it("30秒3通以内 → 通過", async () => {
    mockCheckRateLimit.mockResolvedValue({ limited: false, remaining: 2 });
    const result = await checkAiRateLimit(TENANT_ID, PATIENT_ID, { rate_limit_30s: 3, rate_limit_1h: 30 });
    expect(result.blocked).toBe(false);
  });

  it("30秒4通目 → ブロック", async () => {
    // 30秒ウィンドウでlimited → 即ブロック（1時間チェックは呼ばれない）
    mockCheckRateLimit.mockResolvedValueOnce({ limited: true, remaining: 0, retryAfter: 25 });

    const result = await checkAiRateLimit(TENANT_ID, PATIENT_ID, { rate_limit_30s: 3, rate_limit_1h: 30 });
    expect(result.blocked).toBe(true);
    expect(result.reason).toBe("rate_limit");
    // cooldownがセットされる
    expect(mockSet).toHaveBeenCalled();
    // checkRateLimitは1回だけ呼ばれる（30秒チェックでブロックなので1時間はスキップ）
    expect(mockCheckRateLimit).toHaveBeenCalledTimes(1);
  });

  it("1時間31通目 → ブロック", async () => {
    mockCheckRateLimit
      .mockResolvedValueOnce({ limited: false, remaining: 1 }) // 30秒OK
      .mockResolvedValueOnce({ limited: true, remaining: 0, retryAfter: 3000 }); // 1時間超過

    const result = await checkAiRateLimit(TENANT_ID, PATIENT_ID, { rate_limit_30s: 3, rate_limit_1h: 30 });
    expect(result.blocked).toBe(true);
    expect(result.reason).toBe("rate_limit");
    expect(mockCheckRateLimit).toHaveBeenCalledTimes(2);
  });

  it("Redis障害時 → 通過（graceful degradation）", async () => {
    // checkRateLimitはRedis障害時にlimited:falseを返す仕様（両方通過）
    mockCheckRateLimit
      .mockResolvedValueOnce({ limited: false, remaining: 3 })
      .mockResolvedValueOnce({ limited: false, remaining: 30 });
    const result = await checkAiRateLimit(TENANT_ID, PATIENT_ID, { rate_limit_30s: 3, rate_limit_1h: 30 });
    expect(result.blocked).toBe(false);
  });
});

describe("checkRepeatMessage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLpush.mockResolvedValue(1);
    mockLtrim.mockResolvedValue("OK");
    mockExpire.mockResolvedValue(1);
    // ブロックカウンター
    mockIncr.mockResolvedValue(1);
    mockTtl.mockResolvedValue(30);
  });

  it("異なるメッセージ3件 → 通過", async () => {
    mockLrange.mockResolvedValue(["hash1", "hash2", "hash3"]);
    const result = await checkRepeatMessage(TENANT_ID, PATIENT_ID, "今日の予約について");
    expect(result.blocked).toBe(false);
  });

  it("同一メッセージ3件 → ブロック", async () => {
    // normalizeForHash("予約確認お願いします") のハッシュが3件
    // checkRepeatMessage内でlpushしてからlrangeするので、自分のハッシュが含まれる
    const msg = "予約確認お願いします";
    // ハッシュを事前計算する代わりに、lrangeが同一値3件を返すようモック
    mockLrange.mockImplementation(async () => {
      // 内部で計算されるハッシュと同じものを返す必要があるが、
      // モックではlpush呼び出し時の引数を使う
      const calls = mockLpush.mock.calls;
      const lastHash = calls[calls.length - 1]?.[1] || "x";
      return [lastHash, lastHash, lastHash, "other1", "other2"];
    });

    const result = await checkRepeatMessage(TENANT_ID, PATIENT_ID, msg);
    expect(result.blocked).toBe(true);
    expect(result.reason).toBe("repeat_message");
  });

  it("空白/全角半角違いの同一意図メッセージ → 正規化でブロック", async () => {
    // 正規化後は同じハッシュになるはず
    const msg1 = "予約　確認　お願いします"; // 全角スペース
    const msg2 = "予約 確認 お願いします";   // 半角スペース

    // normalizeForHash で同じ結果になることを確認
    const h1 = normalizeForHash(msg1);
    const h2 = normalizeForHash(msg2);
    expect(h1).toBe(h2);
  });
});

describe("checkDailyCostLimit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // ブロックカウンター
    mockIncr.mockResolvedValue(1);
    mockTtl.mockResolvedValue(30);
  });

  it("コスト$9.99/上限$10.00 → 通過", async () => {
    // $9.99 ≈ 3,330,000 input tokens (@ $3/1M)
    mockQueryBuilder.select.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.gte.mockResolvedValue({
      data: [{ input_tokens: 3330000, output_tokens: 0 }],
    });

    const result = await checkDailyCostLimit(TENANT_ID, { daily_cost_limit_usd: 10.0 });
    expect(result.blocked).toBe(false);
  });

  it("コスト$10.01/上限$10.00 → ブロック", async () => {
    // $10.01 ≈ 3,337,000 input tokens (@ $3/1M)
    mockQueryBuilder.select.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.gte.mockResolvedValue({
      data: [{ input_tokens: 3337000, output_tokens: 0 }],
    });

    const result = await checkDailyCostLimit(TENANT_ID, { daily_cost_limit_usd: 10.0 });
    expect(result.blocked).toBe(true);
    expect(result.reason).toBe("cost_limit");
  });
});

describe("isInCooldown", () => {
  beforeEach(() => vi.clearAllMocks());

  it("フラグなし → false", async () => {
    mockGet.mockResolvedValue(null);
    const result = await isInCooldown(TENANT_ID, PATIENT_ID);
    expect(result).toBe(false);
  });

  it("フラグあり → true", async () => {
    mockGet.mockResolvedValue("1");
    const result = await isInCooldown(TENANT_ID, PATIENT_ID);
    expect(result).toBe(true);
  });
});

describe("setCooldown", () => {
  beforeEach(() => vi.clearAllMocks());

  it("TTL付きフラグが設定されること", async () => {
    mockSet.mockResolvedValue("OK");
    await setCooldown(TENANT_ID, PATIENT_ID, 1800);
    expect(mockSet).toHaveBeenCalledWith(
      `ai_cooldown:${TENANT_ID}:${PATIENT_ID}`,
      "1",
      { ex: 1800 }
    );
  });
});

describe("normalizeForHash", () => {
  it("全角→半角、連続空白圧縮、trim が正しく動作", () => {
    // 全角英数字→半角
    expect(normalizeForHash("ＡＢＣ１２３")).toBe("abc123");

    // 連続空白圧縮
    expect(normalizeForHash("hello   world")).toBe("hello world");

    // trim
    expect(normalizeForHash("  test  ")).toBe("test");

    // 複合
    expect(normalizeForHash("  予約　確認　　お願い  ")).toBe("予約 確認 お願い");

    // toLowerCase
    expect(normalizeForHash("Hello World")).toBe("hello world");
  });
});
