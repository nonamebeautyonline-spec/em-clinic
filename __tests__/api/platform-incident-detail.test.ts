// __tests__/api/platform-incident-detail.test.ts
// インシデント管理API (app/api/platform/incidents/[incidentId]/route.ts) のテスト
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

function createCtx(incidentId: string) {
  return { params: Promise.resolve({ incidentId }) };
}

import { GET, PUT, DELETE } from "@/app/api/platform/incidents/[incidentId]/route";

describe("GET /api/platform/incidents/[incidentId]", () => {
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

  it("認証失敗 → 403", async () => {
    mockVerifyPlatformAdmin.mockResolvedValue(null);
    const res = await GET(
      createReq("GET", "http://localhost/api/platform/incidents/inc1"),
      createCtx("inc1"),
    );
    expect(res.status).toBe(403);
  });

  it("インシデント未発見 → 404", async () => {
    tableChains["incidents"] = createChain({ data: null, error: { message: "not found" } });
    const res = await GET(
      createReq("GET", "http://localhost/api/platform/incidents/inc1"),
      createCtx("inc1"),
    );
    expect(res.status).toBe(404);
  });

  it("正常系 → インシデント詳細を返す", async () => {
    tableChains["incidents"] = createChain({
      data: { id: "inc1", title: "テスト障害", severity: "major", status: "investigating" },
      error: null,
    });
    const res = await GET(
      createReq("GET", "http://localhost/api/platform/incidents/inc1"),
      createCtx("inc1"),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.incident.title).toBe("テスト障害");
  });
});

describe("PUT /api/platform/incidents/[incidentId]", () => {
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

  it("認証失敗 → 403", async () => {
    mockVerifyPlatformAdmin.mockResolvedValue(null);
    const res = await PUT(
      createReq("PUT", "http://localhost/api/platform/incidents/inc1", { status: "resolved" }),
      createCtx("inc1"),
    );
    expect(res.status).toBe(403);
  });

  it("不正なJSON → 400", async () => {
    const req = new Request("http://localhost/api/platform/incidents/inc1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: "INVALID",
    });
    Object.assign(req, { nextUrl: new URL("http://localhost/api/platform/incidents/inc1") });
    const res = await PUT(
      req as unknown as import("next/server").NextRequest,
      createCtx("inc1"),
    );
    expect(res.status).toBe(400);
  });

  it("不正なseverity → 400", async () => {
    const res = await PUT(
      createReq("PUT", "http://localhost/api/platform/incidents/inc1", { severity: "invalid" }),
      createCtx("inc1"),
    );
    expect(res.status).toBe(400);
  });

  it("不正なstatus → 400", async () => {
    const res = await PUT(
      createReq("PUT", "http://localhost/api/platform/incidents/inc1", { status: "invalid" }),
      createCtx("inc1"),
    );
    expect(res.status).toBe(400);
  });

  it("更新フィールドなし → 400", async () => {
    tableChains["incidents"] = createChain({
      data: { id: "inc1", title: "テスト障害", severity: "major", status: "investigating", resolved_at: null },
      error: null,
    });
    const res = await PUT(
      createReq("PUT", "http://localhost/api/platform/incidents/inc1", {}),
      createCtx("inc1"),
    );
    expect(res.status).toBe(400);
  });

  it("正常系（resolved） → 200 + resolved_at設定", async () => {
    // 既存レコード取得
    tableChains["incidents"] = createChain({
      data: { id: "inc1", title: "テスト障害", severity: "major", status: "investigating", resolved_at: null },
      error: null,
    });

    const res = await PUT(
      createReq("PUT", "http://localhost/api/platform/incidents/inc1", { status: "resolved" }),
      createCtx("inc1"),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("インシデント未発見 → 404", async () => {
    tableChains["incidents"] = createChain({ data: null, error: { message: "not found" } });
    const res = await PUT(
      createReq("PUT", "http://localhost/api/platform/incidents/inc1", { status: "resolved" }),
      createCtx("inc1"),
    );
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/platform/incidents/[incidentId]", () => {
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

  it("認証失敗 → 403", async () => {
    mockVerifyPlatformAdmin.mockResolvedValue(null);
    const res = await DELETE(
      createReq("DELETE", "http://localhost/api/platform/incidents/inc1"),
      createCtx("inc1"),
    );
    expect(res.status).toBe(403);
  });

  it("正常系 → 200", async () => {
    tableChains["incidents"] = createChain({ data: null, error: null });
    const res = await DELETE(
      createReq("DELETE", "http://localhost/api/platform/incidents/inc1"),
      createCtx("inc1"),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("DBエラー → 500", async () => {
    tableChains["incidents"] = createChain({ data: null, error: { message: "delete failed" } });
    const res = await DELETE(
      createReq("DELETE", "http://localhost/api/platform/incidents/inc1"),
      createCtx("inc1"),
    );
    expect(res.status).toBe(500);
  });
});
