// __tests__/api/booking-open.test.ts
// 予約早期開放API（GET/POST/DELETE）テスト
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Supabase チェーンモック ---
function createChain(defaultResolve = { data: null, error: null }) {
  const chain: any = {};
  ["insert", "update", "delete", "select", "eq", "neq", "gt", "gte", "lt", "lte",
    "in", "is", "not", "order", "limit", "range", "single", "maybeSingle", "upsert",
    "ilike", "or", "count", "csv"].forEach(m => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.then = vi.fn((resolve: any) => resolve(defaultResolve));
  return chain;
}

let tableChains: Record<string, any> = {};
function getOrCreateChain(table: string) {
  if (!tableChains[table]) tableChains[table] = createChain();
  return tableChains[table];
}

// booking-open/route.ts は createClient で独自にクライアントを作成するため、
// @supabase/supabase-js をモックして from を差し替える
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn((table: string) => getOrCreateChain(table)),
  })),
}));

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: { from: vi.fn((table: string) => getOrCreateChain(table)) },
}));

const mockVerifyAdminAuth = vi.fn();
vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: (...args: any[]) => mockVerifyAdminAuth(...args),
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  withTenant: vi.fn((q: any) => q),
  tenantPayload: vi.fn(() => ({ tenant_id: "test-tenant" })),
}));

// --- リクエスト生成ヘルパー ---
function createMockRequest(method: string, url: string, body?: any) {
  const req = new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  // nextUrl を模倣
  (req as any).nextUrl = new URL(url);
  return req as any;
}

import { GET, POST, DELETE } from "@/app/api/admin/booking-open/route";

describe("予約早期開放 API - GET", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableChains = {};
    mockVerifyAdminAuth.mockResolvedValue(true);
  });

  it("認証なし → 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const req = createMockRequest("GET", "http://localhost/api/admin/booking-open?month=2026-03");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("月形式不正 → 400", async () => {
    const req = createMockRequest("GET", "http://localhost/api/admin/booking-open?month=2026-3");
    const res = await GET(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Invalid month format");
  });

  it("monthパラメータなし → 400", async () => {
    const req = createMockRequest("GET", "http://localhost/api/admin/booking-open");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("レコードあり → is_open=true を返す", async () => {
    const chain = getOrCreateChain("booking_open_settings");
    chain.then = vi.fn((resolve: any) => resolve({
      data: { is_open: true, opened_at: "2026-02-20T00:00:00Z" },
      error: null,
    }));

    const req = createMockRequest("GET", "http://localhost/api/admin/booking-open?month=2026-03");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.month).toBe("2026-03");
    expect(json.is_open).toBe(true);
    expect(json.opened_at).toBe("2026-02-20T00:00:00Z");
  });

  it("レコードなし（PGRST116）→ is_open=false を返す", async () => {
    const chain = getOrCreateChain("booking_open_settings");
    chain.then = vi.fn((resolve: any) => resolve({
      data: null,
      error: { code: "PGRST116", message: "no rows" },
    }));

    const req = createMockRequest("GET", "http://localhost/api/admin/booking-open?month=2026-03");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.is_open).toBe(false);
    expect(json.opened_at).toBeNull();
  });

  it("DBエラー（PGRST116以外）→ 500", async () => {
    const chain = getOrCreateChain("booking_open_settings");
    chain.then = vi.fn((resolve: any) => resolve({
      data: null,
      error: { code: "XXXXX", message: "DB connection failed" },
    }));

    const req = createMockRequest("GET", "http://localhost/api/admin/booking-open?month=2026-03");
    const res = await GET(req);
    expect(res.status).toBe(500);
  });
});

describe("予約早期開放 API - POST", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableChains = {};
    mockVerifyAdminAuth.mockResolvedValue(true);
  });

  it("認証なし → 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const req = createMockRequest("POST", "http://localhost/api/admin/booking-open", {
      month: "2026-03",
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("月形式不正 → 400", async () => {
    const req = createMockRequest("POST", "http://localhost/api/admin/booking-open", {
      month: "invalid",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("正常に開放 → 200 + メッセージ", async () => {
    const chain = getOrCreateChain("booking_open_settings");
    chain.then = vi.fn((resolve: any) => resolve({
      data: { target_month: "2026-03", is_open: true },
      error: null,
    }));

    const req = createMockRequest("POST", "http://localhost/api/admin/booking-open", {
      month: "2026-03",
      memo: "テスト開放",
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.message).toContain("2026-03");
  });

  it("DBエラー → 500", async () => {
    const chain = getOrCreateChain("booking_open_settings");
    chain.then = vi.fn((resolve: any) => resolve({
      data: null,
      error: { message: "Upsert failed" },
    }));

    const req = createMockRequest("POST", "http://localhost/api/admin/booking-open", {
      month: "2026-03",
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});

describe("予約早期開放 API - DELETE", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableChains = {};
    mockVerifyAdminAuth.mockResolvedValue(true);
  });

  it("認証なし → 401", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const req = createMockRequest("DELETE", "http://localhost/api/admin/booking-open?month=2026-03");
    const res = await DELETE(req);
    expect(res.status).toBe(401);
  });

  it("月形式不正 → 400", async () => {
    const req = createMockRequest("DELETE", "http://localhost/api/admin/booking-open?month=abc");
    const res = await DELETE(req);
    expect(res.status).toBe(400);
  });

  it("正常に取消 → 200", async () => {
    const chain = getOrCreateChain("booking_open_settings");
    chain.then = vi.fn((resolve: any) => resolve({ data: null, error: null }));

    const req = createMockRequest("DELETE", "http://localhost/api/admin/booking-open?month=2026-03");
    const res = await DELETE(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.message).toContain("2026-03");
  });

  it("DBエラー → 500", async () => {
    const chain = getOrCreateChain("booking_open_settings");
    chain.then = vi.fn((resolve: any) => resolve({
      data: null,
      error: { message: "Delete failed" },
    }));

    const req = createMockRequest("DELETE", "http://localhost/api/admin/booking-open?month=2026-03");
    const res = await DELETE(req);
    expect(res.status).toBe(500);
  });
});
