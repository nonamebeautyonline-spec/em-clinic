// __tests__/api/bank-transfer-manual-confirm.test.ts
// 銀行振込手動確認APIのテスト
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- 認証モック ---
let mockAuthorized = true;
vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: vi.fn(async () => mockAuthorized),
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => null),
  withTenant: vi.fn((q: any) => q),
}));

// --- Zodバリデーション モック ---
vi.mock("@/lib/validations/helpers", () => ({
  parseBody: vi.fn(async (req: any, _schema: any) => {
    const body = await req.json();
    return { data: body };
  }),
}));

vi.mock("@/lib/validations/admin-operations", () => ({
  bankTransferManualConfirmSchema: {},
}));

// --- Supabase チェーンモック ---
function createChain(defaultResolve = { data: null, error: null }) {
  const chain: any = {};
  [
    "insert", "update", "delete", "select", "eq", "neq",
    "in", "is", "not", "order", "limit", "range", "single",
    "maybeSingle", "upsert", "like", "gte", "lte",
  ].forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.then = vi.fn((resolve: any) => resolve(defaultResolve));
  return chain;
}

// from の呼び出しごとに異なる結果を返すための配列
let fromResults: any[] = [];
let fromCallIndex = 0;

const mockFrom = vi.fn(() => {
  const result = fromResults[fromCallIndex] || createChain();
  fromCallIndex++;
  return result;
});

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: mockFrom,
  })),
}));

// fetch モック（キャッシュ無効化用）
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { POST } from "@/app/api/admin/bank-transfer/manual-confirm/route";
import { NextRequest } from "next/server";

function makeRequest(body: any) {
  return new NextRequest("http://localhost/api/admin/bank-transfer/manual-confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuthorized = true;
  fromResults = [];
  fromCallIndex = 0;
  mockFetch.mockResolvedValue({ ok: true });
});

describe("POST /api/admin/bank-transfer/manual-confirm", () => {
  it("認証失敗 → 401", async () => {
    mockAuthorized = false;

    const res = await POST(makeRequest({ order_id: "order-1" }));
    expect(res.status).toBe(401);

    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("注文なし → 404", async () => {
    // 1回目のfrom: orders select → single → 注文なし
    const orderChain = createChain({ data: null, error: { code: "PGRST116", message: "not found" } });
    fromResults.push(orderChain);

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await POST(makeRequest({ order_id: "order-notfound" }));
    expect(res.status).toBe(404);

    const body = await res.json();
    expect(body.error).toContain("注文が見つかりませんでした");
    consoleSpy.mockRestore();
  });

  it("非 bank_transfer → 400", async () => {
    // 注文はあるが payment_method が違う
    const orderChain = createChain({
      data: {
        id: "order-1",
        patient_id: "P-1",
        product_code: "MJL_2.5mg_1m",
        amount: 30000,
        status: "pending_confirmation",
        payment_method: "credit_card",
      },
      error: null,
    });
    fromResults.push(orderChain);

    const res = await POST(makeRequest({ order_id: "order-1" }));
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toContain("銀行振込以外の注文です");
  });

  it("既に処理済み → 400", async () => {
    const orderChain = createChain({
      data: {
        id: "order-1",
        patient_id: "P-1",
        product_code: "MJL_2.5mg_1m",
        amount: 30000,
        status: "confirmed",
        payment_method: "bank_transfer",
      },
      error: null,
    });
    fromResults.push(orderChain);

    const res = await POST(makeRequest({ order_id: "order-1" }));
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toContain("既に処理済み");
  });

  it("正常: 手動確認 → success", async () => {
    // 1回目: 注文取得
    const orderChain = createChain({
      data: {
        id: "order-1",
        patient_id: "P-1",
        product_code: "MJL_2.5mg_1m",
        amount: 30000,
        status: "pending_confirmation",
        payment_method: "bank_transfer",
      },
      error: null,
    });
    fromResults.push(orderChain);

    // 2回目: bt_xxx 採番用（既存のbt注文）
    const btChain = createChain({
      data: [{ id: "bt_5" }, { id: "bt_3" }, { id: "bt_notnum" }],
      error: null,
    });
    fromResults.push(btChain);

    // 3回目: 更新
    const updateChain = createChain({ error: null });
    fromResults.push(updateChain);

    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const res = await POST(makeRequest({ order_id: "order-1", memo: "テスト確認" }));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.old_id).toBe("order-1");
    expect(body.new_id).toBe("bt_6"); // bt_5の次
    consoleSpy.mockRestore();
  });

  it("正常: bt注文がない場合 → bt_1 が採番される", async () => {
    // 注文取得
    const orderChain = createChain({
      data: {
        id: "order-new",
        patient_id: "P-1",
        product_code: "MJL_5mg_1m",
        amount: 50000,
        status: "pending_confirmation",
        payment_method: "bank_transfer",
      },
      error: null,
    });
    fromResults.push(orderChain);

    // bt_xxx 採番: 既存なし
    const btChain = createChain({ data: [], error: null });
    fromResults.push(btChain);

    // 更新
    const updateChain = createChain({ error: null });
    fromResults.push(updateChain);

    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const res = await POST(makeRequest({ order_id: "order-new" }));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.new_id).toBe("bt_1");
    consoleSpy.mockRestore();
  });

  it("更新エラー → 500", async () => {
    // 注文取得
    const orderChain = createChain({
      data: {
        id: "order-1",
        patient_id: "P-1",
        product_code: "MJL_2.5mg_1m",
        amount: 30000,
        status: "pending_confirmation",
        payment_method: "bank_transfer",
      },
      error: null,
    });
    fromResults.push(orderChain);

    // bt_xxx 採番
    const btChain = createChain({ data: [], error: null });
    fromResults.push(btChain);

    // 更新失敗
    const updateChain = createChain({ error: { message: "DB write error" } });
    fromResults.push(updateChain);

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await POST(makeRequest({ order_id: "order-1" }));
    expect(res.status).toBe(500);
    consoleSpy.mockRestore();
  });
});
