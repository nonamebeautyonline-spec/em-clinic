// __tests__/api/subscription-plans.test.ts
// 定期請求プランCRUD API テスト
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- チェーンビルダー ---
function createChain(defaultResolve: Record<string, unknown> = { data: null, error: null }) {
  const chain: Record<string, unknown> = {};
  ["insert","update","delete","select","eq","neq","gt","gte","lt","lte",
   "in","is","not","or","order","limit","range","single","maybeSingle","upsert",
   "ilike","count","csv"].forEach(m => {
    (chain as Record<string, ReturnType<typeof vi.fn>>)[m] = vi.fn().mockReturnValue(chain);
  });
  chain.then = vi.fn((resolve: (v: unknown) => void) => resolve(defaultResolve));
  return chain;
}

let tableChains: Record<string, Record<string, unknown>> = {};
function getOrCreateChain(table: string) {
  if (!tableChains[table]) tableChains[table] = createChain();
  return tableChains[table];
}

const { mockVerifyAdminAuth } = vi.hoisted(() => ({
  mockVerifyAdminAuth: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: { from: vi.fn((table: string) => getOrCreateChain(table)) },
}));
vi.mock("@/lib/admin-auth", () => ({ verifyAdminAuth: mockVerifyAdminAuth }));
vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  resolveTenantIdOrThrow: vi.fn(() => "test-tenant"),
  withTenant: vi.fn((q: unknown) => q),
  strictWithTenant: vi.fn((q: unknown) => q),
  tenantPayload: vi.fn(() => ({ tenant_id: "test-tenant" })),
}));
vi.mock("@/lib/audit", () => ({ logAudit: vi.fn() }));
vi.mock("@/lib/validations/helpers", async () => {
  const actual = await vi.importActual("@/lib/validations/helpers");
  return actual;
});

function createReq(method: string, url: string, body?: unknown) {
  const init: RequestInit = { method, headers: { "Content-Type": "application/json" } };
  if (body) init.body = JSON.stringify(body);
  return new Request(url, init);
}

import { GET, POST, PUT, DELETE as DELETE_FN } from "@/app/api/admin/subscription-plans/route";
import type { NextRequest } from "next/server";

describe("subscription-plans API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableChains = {};
  });

  describe("GET", () => {
    it("認証エラーで401", async () => {
      mockVerifyAdminAuth.mockResolvedValueOnce(false);
      const res = await GET(createReq("GET", "http://localhost/api/admin/subscription-plans") as unknown as NextRequest);
      expect(res.status).toBe(401);
    });

    it("プラン一覧を返す", async () => {
      const mockPlans = [
        { id: "p1", name: "マンジャロ月1回", price: 28000, interval_months: 1, gateway: "square" },
      ];
      tableChains["subscription_plans"] = createChain({ data: mockPlans, error: null });
      const res = await GET(createReq("GET", "http://localhost/api/admin/subscription-plans") as unknown as NextRequest);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.plans).toHaveLength(1);
      expect(json.plans[0].name).toBe("マンジャロ月1回");
    });
  });

  describe("POST", () => {
    it("認証エラーで401", async () => {
      mockVerifyAdminAuth.mockResolvedValueOnce(false);
      const res = await POST(createReq("POST", "http://localhost/api/admin/subscription-plans", {
        name: "テストプラン", price: 10000, interval_months: 1,
      }) as unknown as NextRequest);
      expect(res.status).toBe(401);
    });

    it("プラン作成成功", async () => {
      const created = { id: "p-new", name: "新プラン", price: 15000, gateway: "square" };
      tableChains["subscription_plans"] = createChain({ data: created, error: null });
      const res = await POST(createReq("POST", "http://localhost/api/admin/subscription-plans", {
        name: "新プラン", price: 15000, interval_months: 1,
      }) as unknown as NextRequest);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.plan.name).toBe("新プラン");
    });

    it("名前なしでバリデーションエラー", async () => {
      const res = await POST(createReq("POST", "http://localhost/api/admin/subscription-plans", {
        name: "", price: 10000,
      }) as unknown as NextRequest);
      expect(res.status).toBe(400);
    });

    it("価格がマイナスでバリデーションエラー", async () => {
      const res = await POST(createReq("POST", "http://localhost/api/admin/subscription-plans", {
        name: "テスト", price: -100,
      }) as unknown as NextRequest);
      expect(res.status).toBe(400);
    });
  });

  describe("PUT", () => {
    it("IDなしで400", async () => {
      const res = await PUT(createReq("PUT", "http://localhost/api/admin/subscription-plans", {
        name: "更新",
      }) as unknown as NextRequest);
      expect(res.status).toBe(400);
    });

    it("プラン更新成功", async () => {
      const updated = { id: "p1", name: "更新プラン", price: 20000 };
      tableChains["subscription_plans"] = createChain({ data: updated, error: null });
      const res = await PUT(createReq("PUT", "http://localhost/api/admin/subscription-plans", {
        id: "p1", name: "更新プラン", price: 20000,
      }) as unknown as NextRequest);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.plan.name).toBe("更新プラン");
    });
  });

  describe("DELETE", () => {
    it("IDなしで400", async () => {
      const res = await DELETE_FN(createReq("DELETE", "http://localhost/api/admin/subscription-plans") as unknown as NextRequest);
      expect(res.status).toBe(400);
    });

    it("プラン削除成功", async () => {
      tableChains["subscription_plans"] = createChain({ data: null, error: null });
      const res = await DELETE_FN(createReq("DELETE", "http://localhost/api/admin/subscription-plans?id=p1") as unknown as NextRequest);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
    });
  });
});
