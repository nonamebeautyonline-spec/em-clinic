// AI WFM Metrics テスト（純ロジック + calculateWFMMetrics）
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Supabaseモック ---
function createMockChain(data: unknown = null, error: unknown = null) {
  const chain: Record<string, any> = {};
  const methods = ["from", "select", "gte", "order", "limit", "eq"];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.then = (resolve: any) => resolve({ data, error });
  return chain;
}

const mockFrom = vi.fn();
vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

import { classifyAge, calculateBacklogAging, calculateWFMMetrics } from "../ai-wfm-metrics";

describe("classifyAge", () => {
  it("0-59分は0-1h", () => {
    expect(classifyAge(0)).toBe("0-1h");
    expect(classifyAge(30)).toBe("0-1h");
    expect(classifyAge(59)).toBe("0-1h");
  });

  it("60-239分は1-4h", () => {
    expect(classifyAge(60)).toBe("1-4h");
    expect(classifyAge(120)).toBe("1-4h");
    expect(classifyAge(239)).toBe("1-4h");
  });

  it("240-1439分は4-24h", () => {
    expect(classifyAge(240)).toBe("4-24h");
    expect(classifyAge(720)).toBe("4-24h");
    expect(classifyAge(1439)).toBe("4-24h");
  });

  it("1440分以上は24h+", () => {
    expect(classifyAge(1440)).toBe("24h+");
    expect(classifyAge(10000)).toBe("24h+");
  });
});

describe("calculateBacklogAging", () => {
  it("空配列は全バケット0", () => {
    const result = calculateBacklogAging([]);
    expect(result).toEqual([
      { ageRangeName: "0-1h", count: 0 },
      { ageRangeName: "1-4h", count: 0 },
      { ageRangeName: "4-24h", count: 0 },
      { ageRangeName: "24h+", count: 0 },
    ]);
  });

  it("直近のタスクは0-1hにカウント", () => {
    const now = new Date();
    const result = calculateBacklogAging([
      { createdAt: new Date(now.getTime() - 10 * 60000).toISOString() }, // 10分前
      { createdAt: new Date(now.getTime() - 30 * 60000).toISOString() }, // 30分前
    ]);
    const bucket = result.find((b) => b.ageRangeName === "0-1h");
    expect(bucket?.count).toBe(2);
  });

  it("古いタスクは24h+にカウント", () => {
    const now = new Date();
    const result = calculateBacklogAging([
      { createdAt: new Date(now.getTime() - 48 * 60 * 60000).toISOString() }, // 48時間前
    ]);
    const bucket = result.find((b) => b.ageRangeName === "24h+");
    expect(bucket?.count).toBe(1);
  });

  it("複数バケットに分散", () => {
    const now = new Date();
    const result = calculateBacklogAging([
      { createdAt: new Date(now.getTime() - 10 * 60000).toISOString() },    // 0-1h
      { createdAt: new Date(now.getTime() - 90 * 60000).toISOString() },    // 1-4h
      { createdAt: new Date(now.getTime() - 300 * 60000).toISOString() },   // 4-24h
      { createdAt: new Date(now.getTime() - 2000 * 60000).toISOString() },  // 24h+
    ]);
    expect(result.find((b) => b.ageRangeName === "0-1h")?.count).toBe(1);
    expect(result.find((b) => b.ageRangeName === "1-4h")?.count).toBe(1);
    expect(result.find((b) => b.ageRangeName === "4-24h")?.count).toBe(1);
    expect(result.find((b) => b.ageRangeName === "24h+")?.count).toBe(1);
  });
});

// ── calculateWFMMetrics ──

describe("calculateWFMMetrics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("タスク取得エラーの場合、空のメトリクスを返す", async () => {
    mockFrom.mockReturnValue(createMockChain(null, { message: "error" }));

    const result = await calculateWFMMetrics();
    expect(result.queueStats).toEqual([]);
    expect(result.assigneeStats).toEqual([]);
    expect(result.peakHours).toEqual([]);
    expect(result.backlogAging).toHaveLength(4);
    expect(result.slaPredictions).toEqual([]);
  });

  it("タスクが0件の場合、空のメトリクスを返す", async () => {
    mockFrom.mockReturnValue(createMockChain([]));

    const result = await calculateWFMMetrics();
    expect(result.queueStats).toEqual([]);
    expect(result.assigneeStats).toEqual([]);
  });

  it("タスクデータからキュー別統計を算出する", async () => {
    const now = new Date();
    const tasks = [
      { id: "t1", status: "pending", queue_name: "support", assignee_id: "a1", created_at: new Date(now.getTime() - 30 * 60000).toISOString(), completed_at: null },
      { id: "t2", status: "running", queue_name: "support", assignee_id: "a1", created_at: new Date(now.getTime() - 60 * 60000).toISOString(), completed_at: null },
      { id: "t3", status: "completed", queue_name: "support", assignee_id: "a1", created_at: new Date(now.getTime() - 120 * 60000).toISOString(), completed_at: new Date(now.getTime() - 60 * 60000).toISOString() },
      { id: "t4", status: "pending", queue_name: "urgent", assignee_id: "a2", created_at: new Date(now.getTime() - 10 * 60000).toISOString(), completed_at: null },
    ];
    mockFrom.mockReturnValue(createMockChain(tasks));

    const result = await calculateWFMMetrics(7);

    // キュー別統計
    expect(result.queueStats.length).toBe(2);
    const supportQueue = result.queueStats.find(q => q.queueName === "support");
    expect(supportQueue).toBeDefined();
    expect(supportQueue!.pendingCount).toBe(1);
    expect(supportQueue!.assignedCount).toBe(1);
    expect(supportQueue!.completedCount).toBe(1);

    const urgentQueue = result.queueStats.find(q => q.queueName === "urgent");
    expect(urgentQueue).toBeDefined();
    expect(urgentQueue!.pendingCount).toBe(1);
  });

  it("担当者別統計を算出する", async () => {
    const now = new Date();
    const tasks = [
      { id: "t1", status: "pending", queue_name: "default", assignee_id: "a1", created_at: new Date(now.getTime() - 30 * 60000).toISOString(), completed_at: null },
      { id: "t2", status: "completed", queue_name: "default", assignee_id: "a1", created_at: new Date(now.getTime() - 120 * 60000).toISOString(), completed_at: new Date(now.getTime() - 60 * 60000).toISOString() },
      { id: "t3", status: "completed", queue_name: "default", assignee_id: null, created_at: new Date(now.getTime() - 180 * 60000).toISOString(), completed_at: new Date(now.getTime() - 120 * 60000).toISOString() },
    ];
    mockFrom.mockReturnValue(createMockChain(tasks));

    const result = await calculateWFMMetrics();

    const a1Stats = result.assigneeStats.find(a => a.assigneeId === "a1");
    expect(a1Stats).toBeDefined();
    expect(a1Stats!.pendingCount).toBe(1);
    expect(a1Stats!.completedCount).toBe(1);
    expect(a1Stats!.avgCompletionMin).not.toBeNull();

    const unassigned = result.assigneeStats.find(a => a.assigneeId === "unassigned");
    expect(unassigned).toBeDefined();
    expect(unassigned!.completedCount).toBe(1);
  });

  it("ピーク時間帯を算出し、降順ソートする", async () => {
    const now = new Date();
    // 同じ時間帯のタスクを複数作成
    const hour = now.getHours();
    const tasks = [
      { id: "t1", status: "completed", queue_name: "default", assignee_id: "a1", created_at: now.toISOString(), completed_at: now.toISOString() },
      { id: "t2", status: "completed", queue_name: "default", assignee_id: "a1", created_at: now.toISOString(), completed_at: now.toISOString() },
    ];
    mockFrom.mockReturnValue(createMockChain(tasks));

    const result = await calculateWFMMetrics();

    expect(result.peakHours.length).toBeGreaterThan(0);
    expect(result.peakHours[0].hour).toBe(hour);
    expect(result.peakHours[0].taskCount).toBe(2);
  });

  it("SLA breach予測: urgentキューの滞留タスクがhigh riskで報告される", async () => {
    const now = new Date();
    // urgentのSLAは30分。31分前のタスクは既にbreach
    const tasks = [
      { id: "t1", status: "pending", queue_name: "urgent", assignee_id: null, created_at: new Date(now.getTime() - 31 * 60000).toISOString(), completed_at: null },
    ];
    mockFrom.mockReturnValue(createMockChain(tasks));

    const result = await calculateWFMMetrics();

    expect(result.slaPredictions.length).toBe(1);
    expect(result.slaPredictions[0].risk).toBe("high");
    expect(result.slaPredictions[0].predictedBreachMin).toBe(0);
  });

  it("SLA breach予測: 残り30%以下でmedium risk", async () => {
    const now = new Date();
    // supportのSLAは120分。残り30%=36分以下で medium。100分前のタスク→残り20分
    const tasks = [
      { id: "t1", status: "pending", queue_name: "support", assignee_id: null, created_at: new Date(now.getTime() - 100 * 60000).toISOString(), completed_at: null },
    ];
    mockFrom.mockReturnValue(createMockChain(tasks));

    const result = await calculateWFMMetrics();

    expect(result.slaPredictions.length).toBe(1);
    expect(result.slaPredictions[0].risk).toBe("medium");
  });

  it("SLA breach予測: low riskはslaPredictionsに含まれない", async () => {
    const now = new Date();
    // defaultのSLAは240分。5分前のタスク→残り235分→low risk
    const tasks = [
      { id: "t1", status: "pending", queue_name: "default", assignee_id: null, created_at: new Date(now.getTime() - 5 * 60000).toISOString(), completed_at: null },
    ];
    mockFrom.mockReturnValue(createMockChain(tasks));

    const result = await calculateWFMMetrics();

    expect(result.slaPredictions.length).toBe(0);
  });

  it("queue_nameがnullの場合はdefaultキューにマッピングされる", async () => {
    const now = new Date();
    const tasks = [
      { id: "t1", status: "pending", queue_name: null, assignee_id: null, created_at: now.toISOString(), completed_at: null },
    ];
    mockFrom.mockReturnValue(createMockChain(tasks));

    const result = await calculateWFMMetrics();

    const defaultQueue = result.queueStats.find(q => q.queueName === "default");
    expect(defaultQueue).toBeDefined();
    expect(defaultQueue!.pendingCount).toBe(1);
  });

  it("daysパラメータで対象期間を指定できる", async () => {
    mockFrom.mockReturnValue(createMockChain([]));

    await calculateWFMMetrics(14);

    // fromが呼ばれた（エラーなく完了すればOK）
    expect(mockFrom).toHaveBeenCalled();
  });
});
