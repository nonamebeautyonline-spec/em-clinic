// __tests__/api/platform-ai-supervisor.test.ts
// AI Supervisor API (app/api/platform/ai-supervisor/route.ts) のテスト
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

vi.mock("@/lib/ai-outcome-evals", () => ({
  calculateOutcomeMetrics: vi.fn().mockReturnValue({
    approvalRate: 80,
    avgRating: 4.5,
    totalTasks: 2,
  }),
}));

vi.mock("@/lib/ai-anomaly-detection", () => ({
  runAnomalyDetection: vi.fn().mockReturnValue([]),
  checkSLABreaches: vi.fn().mockReturnValue([]),
}));

vi.mock("@/lib/ai-qa-score", () => ({
  aggregateWorkflowQA: vi.fn().mockReturnValue({ score: 85 }),
  inferQALabel: vi.fn().mockReturnValue("other"),
}));

function createReq(url = "http://localhost/api/platform/ai-supervisor") {
  const req = new Request(url, { method: "GET", headers: { "Content-Type": "application/json" } });
  Object.assign(req, { nextUrl: new URL(url) });
  return req as unknown as import("next/server").NextRequest;
}

import { GET } from "@/app/api/platform/ai-supervisor/route";

describe("GET /api/platform/ai-supervisor", () => {
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

  it("正常系 → Supervisorデータを返す", async () => {
    // ai_tasks
    tableChains["ai_tasks"] = createChain({
      data: [
        { id: "t1", workflow_type: "line-reply", status: "completed", handoff_status: null, input_tokens: 100, output_tokens: 50, created_at: "2026-01-01T00:00:00Z", completed_at: "2026-01-01T00:01:00Z", trace: {} },
      ],
      error: null,
    });

    // ai_task_feedback
    tableChains["ai_task_feedback"] = createChain({
      data: [
        { id: "f1", task_id: "t1", feedback_type: "approve", rating: 5, comment: null, reject_category: null, failure_category: null, created_at: "2026-01-01T01:00:00Z" },
      ],
      error: null,
    });

    // ai_supervisor_alerts
    tableChains["ai_supervisor_alerts"] = createChain({
      data: [],
      error: null,
    });

    const res = await GET(createReq());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.outcomeMetrics).toBeDefined();
    expect(json.anomalies).toBeDefined();
    expect(json.slaBreaches).toBeDefined();
    expect(json.qaLabels).toBeDefined();
    expect(json.summary).toBeDefined();
  });

  it("DBエラー時は 500 を返す", async () => {
    tableChains["ai_tasks"] = createChain({ data: null, error: { message: "DB error" } });

    const res = await GET(createReq());
    expect(res.status).toBe(500);
  });
});
