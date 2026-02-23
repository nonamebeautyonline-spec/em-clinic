// __tests__/api/coupon-validate.test.ts
// クーポン検証 API のテスト
// 対象: app/api/coupon/validate/route.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- チェーン生成ヘルパー ---
function createChain(defaultResolve = { data: null, error: null, count: 0 }) {
  const chain: any = {};
  [
    "insert", "update", "delete", "select", "eq", "neq", "gt", "gte", "lt", "lte",
    "in", "is", "not", "order", "limit", "range", "single", "maybeSingle", "upsert",
    "ilike", "or", "count", "csv",
  ].forEach(m => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.then = vi.fn((resolve: any) => resolve(defaultResolve));
  return chain;
}

let tableChains: Record<string, any> = {};
function getOrCreateChain(table: string) {
  if (!tableChains[table]) tableChains[table] = createChain();
  return tableChains[table];
}

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: { from: vi.fn((table: string) => getOrCreateChain(table)) },
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  withTenant: vi.fn((q: any) => q),
  tenantPayload: vi.fn(() => ({ tenant_id: "test-tenant" })),
}));

// parseBody モック
vi.mock("@/lib/validations/helpers", () => ({
  parseBody: vi.fn(),
}));

// NextRequest互換のモック
function createMockRequest(method: string, url: string, body?: any) {
  const parsedUrl = new URL(url);
  return {
    method,
    url,
    nextUrl: { searchParams: parsedUrl.searchParams },
    cookies: { get: vi.fn(() => undefined) },
    headers: { get: vi.fn(() => null) },
    json: body ? vi.fn().mockResolvedValue(body) : vi.fn(),
  } as any;
}

// チェーンをリセットするヘルパー
function resetChain(chain: any, defaultResolve = { data: null, error: null, count: 0 }) {
  [
    "insert", "update", "delete", "select", "eq", "neq", "gt", "gte", "lt", "lte",
    "in", "is", "not", "order", "limit", "range", "single", "maybeSingle", "upsert",
    "ilike", "or", "count", "csv",
  ].forEach(m => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.then = vi.fn((resolve: any) => resolve(defaultResolve));
}

import { POST } from "@/app/api/coupon/validate/route";
import { parseBody } from "@/lib/validations/helpers";

describe("クーポン検証 API (coupon/validate/route.ts)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableChains = {};
  });

  // ========================================
  // バリデーション
  // ========================================
  it("バリデーションエラー → parseBody のエラーレスポンスを返す", async () => {
    const errorResponse = new Response(JSON.stringify({ error: "入力値が不正です" }), { status: 400 });
    (parseBody as any).mockResolvedValue({ error: errorResponse });

    const req = createMockRequest("POST", "http://localhost/api/coupon/validate", {});
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  // ========================================
  // クーポンが見つからない
  // ========================================
  it("クーポンが存在しない → valid: false", async () => {
    (parseBody as any).mockResolvedValue({ data: { code: "INVALID", patient_id: "pat-1" } });

    const couponsChain = createChain({ data: null, error: null });
    tableChains["coupons"] = couponsChain;

    const req = createMockRequest("POST", "http://localhost/api/coupon/validate", {
      code: "INVALID",
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.valid).toBe(false);
    expect(json.error).toBe("無効なクーポンコードです");
  });

  // ========================================
  // コードの正規化（trim + toUpperCase）
  // ========================================
  it("コードが小文字・空白あり → 大文字・トリムされてクエリされる", async () => {
    (parseBody as any).mockResolvedValue({ data: { code: " abc123 " } });

    const couponsChain = createChain({ data: null, error: null });
    tableChains["coupons"] = couponsChain;

    const req = createMockRequest("POST", "http://localhost/api/coupon/validate", {});
    await POST(req);

    // eq("code", "ABC123") が呼ばれる
    expect(couponsChain.eq).toHaveBeenCalledWith("code", "ABC123");
  });

  // ========================================
  // 有効期限チェック: まだ有効期間前
  // ========================================
  it("有効期限前 → valid: false", async () => {
    const futureCoupon = {
      id: "c-1",
      code: "FUTURE",
      is_active: true,
      valid_from: "2099-01-01T00:00:00Z",
      valid_until: "2099-12-31T23:59:59Z",
      max_uses: null,
      max_uses_per_patient: null,
      name: "未来クーポン",
      discount_type: "fixed",
      discount_value: 1000,
      min_purchase: null,
    };
    (parseBody as any).mockResolvedValue({ data: { code: "FUTURE" } });

    const couponsChain = createChain({ data: futureCoupon, error: null });
    tableChains["coupons"] = couponsChain;

    const req = createMockRequest("POST", "http://localhost/api/coupon/validate", {});
    const res = await POST(req);
    const json = await res.json();
    expect(json.valid).toBe(false);
    expect(json.error).toBe("このクーポンはまだ有効期間前です");
  });

  // ========================================
  // 有効期限チェック: 期限切れ
  // ========================================
  it("有効期限切れ → valid: false", async () => {
    const expiredCoupon = {
      id: "c-2",
      code: "EXPIRED",
      is_active: true,
      valid_from: "2020-01-01T00:00:00Z",
      valid_until: "2020-12-31T23:59:59Z",
      max_uses: null,
      max_uses_per_patient: null,
      name: "期限切れクーポン",
      discount_type: "fixed",
      discount_value: 500,
      min_purchase: null,
    };
    (parseBody as any).mockResolvedValue({ data: { code: "EXPIRED" } });

    const couponsChain = createChain({ data: expiredCoupon, error: null });
    tableChains["coupons"] = couponsChain;

    const req = createMockRequest("POST", "http://localhost/api/coupon/validate", {});
    const res = await POST(req);
    const json = await res.json();
    expect(json.valid).toBe(false);
    expect(json.error).toBe("このクーポンは有効期限切れです");
  });

  // ========================================
  // 全体利用上限チェック
  // ========================================
  it("全体利用上限に達している → valid: false", async () => {
    const coupon = {
      id: "c-3",
      code: "MAXED",
      is_active: true,
      valid_from: null,
      valid_until: null,
      max_uses: 5,
      max_uses_per_patient: null,
      name: "上限到達クーポン",
      discount_type: "percentage",
      discount_value: 10,
      min_purchase: null,
    };
    (parseBody as any).mockResolvedValue({ data: { code: "MAXED" } });

    const couponsChain = createChain({ data: coupon, error: null });
    tableChains["coupons"] = couponsChain;

    // coupon_issues の count → max_uses以上
    const issuesChain = createChain({ data: null, error: null, count: 5 });
    tableChains["coupon_issues"] = issuesChain;

    const req = createMockRequest("POST", "http://localhost/api/coupon/validate", {});
    const res = await POST(req);
    const json = await res.json();
    expect(json.valid).toBe(false);
    expect(json.error).toBe("このクーポンは利用上限に達しています");
  });

  // ========================================
  // 患者別利用上限チェック
  // ========================================
  it("患者別利用上限に達している → valid: false", async () => {
    const coupon = {
      id: "c-4",
      code: "PERPATIENT",
      is_active: true,
      valid_from: null,
      valid_until: null,
      max_uses: null,
      max_uses_per_patient: 1,
      name: "1人1回クーポン",
      discount_type: "fixed",
      discount_value: 2000,
      min_purchase: null,
    };
    (parseBody as any).mockResolvedValue({ data: { code: "PERPATIENT", patient_id: "pat-1" } });

    const couponsChain = createChain({ data: coupon, error: null });
    tableChains["coupons"] = couponsChain;

    // coupon_issues: 患者別の利用数 = max_uses_per_patient
    const issuesChain = createChain({ data: null, error: null, count: 1 });
    tableChains["coupon_issues"] = issuesChain;

    const req = createMockRequest("POST", "http://localhost/api/coupon/validate", {});
    const res = await POST(req);
    const json = await res.json();
    expect(json.valid).toBe(false);
    expect(json.error).toBe("このクーポンは既にご利用済みです");
  });

  // ========================================
  // 正常系: 有効なクーポン
  // ========================================
  it("有効なクーポン → valid: true + クーポン情報", async () => {
    const coupon = {
      id: "c-5",
      code: "VALID2026",
      is_active: true,
      valid_from: "2025-01-01T00:00:00Z",
      valid_until: "2099-12-31T23:59:59Z",
      max_uses: 100,
      max_uses_per_patient: 3,
      name: "有効クーポン",
      discount_type: "fixed",
      discount_value: 1000,
      min_purchase: 5000,
    };
    (parseBody as any).mockResolvedValue({ data: { code: "VALID2026", patient_id: "pat-1" } });

    const couponsChain = createChain({ data: coupon, error: null });
    tableChains["coupons"] = couponsChain;

    // 全体利用数: 上限未満
    // 注意: coupon_issues は2回呼ばれる（全体 + 患者別）ので、
    // then を2回とも count: 0 で返すように設定
    const issuesChain = createChain({ data: null, error: null, count: 0 });
    tableChains["coupon_issues"] = issuesChain;

    const req = createMockRequest("POST", "http://localhost/api/coupon/validate", {});
    const res = await POST(req);
    const json = await res.json();
    expect(json.valid).toBe(true);
    expect(json.coupon.id).toBe("c-5");
    expect(json.coupon.name).toBe("有効クーポン");
    expect(json.coupon.code).toBe("VALID2026");
    expect(json.coupon.discount_type).toBe("fixed");
    expect(json.coupon.discount_value).toBe(1000);
    expect(json.coupon.min_purchase).toBe(5000);
  });

  // ========================================
  // 有効期限なし（null）→ 期限チェックスキップ
  // ========================================
  it("valid_from/valid_until が null → 期限チェックをスキップ", async () => {
    const coupon = {
      id: "c-6",
      code: "NOLIMIT",
      is_active: true,
      valid_from: null,
      valid_until: null,
      max_uses: null,
      max_uses_per_patient: null,
      name: "無期限クーポン",
      discount_type: "percentage",
      discount_value: 20,
      min_purchase: null,
    };
    (parseBody as any).mockResolvedValue({ data: { code: "NOLIMIT" } });

    const couponsChain = createChain({ data: coupon, error: null });
    tableChains["coupons"] = couponsChain;

    const req = createMockRequest("POST", "http://localhost/api/coupon/validate", {});
    const res = await POST(req);
    const json = await res.json();
    expect(json.valid).toBe(true);
    expect(json.coupon.discount_type).toBe("percentage");
  });

  // ========================================
  // patient_id なし → 患者別チェックスキップ
  // ========================================
  it("patient_id が未指定 → 患者別利用上限チェックをスキップ", async () => {
    const coupon = {
      id: "c-7",
      code: "NOPATIENT",
      is_active: true,
      valid_from: null,
      valid_until: null,
      max_uses: null,
      max_uses_per_patient: 1,
      name: "患者チェックスキップ",
      discount_type: "fixed",
      discount_value: 500,
      min_purchase: null,
    };
    // patient_id を渡さない
    (parseBody as any).mockResolvedValue({ data: { code: "NOPATIENT" } });

    const couponsChain = createChain({ data: coupon, error: null });
    tableChains["coupons"] = couponsChain;

    const req = createMockRequest("POST", "http://localhost/api/coupon/validate", {});
    const res = await POST(req);
    const json = await res.json();
    // 患者別チェックがスキップされるので valid
    expect(json.valid).toBe(true);
  });
});
