// __tests__/api/coupon-redeem.test.ts
// クーポン利用記録 API のテスト
// 対象: app/api/coupon/redeem/route.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- チェーン生成ヘルパー ---
function createChain(defaultResolve = { data: null, error: null }) {
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

import { POST } from "@/app/api/coupon/redeem/route";
import { parseBody } from "@/lib/validations/helpers";
import { supabaseAdmin } from "@/lib/supabase";

describe("クーポン利用記録 API (coupon/redeem/route.ts)", () => {
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

    const req = createMockRequest("POST", "http://localhost/api/coupon/redeem", {});
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  // ========================================
  // 既存の配布レコードがある → update で "used" にする
  // ========================================
  it("issued レコードあり → update で used にする", async () => {
    (parseBody as any).mockResolvedValue({
      data: { coupon_id: "c-1", patient_id: "pat-1", order_id: "ord-1" },
    });

    // coupon_issues の select → issued レコードが見つかる
    const issuesChain = createChain({ data: { id: "issue-100" }, error: null });
    tableChains["coupon_issues"] = issuesChain;

    const req = createMockRequest("POST", "http://localhost/api/coupon/redeem", {});
    const res = await POST(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);

    // update が呼ばれたことを確認
    expect(issuesChain.update).toHaveBeenCalled();
    const updateArgs = issuesChain.update.mock.calls[0][0];
    expect(updateArgs.status).toBe("used");
    expect(updateArgs.order_id).toBe("ord-1");
    expect(updateArgs.used_at).toBeDefined();

    // eq("id", "issue-100") でフィルタ
    expect(issuesChain.eq).toHaveBeenCalledWith("id", "issue-100");
  });

  // ========================================
  // 配布レコードなし → insert で直接利用として記録
  // ========================================
  it("issued レコードなし → insert で直接利用記録を作成", async () => {
    (parseBody as any).mockResolvedValue({
      data: { coupon_id: "c-2", patient_id: "pat-2", order_id: "ord-2" },
    });

    // coupon_issues の select → null（見つからない）
    const issuesChain = createChain({ data: null, error: null });
    tableChains["coupon_issues"] = issuesChain;

    const req = createMockRequest("POST", "http://localhost/api/coupon/redeem", {});
    const res = await POST(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);

    // insert が呼ばれたことを確認
    expect(issuesChain.insert).toHaveBeenCalled();
    const insertArgs = issuesChain.insert.mock.calls[0][0];
    expect(insertArgs.coupon_id).toBe("c-2");
    expect(insertArgs.patient_id).toBe("pat-2");
    expect(insertArgs.status).toBe("used");
    expect(insertArgs.order_id).toBe("ord-2");
    expect(insertArgs.used_at).toBeDefined();
    // tenantPayload が含まれる
    expect(insertArgs.tenant_id).toBe("test-tenant");
  });

  // ========================================
  // order_id が未指定 → null として保存
  // ========================================
  it("order_id が未指定 → null で保存される", async () => {
    (parseBody as any).mockResolvedValue({
      data: { coupon_id: "c-3", patient_id: "pat-3" },
    });

    // coupon_issues の select → null
    const issuesChain = createChain({ data: null, error: null });
    tableChains["coupon_issues"] = issuesChain;

    const req = createMockRequest("POST", "http://localhost/api/coupon/redeem", {});
    const res = await POST(req);

    expect(res.status).toBe(200);

    // insert の order_id が null
    const insertArgs = issuesChain.insert.mock.calls[0][0];
    expect(insertArgs.order_id).toBeNull();
  });

  // ========================================
  // select クエリが正しいフィルタで呼ばれる
  // ========================================
  it("select クエリが coupon_id + patient_id + status=issued でフィルタされる", async () => {
    (parseBody as any).mockResolvedValue({
      data: { coupon_id: "c-4", patient_id: "pat-4" },
    });

    const issuesChain = createChain({ data: null, error: null });
    tableChains["coupon_issues"] = issuesChain;

    const req = createMockRequest("POST", "http://localhost/api/coupon/redeem", {});
    await POST(req);

    // eq チェーン確認
    expect(issuesChain.eq).toHaveBeenCalledWith("coupon_id", "c-4");
    expect(issuesChain.eq).toHaveBeenCalledWith("patient_id", "pat-4");
    expect(issuesChain.eq).toHaveBeenCalledWith("status", "issued");
    expect(issuesChain.limit).toHaveBeenCalledWith(1);
    expect(issuesChain.maybeSingle).toHaveBeenCalled();
  });

  // ========================================
  // issued レコードあり + order_id 未指定の場合
  // ========================================
  it("issued レコードあり + order_id 未指定 → order_id: null で update", async () => {
    (parseBody as any).mockResolvedValue({
      data: { coupon_id: "c-5", patient_id: "pat-5" },
    });

    const issuesChain = createChain({ data: { id: "issue-200" }, error: null });
    tableChains["coupon_issues"] = issuesChain;

    const req = createMockRequest("POST", "http://localhost/api/coupon/redeem", {});
    await POST(req);

    const updateArgs = issuesChain.update.mock.calls[0][0];
    expect(updateArgs.order_id).toBeNull();
  });
});
