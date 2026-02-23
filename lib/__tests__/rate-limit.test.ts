// lib/__tests__/rate-limit.test.ts — レート制限テスト

const mockGet = vi.fn();
const mockSet = vi.fn();
const mockIncr = vi.fn();
const mockDel = vi.fn();
const mockTtl = vi.fn();

vi.mock("@/lib/redis", () => ({
  redis: {
    get: (...args: any[]) => mockGet(...args),
    set: (...args: any[]) => mockSet(...args),
    incr: (...args: any[]) => mockIncr(...args),
    del: (...args: any[]) => mockDel(...args),
    ttl: (...args: any[]) => mockTtl(...args),
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
  it("初回アクセス（current=null） → limited: false, remaining: max-1", async () => {
    mockGet.mockResolvedValue(null);
    mockSet.mockResolvedValue("OK");

    const result = await checkRateLimit("login:test", 5, 60);
    expect(result.limited).toBe(false);
    expect(result.remaining).toBe(4);
    expect(mockSet).toHaveBeenCalledWith("rate:login:test", 1, { ex: 60 });
  });

  it("2回目アクセス（current=1） → incr で更新", async () => {
    mockGet.mockResolvedValue(1);
    mockIncr.mockResolvedValue(2);

    const result = await checkRateLimit("login:test", 5, 60);
    expect(result.limited).toBe(false);
    expect(result.remaining).toBe(3);
    expect(mockIncr).toHaveBeenCalledWith("rate:login:test");
  });

  it("上限到達（current=max） → limited: true", async () => {
    mockGet.mockResolvedValue(5);
    mockTtl.mockResolvedValue(30);

    const result = await checkRateLimit("login:test", 5, 60);
    expect(result.limited).toBe(true);
    expect(result.remaining).toBe(0);
    expect(result.retryAfter).toBe(30);
  });

  it("上限到達でTTL<=0 → windowSec をフォールバック", async () => {
    mockGet.mockResolvedValue(10);
    mockTtl.mockResolvedValue(-1);

    const result = await checkRateLimit("login:test", 5, 120);
    expect(result.limited).toBe(true);
    expect(result.retryAfter).toBe(120);
  });

  it("Redis障害 → スキップ（limited: false, remaining: max）", async () => {
    mockGet.mockRejectedValue(new Error("Connection refused"));

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
