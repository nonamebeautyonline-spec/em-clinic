// __tests__/api/platform-ai-auto-tuning.test.ts
// AIオートチューニングAPI (app/api/platform/ai-auto-tuning/route.ts) のテスト
import { describe, it, expect, vi, beforeEach } from "vitest";

process.env.JWT_SECRET = "test-jwt-secret";

const mockVerifyPlatformAdmin = vi.fn();

vi.mock("@/lib/platform-auth", () => ({
  verifyPlatformAdmin: (...args: unknown[]) => mockVerifyPlatformAdmin(...args),
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(),
}));

const mockAnalyzeTenantPerformance = vi.fn().mockResolvedValue({ totalTasks: 100 });
const mockGenerateTuningSuggestions = vi.fn().mockResolvedValue([{ id: 1, type: "prompt" }]);
const mockListSuggestions = vi.fn().mockResolvedValue([]);
const mockApplySuggestion = vi.fn().mockResolvedValue(true);
const mockRejectSuggestion = vi.fn().mockResolvedValue(true);

vi.mock("@/lib/ai-auto-tuning", () => ({
  analyzeTenantPerformance: (...args: unknown[]) => mockAnalyzeTenantPerformance(...args),
  generateTuningSuggestions: (...args: unknown[]) => mockGenerateTuningSuggestions(...args),
  listSuggestions: (...args: unknown[]) => mockListSuggestions(...args),
  applySuggestion: (...args: unknown[]) => mockApplySuggestion(...args),
  rejectSuggestion: (...args: unknown[]) => mockRejectSuggestion(...args),
}));

const mockGetSourceWeights = vi.fn().mockResolvedValue({});
const mockSetSourceWeight = vi.fn().mockResolvedValue(undefined);
const mockListAllSourceWeights = vi.fn().mockResolvedValue([]);

vi.mock("@/lib/ai-source-weights", () => ({
  getSourceWeights: (...args: unknown[]) => mockGetSourceWeights(...args),
  setSourceWeight: (...args: unknown[]) => mockSetSourceWeight(...args),
  listAllSourceWeights: (...args: unknown[]) => mockListAllSourceWeights(...args),
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

import { GET, POST } from "@/app/api/platform/ai-auto-tuning/route";

describe("GET /api/platform/ai-auto-tuning", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyPlatformAdmin.mockResolvedValue({
      userId: "admin-1",
      email: "admin@test.com",
      name: "テスト管理者",
      platformRole: "platform_admin",
    });
  });

  it("認証失敗 → 401", async () => {
    mockVerifyPlatformAdmin.mockResolvedValue(null);
    const res = await GET(createReq("GET", "http://localhost/api/platform/ai-auto-tuning"));
    expect(res.status).toBe(401);
  });

  it("正常系（提案一覧）→ 200", async () => {
    const res = await GET(createReq("GET", "http://localhost/api/platform/ai-auto-tuning"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.suggestions).toBeDefined();
  });

  it("weights取得（tenant_id付き）→ 200", async () => {
    const res = await GET(createReq("GET", "http://localhost/api/platform/ai-auto-tuning?type=weights&tenant_id=t1&workflow_type=line-reply"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.weights).toBeDefined();
    expect(mockGetSourceWeights).toHaveBeenCalledWith("t1", "line-reply");
  });

  it("weights取得（tenant_idなし）→ 全件 200", async () => {
    const res = await GET(createReq("GET", "http://localhost/api/platform/ai-auto-tuning?type=weights"));
    expect(res.status).toBe(200);
    expect(mockListAllSourceWeights).toHaveBeenCalled();
  });
});

describe("POST /api/platform/ai-auto-tuning", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyPlatformAdmin.mockResolvedValue({
      userId: "admin-1",
      email: "admin@test.com",
      name: "テスト管理者",
      platformRole: "platform_admin",
    });
  });

  it("認証失敗 → 401", async () => {
    mockVerifyPlatformAdmin.mockResolvedValue(null);
    const res = await POST(createReq("POST", "http://localhost/api/platform/ai-auto-tuning", { action: "analyze" }));
    expect(res.status).toBe(401);
  });

  it("不正なJSON → 400", async () => {
    const req = new Request("http://localhost/api/platform/ai-auto-tuning", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "INVALID",
    });
    Object.assign(req, { nextUrl: new URL("http://localhost/api/platform/ai-auto-tuning") });
    const res = await POST(req as unknown as import("next/server").NextRequest);
    expect(res.status).toBe(400);
  });

  it("analyze: tenant_id未指定 → 400", async () => {
    const res = await POST(createReq("POST", "http://localhost/api/platform/ai-auto-tuning", { action: "analyze" }));
    expect(res.status).toBe(400);
  });

  it("analyze: 正常系 → 200", async () => {
    const res = await POST(createReq("POST", "http://localhost/api/platform/ai-auto-tuning", {
      action: "analyze",
      tenant_id: "t1",
      days: 14,
    }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.performance).toBeDefined();
    expect(json.suggestions).toBeDefined();
  });

  it("apply: suggestion_id未指定 → 400", async () => {
    const res = await POST(createReq("POST", "http://localhost/api/platform/ai-auto-tuning", { action: "apply" }));
    expect(res.status).toBe(400);
  });

  it("apply: 正常系 → 200", async () => {
    const res = await POST(createReq("POST", "http://localhost/api/platform/ai-auto-tuning", {
      action: "apply",
      suggestion_id: 1,
    }));
    expect(res.status).toBe(200);
  });

  it("reject: 正常系 → 200", async () => {
    const res = await POST(createReq("POST", "http://localhost/api/platform/ai-auto-tuning", {
      action: "reject",
      suggestion_id: 1,
    }));
    expect(res.status).toBe(200);
  });

  it("set_weight: パラメータ不足 → 400", async () => {
    const res = await POST(createReq("POST", "http://localhost/api/platform/ai-auto-tuning", {
      action: "set_weight",
      tenant_id: "t1",
    }));
    expect(res.status).toBe(400);
  });

  it("set_weight: 不正なweight値 → 400", async () => {
    const res = await POST(createReq("POST", "http://localhost/api/platform/ai-auto-tuning", {
      action: "set_weight",
      tenant_id: "t1",
      workflow_type: "line-reply",
      source_type: "example",
      weight: 5,
    }));
    expect(res.status).toBe(400);
  });

  it("set_weight: 正常系 → 200", async () => {
    const res = await POST(createReq("POST", "http://localhost/api/platform/ai-auto-tuning", {
      action: "set_weight",
      tenant_id: "t1",
      workflow_type: "line-reply",
      source_type: "example",
      weight: 1.5,
    }));
    expect(res.status).toBe(200);
  });

  it("不明なアクション → 400", async () => {
    const res = await POST(createReq("POST", "http://localhost/api/platform/ai-auto-tuning", {
      action: "unknown",
    }));
    expect(res.status).toBe(400);
  });
});
