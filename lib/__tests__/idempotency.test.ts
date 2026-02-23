// lib/__tests__/idempotency.test.ts — 冪等チェックテスト

const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockEq = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === "webhook_events") {
        return {
          insert: (data: any) => mockInsert(data),
          update: (data: any) => ({
            eq: (col1: string, val1: string) => ({
              eq: (col2: string, val2: string) => {
                mockUpdate(data);
                mockEq(col1, val1, col2, val2);
                return Promise.resolve({ data: null, error: null });
              },
            }),
          }),
        };
      }
      return { insert: () => ({ data: null, error: null }) };
    },
  },
}));

import { checkIdempotency } from "@/lib/idempotency";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("checkIdempotency", () => {
  it("新規イベント → duplicate: false", async () => {
    mockInsert.mockReturnValue({ data: { id: 1 }, error: null });

    const result = await checkIdempotency("square", "evt-123", "tenant-1");
    expect(result.duplicate).toBe(false);
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        event_source: "square",
        event_id: "evt-123",
        tenant_id: "tenant-1",
        status: "processing",
      }),
    );
  });

  it("同一event_id → duplicate: true（UNIQUE違反）", async () => {
    mockInsert.mockReturnValue({ data: null, error: { code: "23505", message: "unique violation" } });

    const result = await checkIdempotency("square", "evt-123", null);
    expect(result.duplicate).toBe(true);
  });

  it("DB障害時 → duplicate: false（処理続行）", async () => {
    mockInsert.mockReturnValue({ data: null, error: { code: "XXXXX", message: "DB error" } });

    const result = await checkIdempotency("gmo", "evt-456", null);
    expect(result.duplicate).toBe(false);
  });

  it("eventId が空 → 冪等チェックスキップ", async () => {
    const result = await checkIdempotency("square", "", null);
    expect(result.duplicate).toBe(false);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("markCompleted() で status を completed に更新", async () => {
    mockInsert.mockReturnValue({ data: { id: 1 }, error: null });

    const result = await checkIdempotency("gmo", "evt-789", "tenant-2");
    expect(result.duplicate).toBe(false);

    await result.markCompleted();
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: "completed" }),
    );
  });

  it("markFailed() で status を failed に更新", async () => {
    mockInsert.mockReturnValue({ data: { id: 1 }, error: null });

    const result = await checkIdempotency("square", "evt-fail", null);
    await result.markFailed("timeout error");
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: "failed" }),
    );
  });
});
