// lib/__tests__/distributed-lock.test.ts — 分散ロックテスト

const mockSet = vi.fn();
const mockGet = vi.fn();
const mockDel = vi.fn();

vi.mock("@/lib/redis", () => ({
  redis: {
    set: (...args: any[]) => mockSet(...args),
    get: (...args: any[]) => mockGet(...args),
    del: (...args: any[]) => mockDel(...args),
  },
}));

import { acquireLock } from "@/lib/distributed-lock";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("acquireLock", () => {
  it("ロック取得成功 → acquired: true", async () => {
    mockSet.mockResolvedValue("OK");

    const lock = await acquireLock("test-key", 10);
    expect(lock.acquired).toBe(true);
    expect(mockSet).toHaveBeenCalledWith(
      "lock:test-key",
      expect.any(String),
      { nx: true, ex: 10 },
    );
  });

  it("ロック取得失敗（既にロック中）→ acquired: false", async () => {
    mockSet.mockResolvedValue(null);

    const lock = await acquireLock("test-key", 10);
    expect(lock.acquired).toBe(false);
  });

  it("release() で自分のロックのみ解放", async () => {
    mockSet.mockResolvedValue("OK");

    const lock = await acquireLock("test-key", 10);
    expect(lock.acquired).toBe(true);

    // release() 呼び出し時にgetで値を確認
    const lockValue = mockSet.mock.calls[0][1]; // SET時のvalue
    mockGet.mockResolvedValue(lockValue);
    mockDel.mockResolvedValue(1);

    await lock.release();
    expect(mockGet).toHaveBeenCalledWith("lock:test-key");
    expect(mockDel).toHaveBeenCalledWith("lock:test-key");
  });

  it("release() で他人のロックは解放しない", async () => {
    mockSet.mockResolvedValue("OK");

    const lock = await acquireLock("test-key", 10);
    expect(lock.acquired).toBe(true);

    // 別の値が入っている（他プロセスが再取得）
    mockGet.mockResolvedValue("different_value");

    await lock.release();
    expect(mockGet).toHaveBeenCalledWith("lock:test-key");
    expect(mockDel).not.toHaveBeenCalled();
  });

  it("Redis障害時 → acquired: true（サービス継続優先）", async () => {
    mockSet.mockRejectedValue(new Error("Redis connection failed"));

    const lock = await acquireLock("test-key", 10);
    expect(lock.acquired).toBe(true);
  });
});
