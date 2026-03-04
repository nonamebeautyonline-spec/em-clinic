// lib/__tests__/rate-limit.test.ts — レート制限テスト

const mockGet = vi.fn();
const mockSet = vi.fn();
const mockIncr = vi.fn();
const mockDel = vi.fn();
const mockTtl = vi.fn();
const mockExpire = vi.fn();

vi.mock("@/lib/redis", () => ({
  redis: {
    get: (...args: unknown[]) => mockGet(...args),
    set: (...args: unknown[]) => mockSet(...args),
    incr: (...args: unknown[]) => mockIncr(...args),
    del: (...args: unknown[]) => mockDel(...args),
    ttl: (...args: unknown[]) => mockTtl(...args),
    expire: (...args: unknown[]) => mockExpire(...args),
  },
}));

import { checkRateLimit, resetRateLimit, getClientIp } from "@/lib/rate-limit";

beforeEach(() => {
  vi.clearAllMocks();
});

// ============================================================
// getClientIp — 純粋関数
// ============================================================

describe("getClientIp", () => {
  it("x-forwarded-for ヘッダーから取得", () => {
    const req = { headers: { get: (name: string) => name === "x-forwarded-for" ? "1.2.3.4, 5.6.7.8" : null } };
    expect(getClientIp(req)).toBe("1.2.3.4");
  });

  it("x-forwarded-for の最初のIPを返す", () => {
    const req = { headers: { get: (name: string) => name === "x-forwarded-for" ? "10.0.0.1, 10.0.0.2, 10.0.0.3" : null } };
    expect(getClientIp(req)).toBe("10.0.0.1");
  });

  it("x-forwarded-for がない場合は x-real-ip から取得", () => {
    const req = { headers: { get: (name: string) => name === "x-real-ip" ? "192.168.1.1" : null } };
    expect(getClientIp(req)).toBe("192.168.1.1");
  });

  it("両方ない場合は 'unknown'", () => {
    const req = { headers: { get: () => null } };
    expect(getClientIp(req)).toBe("unknown");
  });
});

// ============================================================
// checkRateLimit
// ============================================================

describe("checkRateLimit", () => {
  it("初回アクセス（incr=1） → limited: false, TTL設定", async () => {
    mockIncr.mockResolvedValue(1);
    mockTtl.mockResolvedValue(-1); // TTL未設定
    mockExpire.mockResolvedValue(1);

    const result = await checkRateLimit("login:test", 5, 60);
    expect(result.limited).toBe(false);
    expect(result.remaining).toBe(4);
    // TTL が -1 なので expire が呼ばれる
    expect(mockExpire).toHaveBeenCalledWith("rate:login:test", 60);
  });

  it("2回目アクセス（incr=2, TTL残存） → limited: false, expireは呼ばれない", async () => {
    mockIncr.mockResolvedValue(2);
    mockTtl.mockResolvedValue(55); // TTLあり

    const result = await checkRateLimit("login:test", 5, 60);
    expect(result.limited).toBe(false);
    expect(result.remaining).toBe(3);
    expect(mockExpire).not.toHaveBeenCalled();
  });

  it("上限超過（incr > max） → limited: true", async () => {
    mockIncr.mockResolvedValue(6);
    mockTtl.mockResolvedValue(30);

    const result = await checkRateLimit("login:test", 5, 60);
    expect(result.limited).toBe(true);
    expect(result.remaining).toBe(0);
    expect(result.retryAfter).toBe(30);
  });

  it("TTL消失（-1）時はexpireで復旧する", async () => {
    mockIncr.mockResolvedValue(10);
    mockTtl.mockResolvedValue(-1);
    mockExpire.mockResolvedValue(1);

    const result = await checkRateLimit("login:test", 5, 120);
    expect(result.limited).toBe(true);
    expect(result.retryAfter).toBe(120);
    // TTLが-1なのでexpireで復旧
    expect(mockExpire).toHaveBeenCalledWith("rate:login:test", 120);
  });

  it("Redis障害 → スキップ（limited: false, remaining: max）", async () => {
    mockIncr.mockRejectedValue(new Error("Connection refused"));

    const result = await checkRateLimit("login:test", 5, 60);
    expect(result.limited).toBe(false);
    expect(result.remaining).toBe(5);
  });
});

// ============================================================
// resetRateLimit
// ============================================================

describe("resetRateLimit", () => {
  it("正常にキーを削除する", async () => {
    mockDel.mockResolvedValue(1);
    await resetRateLimit("login:test");
    expect(mockDel).toHaveBeenCalledWith("rate:login:test");
  });

  it("Redis障害でも例外をスローしない", async () => {
    mockDel.mockRejectedValue(new Error("Connection refused"));
    await expect(resetRateLimit("login:test")).resolves.toBeUndefined();
  });
});
