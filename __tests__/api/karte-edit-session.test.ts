import { describe, it, expect, vi, beforeEach } from "vitest";

// モック
const mockFrom = vi.fn();
vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));
vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: vi.fn(() => true),
}));
vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => null),
  withTenant: vi.fn((query: unknown) => query),
  tenantPayload: vi.fn(() => ({ tenant_id: "00000000-0000-0000-0000-000000000001" })),
}));

import { GET, POST, PUT, DELETE as DEL } from "@/app/api/admin/karte-edit-session/route";
import { NextRequest } from "next/server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createChainMock(resolvedValue: any = { data: null, error: null }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: Record<string, any> = {};
  const methods = ["select", "insert", "update", "delete", "eq", "neq", "gte", "order", "limit"];
  methods.forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.single = vi.fn().mockResolvedValue(resolvedValue);
  chain.then = (resolve: (v: unknown) => unknown) => Promise.resolve(resolvedValue).then(resolve);
  return chain;
}

describe("GET /api/admin/karte-edit-session", () => {
  beforeEach(() => vi.clearAllMocks());

  it("intakeId未指定で400", async () => {
    const req = new NextRequest("http://localhost/api/admin/karte-edit-session");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("編集中セッション一覧を取得できる", async () => {
    const sessions = [
      { id: 1, intake_id: 10, editor_name: "田中", last_heartbeat: new Date().toISOString(), created_at: new Date().toISOString() },
    ];
    const chain = createChainMock({ data: sessions, error: null });
    mockFrom.mockReturnValue(chain);

    const req = new NextRequest("http://localhost/api/admin/karte-edit-session?intakeId=10");
    const res = await GET(req);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.sessions).toHaveLength(1);
    expect(json.sessions[0].editor_name).toBe("田中");
  });
});

describe("POST /api/admin/karte-edit-session", () => {
  beforeEach(() => vi.clearAllMocks());

  it("セッション開始が成功する", async () => {
    const chain = createChainMock({ data: { id: 42 }, error: null });
    mockFrom.mockReturnValue(chain);

    const req = new NextRequest("http://localhost/api/admin/karte-edit-session", {
      method: "POST",
      body: JSON.stringify({ intakeId: 10, editorName: "管理者A" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    const json = await res!.json();
    expect(json.ok).toBe(true);
    expect(json.sessionId).toBe(42);
  });

  it("editorName未指定で400", async () => {
    const req = new NextRequest("http://localhost/api/admin/karte-edit-session", {
      method: "POST",
      body: JSON.stringify({ intakeId: 10 }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res!.status).toBe(400);
  });
});

describe("PUT /api/admin/karte-edit-session", () => {
  beforeEach(() => vi.clearAllMocks());

  it("ハートビート更新が成功する", async () => {
    const chain = createChainMock({ data: null, error: null });
    mockFrom.mockReturnValue(chain);

    const req = new NextRequest("http://localhost/api/admin/karte-edit-session", {
      method: "PUT",
      body: JSON.stringify({ sessionId: 42 }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await PUT(req);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("sessionId未指定で400", async () => {
    const req = new NextRequest("http://localhost/api/admin/karte-edit-session", {
      method: "PUT",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });
    const res = await PUT(req);
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/admin/karte-edit-session", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sessionIdでセッション削除できる", async () => {
    const chain = createChainMock({ data: null, error: null });
    mockFrom.mockReturnValue(chain);

    const req = new NextRequest("http://localhost/api/admin/karte-edit-session?sessionId=42", {
      method: "DELETE",
    });
    const res = await DEL(req);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("intakeId+editorNameでセッション削除できる", async () => {
    const chain = createChainMock({ data: null, error: null });
    mockFrom.mockReturnValue(chain);

    const req = new NextRequest("http://localhost/api/admin/karte-edit-session?intakeId=10&editorName=%E7%AE%A1%E7%90%86%E8%80%85A", {
      method: "DELETE",
    });
    const res = await DEL(req);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("パラメータ不足で400", async () => {
    const req = new NextRequest("http://localhost/api/admin/karte-edit-session", {
      method: "DELETE",
    });
    const res = await DEL(req);
    expect(res.status).toBe(400);
  });
});
