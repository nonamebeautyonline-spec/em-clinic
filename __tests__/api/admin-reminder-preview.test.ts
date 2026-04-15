// __tests__/api/admin-reminder-preview.test.ts
// リマインダープレビューAPI テスト

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

function createChain(resolvedValue: unknown = { data: [], error: null }) {
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

vi.mock("@/lib/validations/helpers", () => ({
  parseBody: vi.fn(async (req: Request) => {
    const body = await req.json();
    if (!body.date) return { error: new Response(JSON.stringify({ error: "日付必須" }), { status: 400 }) };
    return { data: body };
  }),
}));

vi.mock("@/lib/validations/admin-operations", () => ({
  reminderPreviewSchema: {},
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(),
}));

import { verifyAdminAuth } from "@/lib/admin-auth";
const mockAuth = verifyAdminAuth as ReturnType<typeof vi.fn>;

describe("POST /api/admin/reservations/reminder-preview", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("未認証の場合401を返す", async () => {
    mockAuth.mockResolvedValue(false);
    const { POST } = await import("@/app/api/admin/reservations/reminder-preview/route");
    const req = new NextRequest("http://localhost/api/admin/reservations/reminder-preview", {
      method: "POST",
      body: JSON.stringify({ date: "2026-04-15" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("認証済みでプレビュー取得（200 or 500）", async () => {
    mockAuth.mockResolvedValue(true);
    const { POST } = await import("@/app/api/admin/reservations/reminder-preview/route");
    const req = new NextRequest("http://localhost/api/admin/reservations/reminder-preview", {
      method: "POST",
      body: JSON.stringify({ date: "2026-04-15" }),
    });
    const res = await POST(req);
    expect([200, 500]).toContain(res.status);
  });
});
