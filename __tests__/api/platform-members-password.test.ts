// __tests__/api/platform-members-password.test.ts
// メンバーパスワードリセット（PATCH）のテスト
import { describe, it, expect, vi, beforeEach } from "vitest";

// ===== チェーンモック =====
function createChain(defaultResolve = { data: null, error: null }) {
  const chain: Record<string, unknown> = {};
  ["insert","update","delete","select","eq","neq","gt","gte","lt","lte",
   "in","is","not","order","limit","range","single","maybeSingle","upsert",
   "ilike","or","count","csv"].forEach(m => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.then = vi.fn((resolve: (value: unknown) => unknown) => resolve(defaultResolve));
  return chain;
}

let tableChains: Record<string, ReturnType<typeof createChain>> = {};
function getOrCreateChain(table: string) {
  if (!tableChains[table]) tableChains[table] = createChain();
  return tableChains[table];
}

// ===== モック =====
vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: { from: vi.fn((table: string) => getOrCreateChain(table)) },
}));

vi.mock("@/lib/platform-auth", () => ({
  verifyPlatformAdmin: vi.fn().mockResolvedValue({
    userId: "admin-1",
    email: "admin@example.com",
    name: "管理者",
    tenantId: null,
    platformRole: "platform_admin",
  }),
}));

vi.mock("@/lib/audit", () => ({ logAudit: vi.fn() }));

vi.mock("bcryptjs", () => ({
  default: { hash: vi.fn().mockResolvedValue("hashed-pw-123") },
}));

import { PATCH } from "@/app/api/platform/tenants/[tenantId]/members/[memberId]/route";
import { verifyPlatformAdmin } from "@/lib/platform-auth";
import { NextRequest } from "next/server";

function makeReq(body: object) {
  return new NextRequest(
    "http://localhost:3000/api/platform/tenants/t1/members/m1",
    { method: "PATCH", body: JSON.stringify(body), headers: { "content-type": "application/json" } },
  );
}

function makeCtx(tenantId = "t1", memberId = "m1") {
  return { params: Promise.resolve({ tenantId, memberId }) };
}

describe("PATCH /api/platform/tenants/[tenantId]/members/[memberId] (パスワードリセット)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableChains = {};
  });

  it("未認証の場合は403を返す", async () => {
    vi.mocked(verifyPlatformAdmin).mockResolvedValueOnce(null);
    const res = await PATCH(makeReq({ newPassword: "newpass123" }), makeCtx());
    expect(res.status).toBe(403);
  });

  it("パスワードが短すぎる場合は400を返す", async () => {
    const res = await PATCH(makeReq({ newPassword: "short" }), makeCtx());
    expect(res.status).toBe(400);
  });

  it("パスワード未指定の場合は400を返す", async () => {
    const res = await PATCH(makeReq({}), makeCtx());
    expect(res.status).toBe(400);
  });

  it("メンバーが見つからない場合は404を返す", async () => {
    // tenant_members の single() が null を返す
    tableChains["tenant_members"] = createChain({ data: null, error: null });
    const res = await PATCH(makeReq({ newPassword: "validpass123" }), makeCtx());
    expect(res.status).toBe(404);
  });

  it("正常なリクエストで200を返す", async () => {
    // メンバー存在
    tableChains["tenant_members"] = createChain({
      data: {
        id: "m1",
        admin_user_id: "au-1",
        admin_users: { id: "au-1", name: "テスト", email: "test@example.com" },
      },
      error: null,
    });
    // admin_users の update 成功
    tableChains["admin_users"] = createChain({ data: null, error: null });
    // password_history の insert
    tableChains["password_history"] = createChain({ data: null, error: null });

    const res = await PATCH(makeReq({ newPassword: "validpass123" }), makeCtx());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
  });
});
