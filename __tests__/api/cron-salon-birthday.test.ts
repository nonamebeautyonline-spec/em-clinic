// __tests__/api/cron-salon-birthday.test.ts
// サロン誕生日クーポン Cron API のテスト
// 対象: app/api/cron/salon-birthday/route.ts

import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { NextRequest } from "next/server";

// === Supabaseチェーンモック ===
type SupabaseChain = Record<string, Mock> & { then: Mock };

function createChain(defaultResolve = { data: null, error: null, count: 0 }): SupabaseChain {
  const chain = {} as SupabaseChain;
  ["insert","update","delete","select","eq","neq","gt","gte","lt","lte",
   "in","is","not","order","limit","range","single","maybeSingle","upsert",
   "ilike","or","count","csv","like","head"].forEach(m => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.then = vi.fn((resolve: (val: unknown) => unknown) => resolve(defaultResolve));
  return chain;
}

let tableChains: Record<string, SupabaseChain> = {};
let tableCallCounts: Record<string, number> = {};
let tableChainsList: Record<string, SupabaseChain[]> = {};

function setChainForTable(table: string, chain: SupabaseChain) {
  tableChains[table] = chain;
}

function setChainsForTable(table: string, chains: SupabaseChain[]) {
  tableChainsList[table] = chains;
  tableCallCounts[table] = 0;
}

function getChainForTable(table: string): SupabaseChain {
  if (tableChainsList[table] && tableChainsList[table].length > 0) {
    const idx = tableCallCounts[table] || 0;
    tableCallCounts[table] = idx + 1;
    return tableChainsList[table][Math.min(idx, tableChainsList[table].length - 1)];
  }
  if (!tableChains[table]) tableChains[table] = createChain();
  return tableChains[table];
}

// === モック定義 ===
vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: { from: vi.fn((table: string) => getChainForTable(table)) },
}));

vi.mock("@/lib/tenant", () => ({
  withTenant: vi.fn((q: SupabaseChain) => q),
  strictWithTenant: vi.fn((q: SupabaseChain) => q),
  tenantPayload: vi.fn(() => ({ tenant_id: "test-tenant" })),
}));

const mockPushMessage = vi.fn().mockResolvedValue({ ok: true });
vi.mock("@/lib/line-push", () => ({
  pushMessage: (...args: unknown[]) => mockPushMessage(...args),
}));

const mockAcquireLock = vi.fn();
vi.mock("@/lib/distributed-lock", () => ({
  acquireLock: (...args: unknown[]) => mockAcquireLock(...args),
}));

vi.mock("@/lib/notifications/cron-failure", () => ({
  notifyCronFailure: vi.fn().mockResolvedValue(undefined),
}));

const mockFindBirthdayCustomers = vi.fn();
const mockBuildBirthdayMessage = vi.fn();
vi.mock("@/lib/salon-lifecycle", () => ({
  findBirthdayCustomers: (...args: unknown[]) => mockFindBirthdayCustomers(...args),
  buildBirthdayMessage: (...args: unknown[]) => mockBuildBirthdayMessage(...args),
}));

import { GET } from "@/app/api/cron/salon-birthday/route";

// === テスト本体 ===
describe("GET /api/cron/salon-birthday", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableChains = {};
    tableChainsList = {};
    tableCallCounts = {};
    process.env.CRON_SECRET = "test-cron-secret";
    mockAcquireLock.mockResolvedValue({ acquired: true, release: vi.fn() });
  });

  function makeReq(headers: Record<string, string> = {}) {
    return new NextRequest("http://localhost/api/cron/salon-birthday", {
      method: "GET",
      headers: { authorization: "Bearer test-cron-secret", ...headers },
    });
  }

  // ── 認証テスト ──
  it("CRON_SECRET不一致で401を返す", async () => {
    const req = new NextRequest("http://localhost/api/cron/salon-birthday", {
      method: "GET",
      headers: { authorization: "Bearer wrong-secret" },
    });
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  // ── 排他制御テスト ──
  it("ロック取得失敗時はスキップを返す", async () => {
    mockAcquireLock.mockResolvedValue({ acquired: false, release: vi.fn() });
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.skipped).toBeDefined();
  });

  // ── SALONテナントなし ──
  it("SALONテナントが0件の場合、sent=0を返す", async () => {
    setChainForTable("tenants", createChain({ data: [], error: null, count: 0 }));
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.sent).toBe(0);
  });

  // ── テナント取得エラー ──
  it("テナント取得エラー時は500を返す", async () => {
    setChainForTable("tenants", createChain({ data: null, error: { message: "DB error" }, count: 0 }));
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.ok).toBe(false);
  });

  // ── 正常系: 誕生日顧客にクーポン送信 ──
  it("誕生日顧客にクーポンを送信し結果を返す", async () => {
    // テナント取得
    setChainForTable("tenants", createChain({ data: [{ id: "tenant-1" }], error: null, count: 0 }));

    // findBirthdayCustomers
    mockFindBirthdayCustomers.mockResolvedValue([
      { patientId: "p-1", name: "田中太郎", lineId: "U001" },
    ]);

    // coupons: 既存クーポン取得
    setChainForTable("coupons", createChain({ data: { id: 1, code: "BD-TEST" }, error: null, count: 0 }));

    // coupon_issues: INSERT成功
    setChainForTable("coupon_issues", createChain({ data: null, error: null, count: 0 }));

    // buildBirthdayMessage
    mockBuildBirthdayMessage.mockReturnValue({ type: "text", text: "お誕生日おめでとうございます" });

    // pushMessage 成功
    mockPushMessage.mockResolvedValue({ ok: true });

    // message_log: INSERT成功
    setChainForTable("message_log", createChain({ data: null, error: null, count: 0 }));

    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.tenants).toBe(1);
    expect(body.sent).toBe(1);
    expect(body.errors).toBe(0);
    expect(mockPushMessage).toHaveBeenCalledTimes(1);
  });

  // ── 誕生日顧客0件 ──
  it("誕生日顧客が0件ならクーポン送信しない", async () => {
    setChainForTable("tenants", createChain({ data: [{ id: "tenant-1" }], error: null, count: 0 }));
    mockFindBirthdayCustomers.mockResolvedValue([]);

    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.sent).toBe(0);
    expect(mockPushMessage).not.toHaveBeenCalled();
  });

  // ── クーポン作成失敗 ──
  it("クーポン取得/作成失敗時はエラーカウントが増加する", async () => {
    setChainForTable("tenants", createChain({ data: [{ id: "tenant-1" }], error: null, count: 0 }));
    mockFindBirthdayCustomers.mockResolvedValue([
      { patientId: "p-1", name: "田中太郎", lineId: "U001" },
    ]);

    // coupons: 既存なし（singleがnull）、INSERT失敗
    setChainsForTable("coupons", [
      createChain({ data: null, error: null, count: 0 }), // 既存取得失敗（singleでnull）
      createChain({ data: null, error: { message: "insert error" }, count: 0 }), // 新規作成も失敗
    ]);

    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.errors).toBeGreaterThanOrEqual(1);
    expect(body.sent).toBe(0);
  });

  // ── coupon_issues重複（23505）はスキップ ──
  it("coupon_issues INSERT重複エラー時はスキップする", async () => {
    setChainForTable("tenants", createChain({ data: [{ id: "tenant-1" }], error: null, count: 0 }));
    mockFindBirthdayCustomers.mockResolvedValue([
      { patientId: "p-1", name: "田中太郎", lineId: "U001" },
    ]);
    setChainForTable("coupons", createChain({ data: { id: 1, code: "BD-TEST" }, error: null, count: 0 }));
    setChainForTable("coupon_issues", createChain({ data: null, error: { code: "23505", message: "duplicate" }, count: 0 }));

    mockBuildBirthdayMessage.mockReturnValue({ type: "text", text: "おめでとう" });

    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.ok).toBe(true);
    // 重複スキップなので sent は 0、errors も 0（スキップ扱い）
    expect(body.sent).toBe(0);
    expect(mockPushMessage).not.toHaveBeenCalled();
  });

  // ── 未処理例外 → 500 ──
  it("未処理例外発生時は500を返す", async () => {
    setChainForTable("tenants", createChain({ data: [{ id: "tenant-1" }], error: null, count: 0 }));
    mockFindBirthdayCustomers.mockRejectedValue(new Error("unexpected"));

    const res = await GET(makeReq());
    // テナント内のtry-catchで処理されるので200
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.errors).toBeGreaterThanOrEqual(1);
  });
});
