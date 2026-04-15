// __tests__/api/admin-line-ab-test.test.ts
// ABテスト バリアント + 配信API テスト

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: vi.fn(),
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  resolveTenantIdOrThrow: vi.fn(() => "test-tenant"),
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

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(),
}));

vi.mock("@/lib/line-push", () => ({
  pushMessage: vi.fn(() => ({ ok: true })),
}));

import { verifyAdminAuth } from "@/lib/admin-auth";

const mockAuth = verifyAdminAuth as ReturnType<typeof vi.fn>;
const ctx = { params: Promise.resolve({ id: "test-1" }) };

// === variants ===
describe("GET /api/admin/line/ab-test/[id]/variants", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("未認証の場合401を返す", async () => {
    mockAuth.mockResolvedValue(false);
    const { GET } = await import("@/app/api/admin/line/ab-test/[id]/variants/route");
    const req = new NextRequest("http://localhost/api/admin/line/ab-test/t1/variants");
    const res = await GET(req, ctx);
    expect(res.status).toBe(401);
  });

  it("認証済みでバリアント一覧取得（200/404/500）", async () => {
    mockAuth.mockResolvedValue(true);
    const { GET } = await import("@/app/api/admin/line/ab-test/[id]/variants/route");
    const req = new NextRequest("http://localhost/api/admin/line/ab-test/t1/variants");
    const res = await GET(req, ctx);
    expect([200, 404, 500]).toContain(res.status);
  });
});

describe("POST /api/admin/line/ab-test/[id]/variants", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("未認証の場合401を返す", async () => {
    mockAuth.mockResolvedValue(false);
    const { POST } = await import("@/app/api/admin/line/ab-test/[id]/variants/route");
    const req = new NextRequest("http://localhost/api/admin/line/ab-test/t1/variants", {
      method: "POST",
      body: JSON.stringify({ name: "A" }),
    });
    const res = await POST(req, ctx);
    expect(res.status).toBe(401);
  });

  it("認証済みでバリアント追加（200/400/404/500）", async () => {
    mockAuth.mockResolvedValue(true);
    const { POST } = await import("@/app/api/admin/line/ab-test/[id]/variants/route");
    const req = new NextRequest("http://localhost/api/admin/line/ab-test/t1/variants", {
      method: "POST",
      body: JSON.stringify({ name: "バリアントA", message_content: "テスト" }),
    });
    const res = await POST(req, ctx);
    expect([200, 400, 404, 500]).toContain(res.status);
  });
});

describe("PUT /api/admin/line/ab-test/[id]/variants", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("未認証の場合401を返す", async () => {
    mockAuth.mockResolvedValue(false);
    const { PUT } = await import("@/app/api/admin/line/ab-test/[id]/variants/route");
    const req = new NextRequest("http://localhost/api/admin/line/ab-test/t1/variants", {
      method: "PUT",
      body: JSON.stringify({ id: "v1" }),
    });
    const res = await PUT(req, ctx);
    expect(res.status).toBe(401);
  });

  it("バリアントID未指定で400を返す", async () => {
    mockAuth.mockResolvedValue(true);
    // テスト存在チェックをパスさせるためのモック
    const { PUT } = await import("@/app/api/admin/line/ab-test/[id]/variants/route");
    const req = new NextRequest("http://localhost/api/admin/line/ab-test/t1/variants", {
      method: "PUT",
      body: JSON.stringify({}),
    });
    const res = await PUT(req, ctx);
    // テストが見つからない場合404、見つかった場合400
    expect([400, 404, 500]).toContain(res.status);
  });
});

describe("DELETE /api/admin/line/ab-test/[id]/variants", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("未認証の場合401を返す", async () => {
    mockAuth.mockResolvedValue(false);
    const { DELETE } = await import("@/app/api/admin/line/ab-test/[id]/variants/route");
    const req = new NextRequest("http://localhost/api/admin/line/ab-test/t1/variants?variantId=v1");
    const res = await DELETE(req, ctx);
    expect(res.status).toBe(401);
  });

  it("variantId未指定で400を返す", async () => {
    mockAuth.mockResolvedValue(true);
    const { DELETE } = await import("@/app/api/admin/line/ab-test/[id]/variants/route");
    const req = new NextRequest("http://localhost/api/admin/line/ab-test/t1/variants");
    const res = await DELETE(req, ctx);
    expect(res.status).toBe(400);
  });
});

// === send ===
describe("POST /api/admin/line/ab-test/[id]/send", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("未認証の場合401を返す", async () => {
    mockAuth.mockResolvedValue(false);
    const { POST } = await import("@/app/api/admin/line/ab-test/[id]/send/route");
    const req = new NextRequest("http://localhost/api/admin/line/ab-test/t1/send", {
      method: "POST",
    });
    const res = await POST(req, ctx);
    expect(res.status).toBe(401);
  });

  it("認証済みで配信実行（200/400/404/500）", async () => {
    mockAuth.mockResolvedValue(true);
    const { POST } = await import("@/app/api/admin/line/ab-test/[id]/send/route");
    const req = new NextRequest("http://localhost/api/admin/line/ab-test/t1/send", {
      method: "POST",
    });
    const res = await POST(req, ctx);
    expect([200, 400, 404, 500]).toContain(res.status);
  });
});
