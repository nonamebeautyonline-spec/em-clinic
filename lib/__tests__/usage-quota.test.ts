// lib/__tests__/usage-quota.test.ts
// 使用量クォータチェック機能のテスト

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFrom = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

const {
  checkQuota,
  getAlertLevel,
  getAlertLabel,
  ALERT_THRESHOLDS,
} = await import("@/lib/usage-quota");

/* ---------- ヘルパー ---------- */

function createMockChain(data: unknown = null, error: unknown = null, count: number | null = null) {
  const chain: Record<string, any> = {};
  const methods = ["from", "select", "insert", "update", "upsert", "delete", "eq", "neq", "in", "is", "not", "gt", "gte", "lt", "lte", "like", "ilike", "contains", "containedBy", "filter", "or", "order", "limit", "range", "single", "maybeSingle", "match", "textSearch", "csv", "rpc", "count", "head"];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.then = (resolve: any) => resolve({ data, error, count });
  return chain;
}

const TENANT_ID = "tenant-001";

/* ---------- テスト ---------- */

describe("usage-quota", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("ALERT_THRESHOLDS", () => {
    it("3つのしきい値レベルが定義されている", () => {
      expect(ALERT_THRESHOLDS).toHaveLength(3);
      expect(ALERT_THRESHOLDS[0].percent).toBe(80);
      expect(ALERT_THRESHOLDS[1].percent).toBe(90);
      expect(ALERT_THRESHOLDS[2].percent).toBe(100);
    });
  });

  describe("checkQuota", () => {
    it("クォータ内の使用量を正常に計算する", async () => {
      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // message_log count
          return createMockChain(null, null, 2500);
        }
        // tenant_plans
        return createMockChain({ message_quota: 5000 });
      });

      const result = await checkQuota(TENANT_ID);
      expect(result.withinQuota).toBe(true);
      expect(result.usage).toBe(2500);
      expect(result.quota).toBe(5000);
      expect(result.percentUsed).toBe(50);
    });

    it("クォータ超過を検出する", async () => {
      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return createMockChain(null, null, 5500);
        }
        return createMockChain({ message_quota: 5000 });
      });

      const result = await checkQuota(TENANT_ID);
      expect(result.withinQuota).toBe(false);
      expect(result.usage).toBe(5500);
      expect(result.percentUsed).toBe(110);
    });

    it("プランが見つからない場合はデフォルト5000を使用する", async () => {
      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return createMockChain(null, null, 1000);
        }
        return createMockChain(null); // プランなし
      });

      const result = await checkQuota(TENANT_ID);
      expect(result.quota).toBe(5000);
      expect(result.percentUsed).toBe(20);
    });

    it("メッセージ数が0の場合", async () => {
      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return createMockChain(null, null, 0);
        }
        return createMockChain({ message_quota: 5000 });
      });

      const result = await checkQuota(TENANT_ID);
      expect(result.withinQuota).toBe(true);
      expect(result.usage).toBe(0);
      expect(result.percentUsed).toBe(0);
    });

    it("countがnullの場合は0として扱う", async () => {
      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return createMockChain(null, null, null);
        }
        return createMockChain({ message_quota: 5000 });
      });

      const result = await checkQuota(TENANT_ID);
      expect(result.usage).toBe(0);
    });
  });

  describe("getAlertLevel", () => {
    it("0%は正常", () => {
      expect(getAlertLevel(0)).toBe("normal");
    });

    it("79%は正常", () => {
      expect(getAlertLevel(79)).toBe("normal");
    });

    it("80%は注意", () => {
      expect(getAlertLevel(80)).toBe("caution");
    });

    it("89%は注意", () => {
      expect(getAlertLevel(89)).toBe("caution");
    });

    it("90%は警告", () => {
      expect(getAlertLevel(90)).toBe("warning");
    });

    it("99%は警告", () => {
      expect(getAlertLevel(99)).toBe("warning");
    });

    it("100%は制限", () => {
      expect(getAlertLevel(100)).toBe("limit");
    });

    it("100%超も制限", () => {
      expect(getAlertLevel(150)).toBe("limit");
    });
  });

  describe("getAlertLabel", () => {
    it("normalは「正常」", () => {
      expect(getAlertLabel("normal")).toBe("正常");
    });

    it("cautionは「注意」", () => {
      expect(getAlertLabel("caution")).toBe("注意");
    });

    it("warningは「警告」", () => {
      expect(getAlertLabel("warning")).toBe("警告");
    });

    it("limitは「制限」", () => {
      expect(getAlertLabel("limit")).toBe("制限");
    });
  });
});
