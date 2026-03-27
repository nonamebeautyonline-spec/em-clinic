// __tests__/api/platform-tenant-export.test.ts
// テナントデータエクスポートAPI（GET）のテスト
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

import { GET } from "@/app/api/platform/tenants/[tenantId]/export/route";
import { verifyPlatformAdmin } from "@/lib/platform-auth";
import { NextRequest } from "next/server";

function makeReq() {
  return new NextRequest("http://localhost:3000/api/platform/tenants/t1/export");
}

function makeCtx(tenantId = "t1") {
  return { params: Promise.resolve({ tenantId }) };
}

describe("GET /api/platform/tenants/[tenantId]/export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableChains = {};
  });

  it("未認証の場合は403を返す", async () => {
    vi.mocked(verifyPlatformAdmin).mockResolvedValueOnce(null);
    const res = await GET(makeReq(), makeCtx());
    expect(res.status).toBe(403);
  });

  it("テナントが見つからない場合は404を返す", async () => {
    tableChains["tenants"] = createChain({ data: null, error: null });
    const res = await GET(makeReq(), makeCtx());
    expect(res.status).toBe(404);
  });

  it("正常なエクスポートでJSONファイルを返す", async () => {
    // テナント基本情報
    tableChains["tenants"] = createChain({
      data: { id: "t1", name: "テストクリニック", slug: "test" },
      error: null,
    });
    // その他のテーブル（空データ）
    tableChains["tenant_plans"] = createChain({ data: null, error: null });
    tableChains["tenant_members"] = createChain({ data: [], error: null });
    tableChains["patients"] = createChain({ data: null, error: null });
    tableChains["tenant_settings"] = createChain({ data: [], error: null });
    tableChains["billing_invoices"] = createChain({ data: [], error: null });
    tableChains["monthly_usage"] = createChain({ data: [], error: null });
    tableChains["tenant_options"] = createChain({ data: [], error: null });

    const res = await GET(makeReq(), makeCtx());
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/json");
    expect(res.headers.get("Content-Disposition")).toContain("attachment");
    expect(res.headers.get("Content-Disposition")).toContain("test");

    const data = JSON.parse(await res.text());
    expect(data.exportedAt).toBeDefined();
    expect(data.tenant.name).toBe("テストクリニック");
  });
});
