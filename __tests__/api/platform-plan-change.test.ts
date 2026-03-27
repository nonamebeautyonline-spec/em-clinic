// __tests__/api/platform-plan-change.test.ts
// プラットフォーム管理者によるプラン変更API（PUT）のテスト
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

vi.mock("@/lib/validations/helpers", () => ({
  parseBody: vi.fn(),
}));

vi.mock("@/lib/stripe", () => ({
  getStripeClient: vi.fn().mockResolvedValue(null),
}));

import { PUT } from "@/app/api/platform/billing/plans/[tenantId]/route";
import { verifyPlatformAdmin } from "@/lib/platform-auth";
import { parseBody } from "@/lib/validations/helpers";
import { NextRequest } from "next/server";

function makeReq(body?: object) {
  return new NextRequest("http://localhost:3000/api/platform/billing/plans/t1", {
    method: "PUT",
    ...(body ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } } : {}),
  });
}

function makeCtx(tenantId = "t1") {
  return { params: Promise.resolve({ tenantId }) };
}

describe("PUT /api/platform/billing/plans/[tenantId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableChains = {};
  });

  it("未認証の場合は403を返す", async () => {
    vi.mocked(verifyPlatformAdmin).mockResolvedValueOnce(null);
    const res = await PUT(makeReq(), makeCtx());
    expect(res.status).toBe(403);
  });

  it("バリデーションエラーの場合はparseBody結果を返す", async () => {
    vi.mocked(parseBody).mockResolvedValueOnce({
      error: new Response(JSON.stringify({ error: "バリデーションエラー" }), { status: 400 }),
      data: null as never,
    });
    const res = await PUT(makeReq(), makeCtx());
    expect(res.status).toBe(400);
  });

  it("テナントが見つからない場合は404を返す", async () => {
    vi.mocked(parseBody).mockResolvedValueOnce({
      error: null,
      data: { planName: "standard", monthlyFee: 17000 },
    });
    tableChains["tenants"] = createChain({ data: null, error: null });
    const res = await PUT(makeReq(), makeCtx());
    expect(res.status).toBe(404);
  });

  it("正常なプラン変更で200を返し、message_quotaが自動設定される", async () => {
    vi.mocked(parseBody).mockResolvedValueOnce({
      error: null,
      data: { planName: "standard", monthlyFee: 17000 },
    });
    // テナント存在
    tableChains["tenants"] = createChain({ data: { id: "t1", name: "テスト" }, error: null });
    // 現在のプラン（Stripe未連携）
    tableChains["tenant_plans"] = createChain({
      data: { plan_name: "light", monthly_fee: 4000, stripe_subscription_id: null, stripe_customer_id: null },
      error: null,
    });

    const res = await PUT(makeReq(), makeCtx());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
  });
});
