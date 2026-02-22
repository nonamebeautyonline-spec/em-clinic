// lib/__tests__/followup.test.ts — フォローアップ自動送信テスト
import { describe, it, expect, vi, beforeEach } from "vitest";

// Supabaseモック
const mockInsert = vi.fn().mockResolvedValue({ error: null });
const mockUpdate = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) }));
const mockLimit = vi.fn().mockResolvedValue({ data: [], error: null });
const mockOrder = vi.fn(() => ({ limit: mockLimit }));
const mockLte = vi.fn(() => ({ order: mockOrder }));
const mockEqStatus = vi.fn(() => ({ lte: mockLte }));
const mockSelectRules = vi.fn();
const mockFrom = vi.fn((table: string) => {
  if (table === "followup_rules") {
    return { select: mockSelectRules };
  }
  if (table === "followup_logs") {
    return {
      insert: mockInsert,
      update: mockUpdate,
      select: vi.fn(() => ({
        eq: mockEqStatus,
      })),
    };
  }
  if (table === "patients") {
    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({ data: { name: "テスト太郎", line_id: "U1234" } }),
        })),
      })),
    };
  }
  if (table === "message_log") {
    return { insert: vi.fn().mockResolvedValue({ error: null }) };
  }
  return { select: vi.fn(), insert: vi.fn(), update: vi.fn() };
});

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: { from: (...args: any[]) => mockFrom(...args) },
}));

vi.mock("@/lib/line-push", () => ({
  pushMessage: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock("@/lib/tenant", () => ({
  withTenant: (query: any) => query,
  tenantPayload: (tenantId: string | null) => tenantId ? { tenant_id: tenantId } : {},
}));

import { scheduleFollowups, processFollowups } from "@/lib/followup";

describe("followup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("scheduleFollowups", () => {
    it("有効なルールに基づきログを作成", async () => {
      const mockRules = [
        { id: 1, delay_days: 3, trigger_event: "payment_completed", is_enabled: true },
        { id: 2, delay_days: 7, trigger_event: "payment_completed", is_enabled: true },
      ];
      // select→eq→eq のチェーンをモック
      const mockEqTrigger = vi.fn().mockResolvedValue({ data: mockRules, error: null });
      const mockEqEnabled = vi.fn(() => ({ eq: mockEqTrigger }));
      mockSelectRules.mockReturnValue({ eq: mockEqEnabled });

      await scheduleFollowups(100, "P001", null);
      expect(mockInsert).toHaveBeenCalledOnce();
      const insertedLogs = mockInsert.mock.calls[0][0];
      expect(insertedLogs).toHaveLength(2);
      expect(insertedLogs[0].patient_id).toBe("P001");
      expect(insertedLogs[0].order_id).toBe(100);
      expect(insertedLogs[0].status).toBe("pending");
    });

    it("ルールがない場合は何もしない", async () => {
      const mockEqTrigger = vi.fn().mockResolvedValue({ data: [], error: null });
      const mockEqEnabled = vi.fn(() => ({ eq: mockEqTrigger }));
      mockSelectRules.mockReturnValue({ eq: mockEqEnabled });

      await scheduleFollowups(100, "P001", null);
      expect(mockInsert).not.toHaveBeenCalled();
    });

    it("ルール取得エラー時はログ出力のみ", async () => {
      const mockEqTrigger = vi.fn().mockResolvedValue({ data: null, error: { message: "DB error" } });
      const mockEqEnabled = vi.fn(() => ({ eq: mockEqTrigger }));
      mockSelectRules.mockReturnValue({ eq: mockEqEnabled });
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});

      await scheduleFollowups(100, "P001", null);
      expect(mockInsert).not.toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe("processFollowups", () => {
    it("pendingログがない場合は0を返す", async () => {
      mockLimit.mockResolvedValue({ data: [], error: null });
      const result = await processFollowups();
      expect(result).toEqual({ sent: 0, failed: 0, skipped: 0 });
    });

    it("ログ取得エラー時は0を返す", async () => {
      mockLimit.mockResolvedValue({ data: null, error: { message: "DB error" } });
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      const result = await processFollowups();
      expect(result).toEqual({ sent: 0, failed: 0, skipped: 0 });
      spy.mockRestore();
    });
  });
});
