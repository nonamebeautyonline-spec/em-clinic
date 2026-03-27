// __tests__/api/platform-usage-export.test.ts
// 利用統計CSVエクスポートAPI（GET）のテスト
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

import { GET } from "@/app/api/platform/usage/export/route";
import { verifyPlatformAdmin } from "@/lib/platform-auth";
import { NextRequest } from "next/server";

function makeReq(month?: string) {
  const url = month
    ? `http://localhost:3000/api/platform/usage/export?month=${month}`
    : "http://localhost:3000/api/platform/usage/export";
  return new NextRequest(url);
}

describe("GET /api/platform/usage/export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableChains = {};
  });

  it("未認証の場合は403を返す", async () => {
    vi.mocked(verifyPlatformAdmin).mockResolvedValueOnce(null);
    const res = await GET(makeReq());
    expect(res.status).toBe(403);
  });

  it("データなしでも空CSVを返す", async () => {
    tableChains["monthly_usage"] = createChain({ data: [], error: null });
    tableChains["tenant_plans"] = createChain({ data: [], error: null });

    const res = await GET(makeReq("2026-03"));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/csv");
    expect(res.headers.get("Content-Disposition")).toContain("usage-2026-03.csv");

    const text = await res.text();
    // BOM + ヘッダー行が含まれる
    expect(text).toContain("テナント名");
    expect(text).toContain("送信数");
  });

  it("使用量データが含まれるCSVを返す", async () => {
    tableChains["monthly_usage"] = createChain({
      data: [
        {
          tenant_id: "t1",
          month: "2026-03-01",
          message_count: 1500,
          broadcast_count: 10,
          overage_count: 500,
          overage_amount: 500,
          invoice_generated: false,
          tenants: { name: "テストクリニック", slug: "test" },
        },
      ],
      error: null,
    });
    tableChains["tenant_plans"] = createChain({
      data: [
        {
          tenant_id: "t1",
          plan_name: "standard",
          monthly_fee: 17000,
          message_quota: 30000,
          overage_unit_price: 0.7,
        },
      ],
      error: null,
    });

    const res = await GET(makeReq("2026-03"));
    expect(res.status).toBe(200);

    const text = await res.text();
    expect(text).toContain("テストクリニック");
    expect(text).toContain("1500");
    expect(text).toContain("standard");
  });

  it("月指定なしの場合は当月をデフォルトにする", async () => {
    tableChains["monthly_usage"] = createChain({ data: [], error: null });
    tableChains["tenant_plans"] = createChain({ data: [], error: null });

    const res = await GET(makeReq());
    expect(res.status).toBe(200);

    const disposition = res.headers.get("Content-Disposition") || "";
    // 当月のファイル名が含まれる
    const now = new Date();
    const expectedMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    expect(disposition).toContain(expectedMonth);
  });
});
