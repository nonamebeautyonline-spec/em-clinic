// lib/__tests__/cron-logger.test.ts — Cron実行ログのテスト
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Supabaseモック ---
const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockUpdate = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();

function buildChain(finalFn: ReturnType<typeof vi.fn>) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.insert = vi.fn().mockReturnValue({ select: chain.select = vi.fn().mockReturnValue({ single: mockSingle }) });
  chain.select = vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: mockSingle }) });
  chain.update = vi.fn().mockReturnValue({ eq: mockEq });
  chain.from = vi.fn().mockReturnValue(chain);
  return chain;
}

const mockFrom = vi.fn();
const mockChain = {
  insert: mockInsert,
  select: mockSelect,
  update: mockUpdate,
  eq: mockEq,
  single: mockSingle,
};

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

vi.mock("@/lib/tenant", () => ({
  tenantPayload: vi.fn((id: string | null) => ({
    tenant_id: id || "00000000-0000-0000-0000-000000000001",
  })),
}));

import { startCronLog, finishCronLog } from "@/lib/cron-logger";

describe("cron-logger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("startCronLog", () => {
    it("正常にログを作成してIDを返す", async () => {
      const mockSingleResult = { data: { id: "log-123" }, error: null };
      mockFrom.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(mockSingleResult),
          }),
        }),
      });

      const id = await startCronLog("send-scheduled", "tenant-1");
      expect(id).toBe("log-123");
      expect(mockFrom).toHaveBeenCalledWith("cron_execution_logs");
    });

    it("テナントID未指定時もデフォルトテナントで作成", async () => {
      const insertFn = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: "log-456" }, error: null }),
        }),
      });
      mockFrom.mockReturnValue({ insert: insertFn });

      const id = await startCronLog("collect-line-stats");
      expect(id).toBe("log-456");
      // tenantPayload(null) が呼ばれてデフォルトIDが設定される
      expect(insertFn).toHaveBeenCalledWith(
        expect.objectContaining({
          tenant_id: "00000000-0000-0000-0000-000000000001",
          cron_name: "collect-line-stats",
          status: "running",
        }),
      );
    });

    it("DB障害時はnullを返す（サービス継続優先）", async () => {
      mockFrom.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: "DB connection error" },
            }),
          }),
        }),
      });

      const id = await startCronLog("test-cron");
      expect(id).toBeNull();
    });

    it("例外発生時もnullを返す（サービス継続優先）", async () => {
      mockFrom.mockImplementation(() => {
        throw new Error("unexpected error");
      });

      const id = await startCronLog("test-cron");
      expect(id).toBeNull();
    });
  });

  describe("finishCronLog", () => {
    it("logIdがnullの場合は何もしない", async () => {
      await finishCronLog(null, "success");
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it("成功ステータスで更新する", async () => {
      const startedAt = new Date(Date.now() - 5000).toISOString();
      const updateFn = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });
      mockFrom
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { started_at: startedAt },
                error: null,
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          update: updateFn,
        });

      await finishCronLog("log-123", "success", { sent: 10, failed: 0 });

      expect(updateFn).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "success",
          result_summary: { sent: 10, failed: 0 },
          error_message: null,
        }),
      );
    });

    it("失敗ステータスとエラーメッセージで更新する", async () => {
      const startedAt = new Date(Date.now() - 2000).toISOString();
      const updateFn = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });
      mockFrom
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { started_at: startedAt },
                error: null,
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          update: updateFn,
        });

      await finishCronLog("log-789", "failed", undefined, "LINE API timeout");

      expect(updateFn).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "failed",
          error_message: "LINE API timeout",
          result_summary: null,
        }),
      );
    });

    it("DB障害時もエラーをスローしない（graceful degradation）", async () => {
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockRejectedValue(new Error("DB down")),
          }),
        }),
      });

      // エラーをスローしないことを確認
      await expect(finishCronLog("log-err", "failed")).resolves.toBeUndefined();
    });
  });
});
