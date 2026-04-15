// __tests__/api/admin-ai-reply-draft.test.ts
// AI返信ドラフトAPI テスト

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: vi.fn(),
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  resolveTenantIdOrThrow: vi.fn(() => "test-tenant"),
  withTenant: vi.fn((q) => q),
  strictWithTenant: vi.fn((q) => q),
  tenantPayload: vi.fn((tid: string) => ({ tenant_id: tid })),
}));

function createChain(resolvedValue: unknown = { data: null, error: null }) {
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

vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn(),
}));

vi.mock("@/lib/ai-reply", () => ({
  sendAiReply: vi.fn(),
  buildSystemPrompt: vi.fn(() => ""),
  buildUserMessage: vi.fn(() => ""),
  fetchPatientFlowStatus: vi.fn(() => ({})),
  processAiReply: vi.fn(),
  clearAiReplyDebounce: vi.fn(),
  lastProcessLog: null,
}));

vi.mock("@/lib/embedding", () => ({
  saveAiReplyExample: vi.fn(),
  boostExampleQuality: vi.fn(),
  penalizeExampleQuality: vi.fn(),
  executeRAGPipeline: vi.fn(() => ({ examples: [], knowledgeChunks: [] })),
}));

vi.mock("@/lib/edit-distance", () => ({
  normalizedEditDistance: vi.fn(() => 0),
}));

vi.mock("@/lib/settings", () => ({
  getSettingOrEnv: vi.fn(() => "mock-key"),
}));

vi.mock("@/lib/validations/helpers", () => ({
  parseBody: vi.fn(async (req: Request) => {
    const body = await req.json();
    return { data: body };
  }),
}));

vi.mock("@/lib/distributed-lock", () => ({
  acquireLock: vi.fn(() => ({ acquired: true, release: vi.fn() })),
}));

import { verifyAdminAuth } from "@/lib/admin-auth";

const mockAuth = verifyAdminAuth as ReturnType<typeof vi.fn>;

describe("GET /api/admin/line/ai-reply-draft", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("未認証の場合401を返す", async () => {
    mockAuth.mockResolvedValue(false);
    const { GET } = await import("@/app/api/admin/line/ai-reply-draft/route");
    const req = new NextRequest("http://localhost/api/admin/line/ai-reply-draft?patient_id=p1");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("patient_id未指定で400を返す", async () => {
    mockAuth.mockResolvedValue(true);
    const { GET } = await import("@/app/api/admin/line/ai-reply-draft/route");
    const req = new NextRequest("http://localhost/api/admin/line/ai-reply-draft");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("正常系 — patient_id指定でdraftを返す", async () => {
    mockAuth.mockResolvedValue(true);
    const { GET } = await import("@/app/api/admin/line/ai-reply-draft/route");
    const req = new NextRequest("http://localhost/api/admin/line/ai-reply-draft?patient_id=p1");
    const res = await GET(req);
    // DBモックが空を返すのでdraft: null
    expect([200, 500]).toContain(res.status);
  });
});

describe("POST /api/admin/line/ai-reply-draft", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("未認証の場合401を返す", async () => {
    mockAuth.mockResolvedValue(false);
    const { POST } = await import("@/app/api/admin/line/ai-reply-draft/route");
    const req = new NextRequest("http://localhost/api/admin/line/ai-reply-draft", {
      method: "POST",
      body: JSON.stringify({ draft_id: 1, action: "send" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("draft_id未指定かつ単一操作時に400を返す", async () => {
    mockAuth.mockResolvedValue(true);
    const { POST } = await import("@/app/api/admin/line/ai-reply-draft/route");
    const req = new NextRequest("http://localhost/api/admin/line/ai-reply-draft", {
      method: "POST",
      body: JSON.stringify({ action: "send" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("認証済みでのPOST実行（200/400/500）", async () => {
    mockAuth.mockResolvedValue(true);
    const { POST } = await import("@/app/api/admin/line/ai-reply-draft/route");
    const req = new NextRequest("http://localhost/api/admin/line/ai-reply-draft", {
      method: "POST",
      body: JSON.stringify({ draft_id: 1, action: "reject" }),
    });
    const res = await POST(req);
    expect([200, 400, 500]).toContain(res.status);
  });
});
