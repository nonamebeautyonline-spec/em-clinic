// lib/__tests__/report-generator.test.ts — 定期レポート生成テスト
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Supabase チェーンモック ---
type SupabaseChain = Record<string, ReturnType<typeof vi.fn>>;

function createChain(resolve: unknown = { data: [], error: null, count: 0 }): SupabaseChain {
  const chain = {} as SupabaseChain;
  [
    "insert", "update", "delete", "select", "eq", "neq", "gt", "gte", "lt", "lte",
    "in", "is", "not", "order", "limit", "range", "single", "maybeSingle", "upsert",
    "ilike", "or", "count", "csv", "head",
  ].forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.then = vi.fn((cb: (val: unknown) => unknown) => cb(resolve));
  return chain;
}

let tableChains: Record<string, SupabaseChain> = {};
function getOrCreateChain(table: string) {
  if (!tableChains[table]) tableChains[table] = createChain();
  return tableChains[table];
}

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: { from: vi.fn((table: string) => getOrCreateChain(table)) },
}));

vi.mock("@/lib/tenant", () => ({
  withTenant: vi.fn((q: unknown) => q),
  strictWithTenant: vi.fn((q: unknown) => q),
  tenantPayload: vi.fn(() => ({ tenant_id: "test-tenant" })),
  resolveTenantId: vi.fn(() => "test-tenant"),
  resolveTenantIdOrThrow: vi.fn(() => "test-tenant"),
}));

import {
  getWeeklyPeriod,
  getMonthlyPeriod,
  generateWeeklyReport,
  generateMonthlyReport,
} from "@/lib/report-generator";

describe("report-generator", () => {
  beforeEach(() => {
    tableChains = {};
  });

  describe("getWeeklyPeriod", () => {
    it("直近7日間の期間を返す", () => {
      // 2026-03-07 09:00 JST = 2026-03-07 00:00 UTC
      const now = new Date("2026-03-07T00:00:00Z");
      const period = getWeeklyPeriod(now);

      // JSTで3/7の0:00 → 期間は2/28〜3/6
      expect(period.start).toBeInstanceOf(Date);
      expect(period.end).toBeInstanceOf(Date);
      expect(period.end.getTime() - period.start.getTime()).toBe(7 * 24 * 60 * 60 * 1000);
      expect(period.label).toContain("〜");
    });
  });

  describe("getMonthlyPeriod", () => {
    it("前月の期間を返す", () => {
      // 2026-03-07 09:00 JST = 2026-03-07 00:00 UTC
      const now = new Date("2026-03-07T00:00:00Z");
      const period = getMonthlyPeriod(now);

      expect(period.label).toContain("2月");
      expect(period.start).toBeInstanceOf(Date);
      expect(period.end).toBeInstanceOf(Date);
    });
  });

  describe("generateWeeklyReport", () => {
    it("HTMLとsubjectを含むレポートを生成する", async () => {
      // 売上データのモック
      tableChains.orders = createChain({ data: [{ amount: 10000 }, { amount: 5000 }], error: null });
      tableChains.intake = createChain({ data: [], error: null, count: 42 });
      tableChains.reservations = createChain({ data: [], error: null, count: 15 });
      tableChains.message_log = createChain({ data: [], error: null, count: 100 });

      const result = await generateWeeklyReport("test-tenant");

      expect(result.html).toContain("週次レポート");
      expect(result.subject).toContain("週次レポート");
      expect(result.data).toBeDefined();
      expect(result.data.period).toBeDefined();
    });

    it("データがない場合も正常に生成される", async () => {
      // 全テーブルが空
      const result = await generateWeeklyReport("test-tenant");

      expect(result.html).toContain("週次レポート");
      expect(result.data.revenue.total).toBe(0);
      expect(result.data.patients.total).toBe(0);
      expect(result.data.reservations).toBe(0);
    });
  });

  describe("generateMonthlyReport", () => {
    it("HTMLとsubjectを含むレポートを生成する", async () => {
      tableChains.orders = createChain({ data: [{ amount: 50000 }], error: null });
      tableChains.intake = createChain({ data: [], error: null, count: 100 });
      tableChains.reservations = createChain({ data: [], error: null, count: 50 });
      tableChains.message_log = createChain({ data: [], error: null, count: 500 });

      const result = await generateMonthlyReport("test-tenant");

      expect(result.html).toContain("月次レポート");
      expect(result.subject).toContain("月次レポート");
      expect(result.data).toBeDefined();
    });
  });
});
