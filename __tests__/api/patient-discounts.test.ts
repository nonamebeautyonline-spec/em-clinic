// __tests__/api/patient-discounts.test.ts
// 個別患者割引CRUD API テスト
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

import { GET, POST, PUT, DELETE as DELETE_FN } from "@/app/api/admin/patient-discounts/route";
import type { NextRequest } from "next/server";

describe("patient-discounts API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableChains = {};
  });

  describe("GET", () => {
    it("認証エラーで401", async () => {
      mockVerifyAdminAuth.mockResolvedValueOnce(false);
      const res = await GET(createReq("GET", "http://localhost/api/admin/patient-discounts") as unknown as NextRequest);
      expect(res.status).toBe(401);
    });

    it("患者IDフィルタで割引一覧を返す", async () => {
      const mockDiscounts = [{ id: "d1", patient_id: "P001", discount_type: "percent", discount_value: 10 }];
      tableChains["patient_discounts"] = createChain({ data: mockDiscounts, error: null });
      const res = await GET(createReq("GET", "http://localhost/api/admin/patient-discounts?patient_id=P001") as unknown as NextRequest);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.discounts).toHaveLength(1);
    });
  });

  describe("POST", () => {
    it("認証エラーで401", async () => {
      mockVerifyAdminAuth.mockResolvedValueOnce(false);
      const res = await POST(createReq("POST", "http://localhost/api/admin/patient-discounts", {
        patient_id: "P001", discount_type: "percent", discount_value: 10,
      }) as unknown as NextRequest);
      expect(res.status).toBe(401);
    });

    it("割引作成成功", async () => {
      const created = { id: "d-new", patient_id: "P001", discount_type: "fixed", discount_value: 1000, reason: "VIP" };
      tableChains["patient_discounts"] = createChain({ data: created, error: null });
      const res = await POST(createReq("POST", "http://localhost/api/admin/patient-discounts", {
        patient_id: "P001", discount_type: "fixed", discount_value: 1000, reason: "VIP",
      }) as unknown as NextRequest);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.discount.reason).toBe("VIP");
    });

    it("patient_idなしでバリデーションエラー", async () => {
      const res = await POST(createReq("POST", "http://localhost/api/admin/patient-discounts", {
        discount_type: "percent", discount_value: 10,
      }) as unknown as NextRequest);
      expect(res.status).toBe(400);
    });
  });

  describe("PUT", () => {
    it("IDなしで400", async () => {
      const res = await PUT(createReq("PUT", "http://localhost/api/admin/patient-discounts", {
        discount_value: 20,
      }) as unknown as NextRequest);
      expect(res.status).toBe(400);
    });

    it("割引更新成功", async () => {
      const updated = { id: "d1", discount_value: 20 };
      tableChains["patient_discounts"] = createChain({ data: updated, error: null });
      const res = await PUT(createReq("PUT", "http://localhost/api/admin/patient-discounts", {
        id: "d1", discount_value: 20,
      }) as unknown as NextRequest);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.discount.discount_value).toBe(20);
    });
  });

  describe("DELETE", () => {
    it("IDなしで400", async () => {
      const res = await DELETE_FN(createReq("DELETE", "http://localhost/api/admin/patient-discounts") as unknown as NextRequest);
      expect(res.status).toBe(400);
    });

    it("割引削除成功", async () => {
      tableChains["patient_discounts"] = createChain({ data: null, error: null });
      const res = await DELETE_FN(createReq("DELETE", "http://localhost/api/admin/patient-discounts?id=d1") as unknown as NextRequest);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
    });
  });
});
