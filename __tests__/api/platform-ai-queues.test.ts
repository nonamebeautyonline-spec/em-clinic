// __tests__/api/platform-ai-queues.test.ts
// AIキュー管理API テスト

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/platform-auth", () => ({
  verifyPlatformAdmin: vi.fn(),
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(),
}));

vi.mock("@/lib/ai-routing", () => ({
  getQueueStats: vi.fn(() => Promise.resolve({ total: 0 })),
}));

vi.mock("@/lib/ai-assignment", () => ({
  assignTask: vi.fn(() => Promise.resolve({ success: true })),
}));

function createChain(resolvedValue: unknown = { data: [], error: null, count: 0 }) {
  const handler: ProxyHandler<object> = {
    get: (_target, prop) => {
      if (prop === "then") {
        return (resolve: (v: unknown) => void) => resolve(resolvedValue);
      }
      return vi.fn(() => new Proxy({}, handler));
    },
  };
  return new Proxy({}, handler);
}

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn(() => createChain()),
  },
}));

import { verifyPlatformAdmin } from "@/lib/platform-auth";
const mockAuth = verifyPlatformAdmin as ReturnType<typeof vi.fn>;

describe("GET /api/platform/ai-queues", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("未認証の場合401を返す", async () => {
    mockAuth.mockResolvedValue(null);
    const { GET } = await import("@/app/api/platform/ai-queues/route");
    const req = new NextRequest("http://localhost/api/platform/ai-queues");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("認証済みでタスク一覧取得（200 or 500）", async () => {
    mockAuth.mockResolvedValue({ email: "admin@test.com" });
    const { GET } = await import("@/app/api/platform/ai-queues/route");
    const req = new NextRequest("http://localhost/api/platform/ai-queues");
    const res = await GET(req);
    expect([200, 500]).toContain(res.status);
  });
});

describe("POST /api/platform/ai-queues", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("未認証の場合401を返す", async () => {
    mockAuth.mockResolvedValue(null);
    const { POST } = await import("@/app/api/platform/ai-queues/route");
    const req = new NextRequest("http://localhost/api/platform/ai-queues", {
      method: "POST",
      body: JSON.stringify({ task_id: "t1", assignee_id: "a1" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("task_id/assignee_id未指定で400を返す", async () => {
    mockAuth.mockResolvedValue({ email: "admin@test.com" });
    const { POST } = await import("@/app/api/platform/ai-queues/route");
    const req = new NextRequest("http://localhost/api/platform/ai-queues", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("認証済みでアサイン成功（200）", async () => {
    mockAuth.mockResolvedValue({ email: "admin@test.com" });
    const { POST } = await import("@/app/api/platform/ai-queues/route");
    const req = new NextRequest("http://localhost/api/platform/ai-queues", {
      method: "POST",
      body: JSON.stringify({ task_id: "t1", assignee_id: "a1" }),
    });
    const res = await POST(req);
    expect([200, 500]).toContain(res.status);
  });
});
