// __tests__/api/coupon-analytics.test.ts
// クーポン効果分析 API のテスト
// 対象: app/api/admin/line/coupons/analytics/route.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";

// --- チェーン生成ヘルパー ---
type SupabaseChain = Record<string, Mock> & { then: Mock };

function createChain(defaultResolve: unknown = { data: null, error: null }): SupabaseChain {
  const chain = {} as SupabaseChain;
  [
    "insert", "update", "delete", "select", "eq", "neq", "gt", "gte", "lt", "lte",
    "in", "is", "not", "order", "limit", "range", "single", "maybeSingle", "upsert",
    "ilike", "or", "count", "csv",
  ].forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.then = vi.fn((resolve: (val: unknown) => unknown) => resolve(defaultResolve));
  return chain;
}

let tableChains: Record<string, SupabaseChain> = {};
function getOrCreateChain(table: string) {
  if (!tableChains[table]) tableChains[table] = createChain();
  return tableChains[table];
}

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: { from: vi.fn((table: string) => getOrCreateChain(table)) },
}));

vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: vi.fn(() => true),
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  withTenant: vi.fn((q: unknown) => q),
  tenantPayload: vi.fn(() => ({ tenant_id: "test-tenant" })),
}));

// NextRequest互換のモック
function createReq(url: string) {
  const parsedUrl = new URL(url);
  return {
    method: "GET",
    url,
    nextUrl: { searchParams: parsedUrl.searchParams },
    cookies: { get: vi.fn(() => undefined) },
    headers: { get: vi.fn(() => null) },
  } as unknown as import("next/server").NextRequest;
}

import { GET } from "@/app/api/admin/line/coupons/analytics/route";
import { verifyAdminAuth } from "@/lib/admin-auth";

describe("クーポン効果分析 API (coupon/analytics)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableChains = {};
  });

  // ========================================
  // 認証
  // ========================================
  it("未認証 → 401", async () => {
    vi.mocked(verifyAdminAuth).mockResolvedValue(false);
    const res = await GET(createReq("http://localhost/api/admin/line/coupons/analytics"));
    expect(res.status).toBe(401);
  });

  // ========================================
  // クーポンなし → 空レスポンス
  // ========================================
  it("クーポンが0件 → 空のサマリーを返す", async () => {
    vi.mocked(verifyAdminAuth).mockResolvedValue(true);
    tableChains["coupons"] = createChain({ data: [], error: null });

    const res = await GET(createReq("http://localhost/api/admin/line/coupons/analytics"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.summary.total_issued).toBe(0);
    expect(json.summary.total_used).toBe(0);
    expect(json.daily).toEqual([]);
    expect(json.by_coupon).toEqual([]);
  });

  // ========================================
  // 正常系: クーポンあり + issues あり
  // ========================================
  it("クーポンと配布データがある → サマリー・日別・クーポン別を返す", async () => {
    vi.mocked(verifyAdminAuth).mockResolvedValue(true);

    // クーポン2つ
    tableChains["coupons"] = createChain({
      data: [
        { id: 1, name: "初回1000円OFF", code: "FIRST1000", discount_type: "fixed", discount_value: 1000 },
        { id: 2, name: "10%OFF", code: "TENOFF", discount_type: "percent", discount_value: 10 },
      ],
      error: null,
    });

    // coupon_issues: 3件（2件利用済み）
    tableChains["coupon_issues"] = createChain({
      data: [
        { coupon_id: 1, status: "used", used_at: "2026-03-01T10:00:00Z", issued_at: "2026-03-01T09:00:00Z", order_id: "ord-1" },
        { coupon_id: 1, status: "issued", used_at: null, issued_at: "2026-03-02T09:00:00Z", order_id: null },
        { coupon_id: 2, status: "used", used_at: "2026-03-02T14:00:00Z", issued_at: "2026-03-01T09:00:00Z", order_id: "ord-2" },
      ],
      error: null,
    });

    // orders: 利用済みに紐づく注文
    tableChains["orders"] = createChain({
      data: [
        { id: "ord-1", amount: 5000 },
        { id: "ord-2", amount: 8000 },
      ],
      error: null,
    });

    const res = await GET(createReq("http://localhost/api/admin/line/coupons/analytics"));
    expect(res.status).toBe(200);
    const json = await res.json();

    // サマリー
    expect(json.summary.total_issued).toBe(3);
    expect(json.summary.total_used).toBe(2);
    expect(json.summary.usage_rate).toBeGreaterThan(0);
    expect(json.summary.total_discount).toBeGreaterThan(0);
    expect(json.summary.avg_order_amount).toBeGreaterThan(0);

    // 日別データがある
    expect(json.daily.length).toBeGreaterThan(0);
    for (const day of json.daily) {
      expect(day).toHaveProperty("date");
      expect(day).toHaveProperty("issued");
      expect(day).toHaveProperty("used");
    }

    // クーポン別データ
    expect(json.by_coupon.length).toBe(2);
    const c1 = json.by_coupon.find((c: { coupon_id: number }) => c.coupon_id === 1);
    expect(c1).toBeDefined();
    expect(c1.issued_count).toBe(2);
    expect(c1.used_count).toBe(1);
    expect(c1.usage_rate).toBe(50);

    const c2 = json.by_coupon.find((c: { coupon_id: number }) => c.coupon_id === 2);
    expect(c2).toBeDefined();
    expect(c2.issued_count).toBe(1);
    expect(c2.used_count).toBe(1);
    expect(c2.usage_rate).toBe(100);
  });

  // ========================================
  // 固定額割引の割引総額計算
  // ========================================
  it("固定額クーポン: 割引総額 = discount_value * 利用数", async () => {
    vi.mocked(verifyAdminAuth).mockResolvedValue(true);

    tableChains["coupons"] = createChain({
      data: [{ id: 1, name: "500円OFF", code: "FIX500", discount_type: "fixed", discount_value: 500 }],
      error: null,
    });

    tableChains["coupon_issues"] = createChain({
      data: [
        { coupon_id: 1, status: "used", used_at: "2026-03-01T10:00:00Z", issued_at: "2026-03-01T09:00:00Z", order_id: "ord-1" },
        { coupon_id: 1, status: "used", used_at: "2026-03-02T10:00:00Z", issued_at: "2026-03-02T09:00:00Z", order_id: "ord-2" },
      ],
      error: null,
    });

    tableChains["orders"] = createChain({
      data: [
        { id: "ord-1", amount: 3000 },
        { id: "ord-2", amount: 4000 },
      ],
      error: null,
    });

    const res = await GET(createReq("http://localhost/api/admin/line/coupons/analytics"));
    const json = await res.json();

    expect(json.summary.total_discount).toBe(1000); // 500 * 2
    expect(json.summary.avg_order_amount).toBe(3500); // (3000+4000)/2
  });

  // ========================================
  // パーセント割引の割引総額計算
  // ========================================
  it("パーセントクーポン: 割引総額 = 各注文額 * discount_value / 100 の合計", async () => {
    vi.mocked(verifyAdminAuth).mockResolvedValue(true);

    tableChains["coupons"] = createChain({
      data: [{ id: 1, name: "20%OFF", code: "PCT20", discount_type: "percent", discount_value: 20 }],
      error: null,
    });

    tableChains["coupon_issues"] = createChain({
      data: [
        { coupon_id: 1, status: "used", used_at: "2026-03-01T10:00:00Z", issued_at: "2026-03-01T09:00:00Z", order_id: "ord-1" },
      ],
      error: null,
    });

    tableChains["orders"] = createChain({
      data: [{ id: "ord-1", amount: 10000 }],
      error: null,
    });

    const res = await GET(createReq("http://localhost/api/admin/line/coupons/analytics"));
    const json = await res.json();

    expect(json.summary.total_discount).toBe(2000); // 10000 * 20%
    expect(json.by_coupon[0].total_discount).toBe(2000);
  });

  // ========================================
  // 期間フィルタ
  // ========================================
  it("from/toパラメータが渡されたとき、gteとlteが呼ばれる", async () => {
    vi.mocked(verifyAdminAuth).mockResolvedValue(true);

    // クーポンが1件以上ないとissuesクエリに到達しない
    tableChains["coupons"] = createChain({
      data: [{ id: 1, name: "test", code: "T", discount_type: "fixed", discount_value: 100 }],
      error: null,
    });
    const issuesChain = createChain({ data: [], error: null });
    tableChains["coupon_issues"] = issuesChain;

    await GET(createReq("http://localhost/api/admin/line/coupons/analytics?from=2026-03-01&to=2026-03-07"));

    expect(issuesChain.gte).toHaveBeenCalledWith("issued_at", "2026-03-01T00:00:00+09:00");
    expect(issuesChain.lte).toHaveBeenCalledWith("issued_at", "2026-03-07T23:59:59+09:00");
  });

  // ========================================
  // coupons取得エラー → 500
  // ========================================
  it("couponsテーブルのエラー → 500", async () => {
    vi.mocked(verifyAdminAuth).mockResolvedValue(true);
    tableChains["coupons"] = createChain({ data: null, error: { message: "DB error" } });

    const res = await GET(createReq("http://localhost/api/admin/line/coupons/analytics"));
    expect(res.status).toBe(500);
  });

  // ========================================
  // coupon_issues取得エラー → 500
  // ========================================
  it("coupon_issuesテーブルのエラー → 500", async () => {
    vi.mocked(verifyAdminAuth).mockResolvedValue(true);
    tableChains["coupons"] = createChain({
      data: [{ id: 1, name: "test", code: "T", discount_type: "fixed", discount_value: 100 }],
      error: null,
    });
    tableChains["coupon_issues"] = createChain({ data: null, error: { message: "issues error" } });

    const res = await GET(createReq("http://localhost/api/admin/line/coupons/analytics"));
    expect(res.status).toBe(500);
  });

  // ========================================
  // order_idがない利用 → 注文金額0、固定額のみ割引計算
  // ========================================
  it("order_idなしの利用レコード → 固定額割引のみ計上、平均注文額は0", async () => {
    vi.mocked(verifyAdminAuth).mockResolvedValue(true);

    tableChains["coupons"] = createChain({
      data: [{ id: 1, name: "300円OFF", code: "FIX300", discount_type: "fixed", discount_value: 300 }],
      error: null,
    });

    tableChains["coupon_issues"] = createChain({
      data: [
        { coupon_id: 1, status: "used", used_at: "2026-03-01T10:00:00Z", issued_at: "2026-03-01T09:00:00Z", order_id: null },
      ],
      error: null,
    });

    const res = await GET(createReq("http://localhost/api/admin/line/coupons/analytics"));
    const json = await res.json();

    expect(json.summary.total_discount).toBe(300);
    expect(json.summary.avg_order_amount).toBe(0);
  });
});
