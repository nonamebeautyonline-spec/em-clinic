// __tests__/api/suspend-overdue.test.ts
// 支払い滞納自動サスペンドcronのテスト
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

vi.mock("@/lib/distributed-lock", () => ({
  acquireLock: vi.fn().mockResolvedValue({
    acquired: true,
    release: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock("@/lib/notifications/cron-failure", () => ({
  notifyCronFailure: vi.fn().mockResolvedValue(undefined),
}));

import { GET } from "@/app/api/cron/suspend-overdue/route";
import { acquireLock } from "@/lib/distributed-lock";
import { NextRequest } from "next/server";

function makeReq() {
  return new NextRequest("http://localhost:3000/api/cron/suspend-overdue", {
    headers: { authorization: `Bearer ${process.env.CRON_SECRET || "test-secret"}` },
  });
}

describe("GET /api/cron/suspend-overdue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableChains = {};
    process.env.CRON_SECRET = "test-secret";
  });

  it("Cron認証失敗で401を返す", async () => {
    const req = new NextRequest("http://localhost:3000/api/cron/suspend-overdue", {
      headers: { authorization: "Bearer wrong-secret" },
    });
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("ロック取得失敗でskippedを返す", async () => {
    vi.mocked(acquireLock).mockResolvedValueOnce({
      acquired: false,
      release: vi.fn(),
    });
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.skipped).toBe(true);
  });

  it("対象テナントなしで suspended=0 を返す", async () => {
    tableChains["tenant_plans"] = createChain({ data: [], error: null });
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.suspended).toBe(0);
  });

  it("猶予超過テナントをサスペンドする", async () => {
    // 15日前に支払い失敗したテナント
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

    tableChains["tenant_plans"] = createChain({
      data: [{ tenant_id: "t1", payment_failed_at: fifteenDaysAgo.toISOString() }],
      error: null,
    });

    // テナント情報取得（アクティブ）
    const tenantsChain = createChain({
      data: { id: "t1", name: "滞納テナント", is_active: true },
      error: null,
    });
    tableChains["tenants"] = tenantsChain;

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.suspended).toBe(1);
  });
});
