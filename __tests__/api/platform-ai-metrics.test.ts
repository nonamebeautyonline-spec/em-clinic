// __tests__/api/platform-ai-metrics.test.ts
// AIメトリクスAPI (app/api/platform/ai-metrics/route.ts) のテスト
import { describe, it, expect, vi, beforeEach } from "vitest";

process.env.JWT_SECRET = "test-jwt-secret";

// --- チェーンビルダー ---
function createChain(defaultResolve: Record<string, unknown> = { data: null, error: null }) {
  const chain: Record<string, unknown> = {};
  [
    "insert", "update", "delete", "select", "eq", "neq", "gt", "gte", "lt", "lte",
    "in", "is", "not", "order", "limit", "range", "single", "maybeSingle", "upsert",
    "ilike", "or", "count", "csv",
  ].forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.then = vi.fn((resolve: (val: unknown) => void) => resolve(defaultResolve));
  return chain;
}

let tableChains: Record<string, Record<string, unknown>> = {};
function getOrCreateChain(table: string) {
  if (!tableChains[table]) tableChains[table] = createChain();
  return tableChains[table];
}

const mockVerifyPlatformAdmin = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => getOrCreateChain(table)),
  },
}));

vi.mock("@/lib/platform-auth", () => ({
  verifyPlatformAdmin: (...args: unknown[]) => mockVerifyPlatformAdmin(...args),
}));

function createReq(url = "http://localhost/api/platform/ai-metrics") {
  const req = new Request(url, { method: "GET", headers: { "Content-Type": "application/json" } });
  Object.assign(req, { nextUrl: new URL(url) });
  return req as unknown as import("next/server").NextRequest;
}

import { GET } from "@/app/api/platform/ai-metrics/route";

describe("GET /api/platform/ai-metrics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableChains = {};
    mockVerifyPlatformAdmin.mockResolvedValue({
      userId: "admin-1",
      email: "admin@test.com",
      name: "テスト管理者",
      platformRole: "platform_admin",
    });
  });

  it("認証失敗 → 401", async () => {
    mockVerifyPlatformAdmin.mockResolvedValue(null);
    const res = await GET(createReq());
    expect(res.status).toBe(401);
  });

  it("正常系 → メトリクスを返す", async () => {
    // ai_tasks
    tableChains["ai_tasks"] = createChain({
      data: [
        { id: "t1", workflow_type: "line-reply", status: "completed", input_tokens: 100, output_tokens: 50, handoff_status: null, created_at: "2026-01-01T00:00:00Z" },
        { id: "t2", workflow_type: "line-reply", status: "failed", input_tokens: 80, output_tokens: 0, handoff_status: null, created_at: "2026-01-02T00:00:00Z" },
      ],
      error: null,
    });

    // ai_task_feedback
    tableChains["ai_task_feedback"] = createChain({
      data: [
        { task_id: "t1", feedback_type: "approve", rating: 5, created_at: "2026-01-01T01:00:00Z" },
      ],
      error: null,
    });

    const res = await GET(createReq());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.workflowMetrics).toBeDefined();
    expect(json.dailyTrend).toBeDefined();
    expect(json.summary).toBeDefined();
    expect(json.summary.totalTasks).toBe(2);
    expect(json.summary.totalFeedback).toBe(1);
  });

  it("workflow_type フィルタ付きで正常レスポンス", async () => {
    tableChains["ai_tasks"] = createChain({ data: [], error: null });
    tableChains["ai_task_feedback"] = createChain({ data: [], error: null });

    const res = await GET(createReq("http://localhost/api/platform/ai-metrics?workflow_type=line-reply&days=7"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.period.days).toBe(7);
  });

  it("DBエラー時は 500 を返す", async () => {
    tableChains["ai_tasks"] = createChain({ data: null, error: { message: "DB error" } });

    const res = await GET(createReq());
    expect(res.status).toBe(500);
  });
});
