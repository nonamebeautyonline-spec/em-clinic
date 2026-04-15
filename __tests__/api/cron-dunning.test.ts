// __tests__/api/cron-dunning.test.ts
// 督促処理 Cron API のテスト
// 対象: app/api/cron/dunning/route.ts

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

import { GET } from "@/app/api/cron/dunning/route";

// === テスト本体 ===
describe("GET /api/cron/dunning", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableChains = {};
    tableChainsList = {};
    tableCallCounts = {};
    process.env.CRON_SECRET = "test-cron-secret";
    mockAcquireLock.mockResolvedValue({ acquired: true, release: vi.fn() });
  });

  function makeReq(headers: Record<string, string> = {}) {
    return new NextRequest("http://localhost/api/cron/dunning", {
      method: "GET",
      headers: { authorization: "Bearer test-cron-secret", ...headers },
    });
  }

  // ── 認証テスト ──
  it("CRON_SECRET不一致で401を返す", async () => {
    const req = new NextRequest("http://localhost/api/cron/dunning", {
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

  // ── 対象注文なし ──
  it("未払い注文がない場合、sent=0を返す", async () => {
    // テナント一覧
    setChainForTable("tenants", createChain({ data: [{ id: "t-1" }], error: null, count: 0 }));
    // orders: 空
    setChainForTable("orders", createChain({ data: [], error: null, count: 0 }));

    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.sent).toBe(0);
    expect(body.message).toBe("対象注文なし");
  });

  // ── テナントが空の場合 ──
  it("テナントがなくても正常に完了する", async () => {
    setChainForTable("tenants", createChain({ data: [], error: null, count: 0 }));
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.sent).toBe(0);
  });

  // ── 正常系: 督促送信 ──
  it("期日を過ぎた注文にLINE督促を送信する", async () => {
    setChainForTable("tenants", createChain({ data: [{ id: "t-1" }], error: null, count: 0 }));

    // 7日前の注文（step2に該当）
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const orderData = [{
      id: "order-1",
      patient_id: "p-1",
      tenant_id: "t-1",
      created_at: sevenDaysAgo.toISOString(),
      payment_method: "bank_transfer",
      status: "pending",
      payment_status: "pending",
    }];
    setChainForTable("orders", createChain({ data: orderData, error: null, count: 0 }));

    // dunning_logs: step1未送信、step2未送信
    setChainForTable("dunning_logs", createChain({ data: null, error: null, count: 0 }));

    // patients: line_id取得
    setChainForTable("patients", createChain({ data: { line_id: "U123" }, error: null, count: 0 }));

    // message_log INSERT
    setChainForTable("message_log", createChain({ data: null, error: null, count: 0 }));

    mockPushMessage.mockResolvedValue({ ok: true });

    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.ok).toBe(true);
    // step1(3日)とstep2(7日)の両方に該当
    expect(body.sent).toBeGreaterThanOrEqual(1);
    expect(mockPushMessage).toHaveBeenCalled();
  });

  // ── 重複チェック: 既に送信済みステップはスキップ ──
  it("既に送信済みのステップはスキップする", async () => {
    setChainForTable("tenants", createChain({ data: [{ id: "t-1" }], error: null, count: 0 }));

    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
    const orderData = [{
      id: "order-1",
      patient_id: "p-1",
      tenant_id: "t-1",
      created_at: tenDaysAgo.toISOString(),
      payment_method: "bank_transfer",
      status: "pending",
      payment_status: "unpaid",
    }];
    setChainForTable("orders", createChain({ data: orderData, error: null, count: 0 }));

    // dunning_logs: 全ステップ既に存在
    setChainForTable("dunning_logs", createChain({ data: { id: 1 }, error: null, count: 0 }));

    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.skipped).toBeGreaterThanOrEqual(1);
    expect(mockPushMessage).not.toHaveBeenCalled();
  });

  // ── LINE UID なし → no_uid で記録 ──
  it("LINE UID未設定の患者にはLINE送信しないがログは記録する", async () => {
    setChainForTable("tenants", createChain({ data: [{ id: "t-1" }], error: null, count: 0 }));

    const fourDaysAgo = new Date();
    fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);
    const orderData = [{
      id: "order-2",
      patient_id: "p-2",
      tenant_id: "t-1",
      created_at: fourDaysAgo.toISOString(),
      payment_method: "bank_transfer",
      status: "pending",
      payment_status: "pending",
    }];
    setChainForTable("orders", createChain({ data: orderData, error: null, count: 0 }));
    setChainForTable("dunning_logs", createChain({ data: null, error: null, count: 0 }));
    setChainForTable("patients", createChain({ data: { line_id: null }, error: null, count: 0 }));
    setChainForTable("message_log", createChain({ data: null, error: null, count: 0 }));

    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(mockPushMessage).not.toHaveBeenCalled();
    // LINE UID なし → failed カウント
    expect(body.failed).toBeGreaterThanOrEqual(1);
  });

  // ── dunning_logs UNIQUE違反はskipped ──
  it("dunning_logs UNIQUE違反はスキップ扱いにする", async () => {
    setChainForTable("tenants", createChain({ data: [{ id: "t-1" }], error: null, count: 0 }));

    const fourDaysAgo = new Date();
    fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);
    const orderData = [{
      id: "order-3",
      patient_id: "p-3",
      tenant_id: "t-1",
      created_at: fourDaysAgo.toISOString(),
      payment_method: "bank_transfer",
      status: "pending",
      payment_status: "pending",
    }];
    setChainForTable("orders", createChain({ data: orderData, error: null, count: 0 }));

    // dunning_logsの最初の呼び出し（重複チェック）はnull、2番目（INSERT）はUNIQUE違反
    setChainsForTable("dunning_logs", [
      createChain({ data: null, error: null, count: 0 }), // 重複チェック: 未送信
      createChain({ data: null, error: { code: "23505", message: "duplicate" }, count: 0 }), // INSERT: UNIQUE違反
    ]);

    setChainForTable("patients", createChain({ data: { line_id: "U123" }, error: null, count: 0 }));
    setChainForTable("message_log", createChain({ data: null, error: null, count: 0 }));
    mockPushMessage.mockResolvedValue({ ok: true });

    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.skipped).toBeGreaterThanOrEqual(1);
  });

  // ── 未処理例外 → 500 ──
  it("未処理例外発生時は500を返す", async () => {
    setChainForTable("tenants", createChain({ data: null, error: null, count: 0 }));
    // tenantsが null → tenantIds = [] → ordersも空 → 正常終了のはず
    // 例外を起こすにはmockAcquireLockの後にthrowを仕掛ける
    mockAcquireLock.mockResolvedValue({
      acquired: true,
      release: vi.fn(),
    });
    // テナント一覧取得でthrow
    const { supabaseAdmin } = await import("@/lib/supabase");
    vi.mocked(supabaseAdmin.from).mockImplementationOnce(() => { throw new Error("DB connection failed"); });

    const res = await GET(makeReq());
    expect(res.status).toBe(500);
  });
});
