// lib/__tests__/redis-cache.test.ts
// Redis friends-list キャッシュ・セッションキャッシュのテスト

import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGet, mockSet, mockDel, mockScan } = vi.hoisted(() => {
  process.env.KV_REST_API_URL = "https://mock-redis.upstash.io";
  process.env.KV_REST_API_TOKEN = "mock-token";
  return {
    mockGet: vi.fn(),
    mockSet: vi.fn(),
    mockDel: vi.fn(),
    mockScan: vi.fn(),
  };
});

vi.mock("@upstash/redis", () => ({
  Redis: class MockRedis {
    get = mockGet;
    set = mockSet;
    del = mockDel;
    scan = mockScan;
  },
}));

import {
  getFriendsListCacheKey,
  getFriendsListCache,
  setFriendsListCache,
  invalidateFriendsListCache,
  getSessionCache,
  setSessionCache,
  invalidateSessionCache,
} from "@/lib/redis";

beforeEach(() => {
  vi.clearAllMocks();
});

// ── friends-list キャッシュ ──

describe("getFriendsListCacheKey", () => {
  it("正しいキーフォーマットを返す", () => {
    expect(getFriendsListCacheKey("tenant-1", 0, 50)).toBe("fl:tenant-1:0:50");
  });
  it("offset/limitが反映される", () => {
    expect(getFriendsListCacheKey("t1", 50, 100)).toBe("fl:t1:50:100");
  });
});

describe("getFriendsListCache", () => {
  it("キャッシュヒット → データを返す", async () => {
    const cached = { patients: [{ patient_id: "p1" }], hasMore: false };
    mockGet.mockResolvedValue(cached);

    const result = await getFriendsListCache("tenant-1", 0, 50);
    expect(result).toEqual(cached);
    expect(mockGet).toHaveBeenCalledWith("fl:tenant-1:0:50");
  });

  it("キャッシュミス → null", async () => {
    mockGet.mockResolvedValue(null);
    const result = await getFriendsListCache("tenant-1", 0, 50);
    expect(result).toBeNull();
  });

  it("Redis障害 → null（例外を飲み込む）", async () => {
    mockGet.mockRejectedValue(new Error("Redis down"));
    const result = await getFriendsListCache("tenant-1", 0, 50);
    expect(result).toBeNull();
  });
});

describe("setFriendsListCache", () => {
  it("正常 → redis.setがTTL付きで呼ばれる", async () => {
    mockSet.mockResolvedValue("OK");
    const data = { patients: [], hasMore: false };

    await setFriendsListCache("tenant-1", 0, 50, data);
    expect(mockSet).toHaveBeenCalledWith("fl:tenant-1:0:50", data, { ex: 5 });
  });

  it("Redis障害 → 例外を飲み込む", async () => {
    mockSet.mockRejectedValue(new Error("Redis down"));
    await expect(setFriendsListCache("t1", 0, 50, {})).resolves.toBeUndefined();
  });
});

describe("invalidateFriendsListCache", () => {
  it("テナントIDが空 → 早期リターン", async () => {
    await invalidateFriendsListCache("");
    expect(mockScan).not.toHaveBeenCalled();
  });

  it("キーが見つかった → 全削除", async () => {
    mockScan.mockResolvedValue([0, ["fl:t1:0:50", "fl:t1:50:50"]]);
    mockDel.mockResolvedValue(2);

    await invalidateFriendsListCache("t1");
    expect(mockScan).toHaveBeenCalledWith(0, { match: "fl:t1:*", count: 100 });
    expect(mockDel).toHaveBeenCalledWith("fl:t1:0:50", "fl:t1:50:50");
  });

  it("キーなし → delは呼ばれない", async () => {
    mockScan.mockResolvedValue([0, []]);

    await invalidateFriendsListCache("t1");
    expect(mockDel).not.toHaveBeenCalled();
  });

  it("Redis障害 → 例外を飲み込む", async () => {
    mockScan.mockRejectedValue(new Error("Redis down"));
    await expect(invalidateFriendsListCache("t1")).resolves.toBeUndefined();
  });

  it("複数ページのscan → cursorが0になるまでループ", async () => {
    mockScan
      .mockResolvedValueOnce([42, ["fl:t1:0:50"]])
      .mockResolvedValueOnce([0, ["fl:t1:50:50"]]);
    mockDel.mockResolvedValue(2);

    await invalidateFriendsListCache("t1");
    expect(mockScan).toHaveBeenCalledTimes(2);
    expect(mockDel).toHaveBeenCalledWith("fl:t1:0:50", "fl:t1:50:50");
  });
});

// ── セッションキャッシュ ──

describe("getSessionCache", () => {
  it("値が1 → true", async () => {
    mockGet.mockResolvedValue(1);
    expect(await getSessionCache("hash1")).toBe(true);
  });

  it("値が\"1\" → true", async () => {
    mockGet.mockResolvedValue("1");
    expect(await getSessionCache("hash1")).toBe(true);
  });

  it("値がtrue → true", async () => {
    mockGet.mockResolvedValue(true);
    expect(await getSessionCache("hash1")).toBe(true);
  });

  it("値が0 → false", async () => {
    mockGet.mockResolvedValue(0);
    expect(await getSessionCache("hash1")).toBe(false);
  });

  it("値がnull → null（キャッシュミス）", async () => {
    mockGet.mockResolvedValue(null);
    expect(await getSessionCache("hash1")).toBeNull();
  });

  it("値がundefined → null", async () => {
    mockGet.mockResolvedValue(undefined);
    expect(await getSessionCache("hash1")).toBeNull();
  });

  it("Redis障害 → null", async () => {
    mockGet.mockRejectedValue(new Error("Redis down"));
    expect(await getSessionCache("hash1")).toBeNull();
  });

  it("正しいキーで呼ばれる", async () => {
    mockGet.mockResolvedValue(null);
    await getSessionCache("abc123");
    expect(mockGet).toHaveBeenCalledWith("sess:abc123");
  });
});

describe("setSessionCache", () => {
  it("isValid=true → 1を保存", async () => {
    mockSet.mockResolvedValue("OK");
    await setSessionCache("hash1", true);
    expect(mockSet).toHaveBeenCalledWith("sess:hash1", 1, { ex: 30 });
  });

  it("isValid=false → 0を保存", async () => {
    mockSet.mockResolvedValue("OK");
    await setSessionCache("hash1", false);
    expect(mockSet).toHaveBeenCalledWith("sess:hash1", 0, { ex: 30 });
  });

  it("Redis障害 → 例外を飲み込む", async () => {
    mockSet.mockRejectedValue(new Error("Redis down"));
    await expect(setSessionCache("h1", true)).resolves.toBeUndefined();
  });
});

describe("invalidateSessionCache", () => {
  it("正常 → redis.delが呼ばれる", async () => {
    mockDel.mockResolvedValue(1);
    await invalidateSessionCache("hash1");
    expect(mockDel).toHaveBeenCalledWith("sess:hash1");
  });

  it("Redis障害 → 例外を飲み込む", async () => {
    mockDel.mockRejectedValue(new Error("Redis down"));
    await expect(invalidateSessionCache("h1")).resolves.toBeUndefined();
  });
});
