// __tests__/api/platform-ai-governance.test.ts
// AIガバナンスAPI (app/api/platform/ai-governance/route.ts) のテスト
import { describe, it, expect, vi, beforeEach } from "vitest";

process.env.JWT_SECRET = "test-jwt-secret";

const mockVerifyPlatformAdmin = vi.fn();

vi.mock("@/lib/platform-auth", () => ({
  verifyPlatformAdmin: (...args: unknown[]) => mockVerifyPlatformAdmin(...args),
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(),
}));

const mockListChangeRequests = vi.fn().mockResolvedValue([]);
const mockCreateChangeRequest = vi.fn().mockResolvedValue({ id: 1, status: "pending" });
const mockApproveChangeRequest = vi.fn().mockResolvedValue({ id: 1, status: "approved" });
const mockRejectChangeRequest = vi.fn().mockResolvedValue({ id: 1, status: "rejected" });
const mockApplyChangeRequest = vi.fn().mockResolvedValue({ id: 1, status: "applied" });

vi.mock("@/lib/ai-change-approval", () => ({
  listChangeRequests: (...args: unknown[]) => mockListChangeRequests(...args),
  createChangeRequest: (...args: unknown[]) => mockCreateChangeRequest(...args),
  approveChangeRequest: (...args: unknown[]) => mockApproveChangeRequest(...args),
  rejectChangeRequest: (...args: unknown[]) => mockRejectChangeRequest(...args),
  applyChangeRequest: (...args: unknown[]) => mockApplyChangeRequest(...args),
}));

const mockGetConfigVersions = vi.fn().mockResolvedValue([]);
const mockRollbackConfig = vi.fn().mockResolvedValue({ id: 1, version: 1 });

vi.mock("@/lib/ai-config-versioning", () => ({
  getConfigVersions: (...args: unknown[]) => mockGetConfigVersions(...args),
  rollbackConfig: (...args: unknown[]) => mockRollbackConfig(...args),
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

import { GET, POST } from "@/app/api/platform/ai-governance/route";

describe("GET /api/platform/ai-governance", () => {
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
    const res = await GET(createReq("GET", "http://localhost/api/platform/ai-governance"));
    expect(res.status).toBe(401);
  });

  it("正常系（変更リクエスト一覧）→ 200", async () => {
    const res = await GET(createReq("GET", "http://localhost/api/platform/ai-governance"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.changes).toBeDefined();
  });

  it("バージョン一覧: config_type未指定 → 400", async () => {
    const res = await GET(createReq("GET", "http://localhost/api/platform/ai-governance?view=versions"));
    expect(res.status).toBe(400);
  });

  it("バージョン一覧: 正常系 → 200", async () => {
    const res = await GET(createReq("GET", "http://localhost/api/platform/ai-governance?view=versions&config_type=prompt"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.versions).toBeDefined();
  });
});

describe("POST /api/platform/ai-governance", () => {
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
    const res = await POST(createReq("POST", "http://localhost/api/platform/ai-governance", { action: "create" }));
    expect(res.status).toBe(401);
  });

  it("action未指定 → 400", async () => {
    const res = await POST(createReq("POST", "http://localhost/api/platform/ai-governance", {}));
    expect(res.status).toBe(400);
  });

  it("create: 必須パラメータ不足 → 400", async () => {
    const res = await POST(createReq("POST", "http://localhost/api/platform/ai-governance", {
      action: "create",
      config_type: "prompt",
    }));
    expect(res.status).toBe(400);
  });

  it("create: 正常系 → 200", async () => {
    const res = await POST(createReq("POST", "http://localhost/api/platform/ai-governance", {
      action: "create",
      config_type: "prompt",
      description: "プロンプト変更",
      diff: { before: "old", after: "new" },
    }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.change_request).toBeDefined();
  });

  it("approve: request_id未指定 → 400", async () => {
    const res = await POST(createReq("POST", "http://localhost/api/platform/ai-governance", {
      action: "approve",
    }));
    expect(res.status).toBe(400);
  });

  it("approve: 正常系 → 200", async () => {
    const res = await POST(createReq("POST", "http://localhost/api/platform/ai-governance", {
      action: "approve",
      request_id: 1,
    }));
    expect(res.status).toBe(200);
  });

  it("rollback: パラメータ不足 → 400", async () => {
    const res = await POST(createReq("POST", "http://localhost/api/platform/ai-governance", {
      action: "rollback",
      config_type: "prompt",
    }));
    expect(res.status).toBe(400);
  });

  it("不明なaction → 400", async () => {
    const res = await POST(createReq("POST", "http://localhost/api/platform/ai-governance", {
      action: "unknown",
    }));
    expect(res.status).toBe(400);
  });
});
