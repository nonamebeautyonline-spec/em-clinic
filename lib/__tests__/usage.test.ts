// lib/__tests__/usage.test.ts
// 使用量集計ロジックのテスト

import { describe, it, expect, vi, beforeEach } from "vitest";

// supabaseAdmin モック
const mockSelect = vi.fn();
const mockFrom = vi.fn(() => ({
  select: mockSelect,
}));

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

// 動的インポート（モック設定後）
const { getCurrentMonthUsage, getMonthUsage } = await import("@/lib/usage");

describe("getMonthUsage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("送信数がクォータ内の場合、超過なし", async () => {
    // message_log count
    const countChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockResolvedValue({ count: 5000 }),
    };

    // tenant_plans
    const planChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { message_quota: 30000, overage_unit_price: 0.7 },
      }),
    };

    mockFrom.mockImplementation((table: string) => {
      if (table === "message_log") return countChain;
      if (table === "tenant_plans") return planChain;
      return countChain;
    });

    const result = await getMonthUsage("tenant-1", new Date(2026, 1, 15));
    expect(result.messageCount).toBe(5000);
    expect(result.quota).toBe(30000);
    expect(result.remaining).toBe(25000);
    expect(result.overageCount).toBe(0);
    expect(result.overageAmount).toBe(0);
  });

  it("送信数がクォータ超過の場合、超過料金が計算される", async () => {
    const countChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockResolvedValue({ count: 35000 }),
    };

    const planChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { message_quota: 30000, overage_unit_price: 0.7 },
      }),
    };

    mockFrom.mockImplementation((table: string) => {
      if (table === "message_log") return countChain;
      if (table === "tenant_plans") return planChain;
      return countChain;
    });

    const result = await getMonthUsage("tenant-1", new Date(2026, 1, 15));
    expect(result.messageCount).toBe(35000);
    expect(result.quota).toBe(30000);
    expect(result.remaining).toBe(0);
    expect(result.overageCount).toBe(5000);
    // 5000 * 0.7 = 3500
    expect(result.overageAmount).toBe(3500);
  });

  it("プラン未設定時はデフォルトクォータ5000", async () => {
    const countChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockResolvedValue({ count: 100 }),
    };

    const planChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
    };

    mockFrom.mockImplementation((table: string) => {
      if (table === "message_log") return countChain;
      if (table === "tenant_plans") return planChain;
      return countChain;
    });

    const result = await getMonthUsage("tenant-1", new Date(2026, 1, 15));
    expect(result.quota).toBe(5000);
    expect(result.remaining).toBe(4900);
  });

  it("月表記が正しいフォーマット", async () => {
    const countChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockResolvedValue({ count: 0 }),
    };

    const planChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
    };

    mockFrom.mockImplementation((table: string) => {
      if (table === "message_log") return countChain;
      if (table === "tenant_plans") return planChain;
      return countChain;
    });

    const result = await getMonthUsage("tenant-1", new Date(2026, 0, 15));
    expect(result.month).toBe("2026-01");

    const result2 = await getMonthUsage("tenant-1", new Date(2026, 11, 15));
    expect(result2.month).toBe("2026-12");
  });
});

describe("getCurrentMonthUsage", () => {
  it("当月の使用量を返す（getMonthUsageのラッパー）", async () => {
    const countChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockResolvedValue({ count: 1000 }),
    };

    const planChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { message_quota: 5000, overage_unit_price: 1.0 },
      }),
    };

    mockFrom.mockImplementation((table: string) => {
      if (table === "message_log") return countChain;
      if (table === "tenant_plans") return planChain;
      return countChain;
    });

    const result = await getCurrentMonthUsage("tenant-1");
    expect(result.messageCount).toBe(1000);
    expect(result.tenantId).toBe("tenant-1");
  });
});
