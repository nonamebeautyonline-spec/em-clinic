// __tests__/api/platform-billing-actions.test.ts
// 課金アクションAPI (app/api/platform/billing/actions/route.ts) のテスト
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

function createReq(body?: unknown) {
  const req = new Request("http://localhost/api/platform/billing/actions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  Object.assign(req, { nextUrl: new URL("http://localhost/api/platform/billing/actions") });
  return req as unknown as import("next/server").NextRequest;
}

import { POST } from "@/app/api/platform/billing/actions/route";

describe("POST /api/platform/billing/actions", () => {
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
    const res = await POST(createReq({ action: "apply_credit", tenantId: "t1" }));
    expect(res.status).toBe(403);
  });

  it("不正なJSON → 400", async () => {
    const req = new Request("http://localhost/api/platform/billing/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "INVALID",
    });
    Object.assign(req, { nextUrl: new URL("http://localhost/api/platform/billing/actions") });
    const res = await POST(req as unknown as import("next/server").NextRequest);
    expect(res.status).toBe(400);
  });

  it("tenantId未指定 → 400", async () => {
    const res = await POST(createReq({ action: "apply_credit" }));
    expect(res.status).toBe(400);
  });

  it("テナント未発見 → 404", async () => {
    tableChains["tenants"] = createChain({ data: null, error: null });
    const res = await POST(createReq({ action: "apply_credit", tenantId: "t1", amount: 1000 }));
    expect(res.status).toBe(404);
  });

  it("apply_credit: 金額未指定 → 400", async () => {
    tableChains["tenants"] = createChain({
      data: { id: "t1", name: "テスト", is_active: true, suspended_at: null },
      error: null,
    });
    const res = await POST(createReq({ action: "apply_credit", tenantId: "t1" }));
    expect(res.status).toBe(400);
  });

  it("apply_credit: 正常系 → 200", async () => {
    tableChains["tenants"] = createChain({
      data: { id: "t1", name: "テスト", is_active: true, suspended_at: null },
      error: null,
    });
    // billing_credits INSERT成功
    tableChains["billing_credits"] = createChain({ data: null, error: null });

    const res = await POST(createReq({ action: "apply_credit", tenantId: "t1", amount: 5000, reason: "テスト" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("hold_billing: 正常系 → 200", async () => {
    tableChains["tenants"] = createChain({
      data: { id: "t1", name: "テスト", is_active: true, suspended_at: null },
      error: null,
    });
    tableChains["tenant_plans"] = createChain({ data: null, error: null });

    const res = await POST(createReq({ action: "hold_billing", tenantId: "t1", reason: "確認中" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("resume_billing: 正常系 → 200", async () => {
    tableChains["tenants"] = createChain({
      data: { id: "t1", name: "テスト", is_active: true, suspended_at: null },
      error: null,
    });
    tableChains["tenant_plans"] = createChain({ data: null, error: null });

    const res = await POST(createReq({ action: "resume_billing", tenantId: "t1" }));
    expect(res.status).toBe(200);
  });

  it("add_memo: メモ未指定 → 400", async () => {
    tableChains["tenants"] = createChain({
      data: { id: "t1", name: "テスト", is_active: true, suspended_at: null },
      error: null,
    });
    const res = await POST(createReq({ action: "add_memo", tenantId: "t1" }));
    expect(res.status).toBe(400);
  });

  it("suspend_tenant: 正常系 → 200", async () => {
    tableChains["tenants"] = createChain({
      data: { id: "t1", name: "テスト", is_active: true, suspended_at: null },
      error: null,
    });
    const res = await POST(createReq({ action: "suspend_tenant", tenantId: "t1", reason: "未払い" }));
    expect(res.status).toBe(200);
  });

  it("apply_discount: 不正な割引率 → 400", async () => {
    tableChains["tenants"] = createChain({
      data: { id: "t1", name: "テスト", is_active: true, suspended_at: null },
      error: null,
    });
    const res = await POST(createReq({ action: "apply_discount", tenantId: "t1", discountPercent: 150 }));
    expect(res.status).toBe(400);
  });

  it("不明なアクション → 400", async () => {
    tableChains["tenants"] = createChain({
      data: { id: "t1", name: "テスト", is_active: true, suspended_at: null },
      error: null,
    });
    const res = await POST(createReq({ action: "unknown_action", tenantId: "t1" }));
    expect(res.status).toBe(400);
  });
});
