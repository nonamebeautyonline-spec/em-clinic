// __tests__/api/campaigns.test.ts
// キャンペーンCRUD API テスト
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- チェーンビルダー ---
function createChain(defaultResolve: Record<string, unknown> = { data: null, error: null }) {
  const chain: Record<string, unknown> = {};
  ["insert","update","delete","select","eq","neq","gt","gte","lt","lte",
   "in","is","not","or","order","limit","range","single","maybeSingle","upsert",
   "ilike","lte","gte","count","csv","passthrough"].forEach(m => {
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

// --- ヘルパー ---
function createReq(method: string, url: string, body?: unknown) {
  const init: RequestInit = { method, headers: { "Content-Type": "application/json" } };
  if (body) init.body = JSON.stringify(body);
  return new Request(url, init);
}

import { GET, POST, PUT, DELETE as DELETE_FN } from "@/app/api/admin/campaigns/route";
import type { NextRequest } from "next/server";

describe("campaigns API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableChains = {};
  });

  describe("GET", () => {
    it("認証エラーで401", async () => {
      mockVerifyAdminAuth.mockResolvedValueOnce(false);
      const res = await GET(createReq("GET", "http://localhost/api/admin/campaigns") as unknown as NextRequest);
      expect(res.status).toBe(401);
    });

    it("キャンペーン一覧を返す", async () => {
      const mockCampaigns = [{ id: "c1", name: "春セール", discount_type: "percent", discount_value: 20 }];
      tableChains["campaigns"] = createChain({ data: mockCampaigns, error: null });
      const res = await GET(createReq("GET", "http://localhost/api/admin/campaigns") as unknown as NextRequest);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.campaigns).toHaveLength(1);
      expect(json.campaigns[0].name).toBe("春セール");
    });
  });

  describe("POST", () => {
    it("認証エラーで401", async () => {
      mockVerifyAdminAuth.mockResolvedValueOnce(false);
      const res = await POST(createReq("POST", "http://localhost/api/admin/campaigns", {
        name: "テスト", discount_type: "percent", discount_value: 10, target_type: "all", starts_at: "2026-04-01",
      }) as unknown as NextRequest);
      expect(res.status).toBe(401);
    });

    it("キャンペーン作成成功", async () => {
      const created = { id: "c-new", name: "夏セール", discount_type: "percent", discount_value: 30 };
      tableChains["campaigns"] = createChain({ data: created, error: null });
      const res = await POST(createReq("POST", "http://localhost/api/admin/campaigns", {
        name: "夏セール", discount_type: "percent", discount_value: 30, target_type: "all", starts_at: "2026-07-01",
      }) as unknown as NextRequest);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.campaign.name).toBe("夏セール");
    });

    it("名前なしでバリデーションエラー", async () => {
      const res = await POST(createReq("POST", "http://localhost/api/admin/campaigns", {
        name: "", discount_type: "percent", discount_value: 10, target_type: "all", starts_at: "2026-04-01",
      }) as unknown as NextRequest);
      expect(res.status).toBe(400);
    });
  });

  describe("PUT", () => {
    it("IDなしで400", async () => {
      const res = await PUT(createReq("PUT", "http://localhost/api/admin/campaigns", {
        name: "更新",
      }) as unknown as NextRequest);
      expect(res.status).toBe(400);
    });

    it("キャンペーン更新成功", async () => {
      const updated = { id: "c1", name: "更新済み" };
      tableChains["campaigns"] = createChain({ data: updated, error: null });
      const res = await PUT(createReq("PUT", "http://localhost/api/admin/campaigns", {
        id: "c1", name: "更新済み",
      }) as unknown as NextRequest);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.campaign.name).toBe("更新済み");
    });
  });

  describe("DELETE", () => {
    it("IDなしで400", async () => {
      const res = await DELETE_FN(createReq("DELETE", "http://localhost/api/admin/campaigns") as unknown as NextRequest);
      expect(res.status).toBe(400);
    });

    it("キャンペーン削除成功", async () => {
      tableChains["campaigns"] = createChain({ data: null, error: null });
      const res = await DELETE_FN(createReq("DELETE", "http://localhost/api/admin/campaigns?id=c1") as unknown as NextRequest);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
    });
  });
});
