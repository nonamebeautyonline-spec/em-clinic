// __tests__/api/dashboard-trends.test.ts
// 売上トレンドAPI テスト
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";

// --- Supabase チェーンモック ---
type SupabaseChain = Record<string, Mock> & { then: Mock };

function createChain(defaultResolve = { data: [], error: null }): SupabaseChain {
  const chain = {} as SupabaseChain;
  ["insert", "update", "delete", "select", "eq", "neq", "gt", "gte", "lt", "lte",
    "in", "is", "not", "order", "limit", "range", "single", "maybeSingle", "upsert",
    "ilike", "or", "count", "csv", "head"].forEach(m => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.then = vi.fn((resolve: (val: unknown) => unknown) => resolve(defaultResolve));
  return chain;
}

let tableChains: Record<string, SupabaseChain[]> = {};
let tableCallIndex: Record<string, number> = {};

// 同じテーブルに対する複数回の呼び出しを区別するためのヘルパー
function getNextChain(table: string) {
  if (!tableChains[table]) tableChains[table] = [createChain()];
  if (!tableCallIndex[table]) tableCallIndex[table] = 0;
  const idx = tableCallIndex[table];
  tableCallIndex[table]++;
  return tableChains[table][idx] || tableChains[table][0];
}

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn((table: string) => getNextChain(table)),
  })),
}));

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: { from: vi.fn((table: string) => getNextChain(table)) },
}));

const mockVerifyAdminAuth = vi.fn();
vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: (...args: unknown[]) => mockVerifyAdminAuth(...args),
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  withTenant: vi.fn((q: unknown) => q),
}));

import { NextRequest } from "next/server";
import { GET } from "@/app/api/admin/dashboard-trends/route";

function createNextRequest(url: string) {
  return new NextRequest(new Request(url));
}

describe("売上トレンドAPI - GET", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableChains = {};
    tableCallIndex = {};
    mockVerifyAdminAuth.mockResolvedValue(true);
  });

  it("未認証の場合は401を返す", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const req = createNextRequest("http://localhost/api/admin/dashboard-trends");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("月別トレンド: データなしの場合は空のトレンド配列を返す", async () => {
    // orders テーブルへの3回の呼び出し（credit_card, bank_transfer, refund）
    tableChains["orders"] = [
      createChain({ data: [], error: null }),
      createChain({ data: [], error: null }),
      createChain({ data: [], error: null }),
    ];

    const req = createNextRequest("http://localhost/api/admin/dashboard-trends");
    const res = await GET(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.granularity).toBe("monthly");
    expect(Array.isArray(json.trends)).toBe(true);
    // 13ヶ月分（過去12ヶ月 + 当月）
    expect(json.trends.length).toBe(13);
    // 全て0であること
    for (const t of json.trends) {
      expect(t.total).toBe(0);
      expect(t.square).toBe(0);
      expect(t.bankTransfer).toBe(0);
    }
    expect(json.currentPeriod).toBeTruthy();
  });

  it("月別トレンド: データありの場合に正しく集計される", async () => {
    // 現在の年月を基準にテストデータを作成
    const now = new Date();
    const jstOffset = 9 * 60 * 60 * 1000;
    const jstNow = new Date(now.getTime() + jstOffset);
    const year = jstNow.getUTCFullYear();
    const month = jstNow.getUTCMonth(); // 0-indexed

    // 当月のJST日付をUTCに変換（paid_atに使う）
    const currentMonthDate = new Date(Date.UTC(year, month, 15, 3, 0, 0) - jstOffset);

    tableChains["orders"] = [
      // credit_card 注文
      createChain({
        data: [
          { amount: 10000, paid_at: currentMonthDate.toISOString(), patient_id: "p1" },
          { amount: 20000, paid_at: currentMonthDate.toISOString(), patient_id: "p2" },
        ],
        error: null,
      }),
      // bank_transfer 注文
      createChain({
        data: [
          { amount: 5000, created_at: currentMonthDate.toISOString(), patient_id: "p3" },
        ],
        error: null,
      }),
      // 返金
      createChain({
        data: [
          { refunded_amount: 3000, amount: 10000, refunded_at: currentMonthDate.toISOString() },
        ],
        error: null,
      }),
    ];

    const req = createNextRequest("http://localhost/api/admin/dashboard-trends");
    const res = await GET(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.granularity).toBe("monthly");

    // 当月のトレンドデータを検証
    const current = json.currentPeriod;
    expect(current.square).toBe(30000); // 10000 + 20000
    expect(current.bankTransfer).toBe(5000);
    expect(current.gross).toBe(35000); // 30000 + 5000
    expect(current.refunded).toBe(3000);
    expect(current.total).toBe(32000); // 35000 - 3000
    expect(current.orderCount).toBe(3); // credit_card 2件 + bank_transfer 1件
    expect(current.uniquePatients).toBe(3); // p1, p2, p3
  });

  it("年別トレンド: granularity=yearlyを指定すると年別データを返す", async () => {
    tableChains["orders"] = [
      createChain({ data: [], error: null }),
      createChain({ data: [], error: null }),
      createChain({ data: [], error: null }),
    ];

    const req = createNextRequest("http://localhost/api/admin/dashboard-trends?granularity=yearly");
    const res = await GET(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.granularity).toBe("yearly");
    expect(Array.isArray(json.trends)).toBe(true);
    // 6年分（過去5年 + 今年）
    expect(json.trends.length).toBe(6);
    // ラベルが「YYYY年」形式であること
    for (const t of json.trends) {
      expect(t.label).toMatch(/^\d{4}年$/);
    }
  });

  it("Supabaseエラー時は500を返す", async () => {
    // withTenantがエラーをスローするケースをシミュレート
    const { withTenant } = await import("@/lib/tenant");
    (withTenant as Mock).mockRejectedValueOnce(new Error("DB接続エラー"));

    const req = createNextRequest("http://localhost/api/admin/dashboard-trends");
    const res = await GET(req);
    expect(res.status).toBe(500);
  });
});
