// __tests__/api/platform-tenant-restore.test.ts
// テナント復元API（POST）のテスト
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

import { POST } from "@/app/api/platform/tenants/[tenantId]/restore/route";
import { verifyPlatformAdmin } from "@/lib/platform-auth";
import { NextRequest } from "next/server";

function makeReq() {
  return new NextRequest("http://localhost:3000/api/platform/tenants/t1/restore", { method: "POST" });
}

function makeCtx(tenantId = "t1") {
  return { params: Promise.resolve({ tenantId }) };
}

describe("POST /api/platform/tenants/[tenantId]/restore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableChains = {};
  });

  it("未認証の場合は403を返す", async () => {
    vi.mocked(verifyPlatformAdmin).mockResolvedValueOnce(null);
    const res = await POST(makeReq(), makeCtx());
    expect(res.status).toBe(403);
  });

  it("削除済みテナントが見つからない場合は404を返す", async () => {
    // tenants の single() が null（deleted_at IS NOT NULL 条件に一致なし）
    tableChains["tenants"] = createChain({ data: null, error: null });
    const res = await POST(makeReq(), makeCtx());
    expect(res.status).toBe(404);
  });

  it("スラグ重複の場合は400を返す", async () => {
    // 削除済みテナント存在
    const tenantsChain = createChain({ data: { id: "t1", name: "テスト", slug: "test", deleted_at: "2026-03-01T00:00:00Z" }, error: null });
    tableChains["tenants"] = tenantsChain;

    // maybeSingle の2回目呼び出し（重複チェック）で既存テナント発見
    // 最初のsingle()は削除済みテナント、2回目のmaybeSingle()は重複チェック
    // チェーンモックでは両方同じ結果を返すので、重複ありとみなされる
    const res = await POST(makeReq(), makeCtx());
    // この構造では data が返るので重複検出される
    expect(res.status).toBe(400);
  });

  it("正常に復元できる場合は200を返す", async () => {
    // 削除済みテナント（1回目のクエリ）
    const firstCall = createChain({
      data: { id: "t1", name: "テスト", slug: "test", deleted_at: "2026-03-01T00:00:00Z" },
      error: null,
    });
    // 重複チェック（2回目）: null = 重複なし
    const secondCall = createChain({ data: null, error: null });

    let callCount = 0;
    const mockFrom = vi.fn((table: string) => {
      if (table === "tenants") {
        callCount++;
        return callCount === 1 ? firstCall : secondCall;
      }
      return getOrCreateChain(table);
    });

    const { supabaseAdmin } = await import("@/lib/supabase");
    vi.mocked(supabaseAdmin.from).mockImplementation(mockFrom);

    const res = await POST(makeReq(), makeCtx());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.message).toContain("テスト");
  });
});
