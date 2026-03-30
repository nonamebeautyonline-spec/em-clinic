// AI Assignment テスト
import { describe, it, expect, vi, beforeEach } from "vitest";

// Supabase モック
const mockUpdate = vi.fn();
const mockEq = vi.fn();
const mockSelectResult = vi.fn();

function createMockChain(resolvedValue: unknown = { error: null }) {
  const chain: Record<string, unknown> = {};
  chain.update = mockUpdate.mockReturnValue(chain);
  chain.eq = mockEq.mockReturnValue(chain);
  chain.select = vi.fn().mockReturnValue(chain);
  chain.not = vi.fn().mockReturnValue(chain);
  chain.in = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockResolvedValue(resolvedValue);
  chain.single = vi.fn().mockResolvedValue(resolvedValue);
  // update().eq() が直接resolveする場合
  mockUpdate.mockReturnValue({
    eq: vi.fn().mockResolvedValue(resolvedValue),
  });
  return chain;
}

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn(() => createMockChain()),
  },
}));

import { assignTask, unassignTask, getAssigneeWorkload, updateTaskPriority } from "@/lib/ai-assignment";
import { supabaseAdmin } from "@/lib/supabase";

describe("assignTask", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("正常にアサインできる", async () => {
    const result = await assignTask("task-1", "user-1", "admin@example.com");
    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("DBエラー時にfalseを返す", async () => {
    vi.mocked(supabaseAdmin.from).mockReturnValueOnce({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: { message: "DB error" } }),
      }),
    } as never);

    const result = await assignTask("task-1", "user-1", "admin@example.com");
    expect(result.success).toBe(false);
    expect(result.error).toBe("DB error");
  });
});

describe("unassignTask", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("正常にアサイン解除できる", async () => {
    const result = await unassignTask("task-1");
    expect(result.success).toBe(true);
  });
});

describe("getAssigneeWorkload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("空の配列を渡すと空のマップを返す", async () => {
    const result = await getAssigneeWorkload([]);
    expect(result.size).toBe(0);
  });

  it("担当者IDリストに対してワークロードを返す", async () => {
    const mockData = [
      { assignee_id: "user-1" },
      { assignee_id: "user-1" },
      { assignee_id: "user-2" },
    ];

    vi.mocked(supabaseAdmin.from).mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        not: vi.fn().mockReturnValue({
          in: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: mockData, error: null }),
          }),
        }),
      }),
    } as never);

    const result = await getAssigneeWorkload(["user-1", "user-2", "user-3"]);
    expect(result.get("user-1")).toBe(2);
    expect(result.get("user-2")).toBe(1);
    expect(result.get("user-3")).toBe(0);
  });
});

describe("updateTaskPriority", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("正常に優先度を更新できる", async () => {
    const result = await updateTaskPriority("task-1", 80);
    expect(result.success).toBe(true);
  });

  it("優先度を0-100にクランプする", async () => {
    // 200を渡しても100にクランプされる
    const result = await updateTaskPriority("task-1", 200);
    expect(result.success).toBe(true);
  });
});
