// __tests__/api/platform-failure-review.test.ts
// AI失敗レビューAPI (app/api/platform/ai-supervisor/failure-review/route.ts) のテスト
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

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(),
}));

function createReq(method: string, url: string, body?: unknown) {
  const req = new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  Object.assign(req, { nextUrl: new URL(url) });
  return req as unknown as import("next/server").NextRequest;
}

import { GET, PATCH } from "@/app/api/platform/ai-supervisor/failure-review/route";

describe("GET /api/platform/ai-supervisor/failure-review", () => {
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
    const res = await GET(createReq("GET", "http://localhost/api/platform/ai-supervisor/failure-review"));
    expect(res.status).toBe(401);
  });

  it("正常系 → 失敗レビュー一覧を返す", async () => {
    // ai_task_feedback
    tableChains["ai_task_feedback"] = createChain({
      data: [
        { id: "f1", task_id: "t1", feedback_type: "reject", rating: 1, comment: "不正確", reject_category: "hallucination", failure_category: "hallucination", improvement_note: null, created_at: "2026-01-01T00:00:00Z" },
      ],
      count: 1,
      error: null,
    });

    // ai_tasks
    tableChains["ai_tasks"] = createChain({
      data: [
        { id: "t1", workflow_type: "line-reply", status: "completed", output: "テスト出力", handoff_summary: null, trace: {}, created_at: "2026-01-01T00:00:00Z" },
      ],
      error: null,
    });

    const res = await GET(createReq("GET", "http://localhost/api/platform/ai-supervisor/failure-review"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.items).toBeDefined();
    expect(json.total).toBeDefined();
    expect(json.categoryCounts).toBeDefined();
  });

  it("フィルタ付き → 正常レスポンス", async () => {
    tableChains["ai_task_feedback"] = createChain({ data: [], count: 0, error: null });

    const res = await GET(createReq("GET", "http://localhost/api/platform/ai-supervisor/failure-review?workflow_type=line-reply&failure_category=hallucination&limit=10"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("DBエラー → 500", async () => {
    tableChains["ai_task_feedback"] = createChain({ data: null, error: { message: "DB error" } });

    const res = await GET(createReq("GET", "http://localhost/api/platform/ai-supervisor/failure-review"));
    expect(res.status).toBe(500);
  });
});

describe("PATCH /api/platform/ai-supervisor/failure-review", () => {
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
    const res = await PATCH(createReq("PATCH", "http://localhost/api/platform/ai-supervisor/failure-review", { feedback_id: "f1" }));
    expect(res.status).toBe(401);
  });

  it("不正なJSON → 400", async () => {
    const req = new Request("http://localhost/api/platform/ai-supervisor/failure-review", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: "INVALID",
    });
    Object.assign(req, { nextUrl: new URL("http://localhost/api/platform/ai-supervisor/failure-review") });
    const res = await PATCH(req as unknown as import("next/server").NextRequest);
    expect(res.status).toBe(400);
  });

  it("feedback_id未指定 → 400", async () => {
    const res = await PATCH(createReq("PATCH", "http://localhost/api/platform/ai-supervisor/failure-review", {}));
    expect(res.status).toBe(400);
  });

  it("更新フィールドなし → 400", async () => {
    const res = await PATCH(createReq("PATCH", "http://localhost/api/platform/ai-supervisor/failure-review", {
      feedback_id: "f1",
    }));
    expect(res.status).toBe(400);
  });

  it("正常系 → 200", async () => {
    tableChains["ai_task_feedback"] = createChain({ data: null, error: null });

    const res = await PATCH(createReq("PATCH", "http://localhost/api/platform/ai-supervisor/failure-review", {
      feedback_id: "f1",
      failure_category: "hallucination",
      improvement_note: "プロンプト改善が必要",
    }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("DB更新エラー → 500", async () => {
    tableChains["ai_task_feedback"] = createChain({ data: null, error: { message: "update failed" } });

    const res = await PATCH(createReq("PATCH", "http://localhost/api/platform/ai-supervisor/failure-review", {
      feedback_id: "f1",
      failure_category: "hallucination",
    }));
    expect(res.status).toBe(500);
  });
});
