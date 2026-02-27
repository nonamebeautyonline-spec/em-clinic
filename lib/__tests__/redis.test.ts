// lib/__tests__/redis.test.ts — Redis キャッシュユーティリティのテスト

import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockDel } = vi.hoisted(() => {
  return { mockDel: vi.fn() };
});

vi.mock("@upstash/redis", () => {
  return {
    Redis: class MockRedis {
      del = mockDel;
    },
  };
});

import { getDashboardCacheKey, invalidateDashboardCache } from "@/lib/redis";

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------- getDashboardCacheKey ----------
describe("getDashboardCacheKey", () => {
  it("\"dashboard:{patientId}\" 形式のキーを返す", () => {
    expect(getDashboardCacheKey("patient-abc")).toBe("dashboard:patient-abc");
  });

  it("空文字でも \"dashboard:\" を返す", () => {
    expect(getDashboardCacheKey("")).toBe("dashboard:");
  });
});

// ---------- invalidateDashboardCache ----------
describe("invalidateDashboardCache", () => {
  it("空のpatientId -> 早期リターン（del未呼出）", async () => {
    await invalidateDashboardCache("");
    expect(mockDel).not.toHaveBeenCalled();
  });

  it("正常 -> redis.del(\"dashboard:{id}\") 呼出", async () => {
    mockDel.mockResolvedValue(1);

    await invalidateDashboardCache("patient-xyz");
    expect(mockDel).toHaveBeenCalledWith("dashboard:patient-xyz");
  });

  it("del失敗(例外) -> 例外を飲み込む(voidで返る)", async () => {
    mockDel.mockRejectedValue(new Error("Redis connection failed"));

    // 例外が投げられないことを確認
    await expect(invalidateDashboardCache("patient-err")).resolves.toBeUndefined();
  });

  it("正しいキーでdelが呼ばれる", async () => {
    mockDel.mockResolvedValue(1);

    await invalidateDashboardCache("test-id-123");
    expect(mockDel).toHaveBeenCalledTimes(1);
    expect(mockDel).toHaveBeenCalledWith("dashboard:test-id-123");
  });
});
