// __tests__/api/reconcile-confirm.test.ts
// 銀行振込CSV照合確定APIのテスト
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
  bankTransferReconcileConfirmSchema: {},
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

import { POST } from "@/app/api/admin/bank-transfer/reconcile/confirm/route";
import { NextRequest } from "next/server";

function makeRequest(body: any) {
  return new NextRequest("http://localhost/api/admin/bank-transfer/reconcile/confirm", {
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

describe("POST /api/admin/bank-transfer/reconcile/confirm", () => {
  it("認証失敗 → 401", async () => {
    mockAuthorized = false;

    const res = await POST(makeRequest({
      matches: [{
        transfer: { date: "2026-02-20", description: "タナカタロウ", amount: 30000 },
        order: { patient_id: "P-1", product_code: "MJL_2.5mg_1m", amount: 30000 },
      }],
    }));
    expect(res.status).toBe(401);
  });

  it("正常: 1件確定", async () => {
    // 1回目: pendingOrders 検索
    const pendingChain = createChain({
      data: [{
        id: "order-1",
        patient_id: "P-1",
        product_code: "MJL_2.5mg_1m",
        amount: 30000,
      }],
      error: null,
    });
    fromResults.push(pendingChain);

    // 2回目: bt_xxx 採番
    const btChain = createChain({
      data: [{ id: "bt_3" }],
      error: null,
    });
    fromResults.push(btChain);

    // 3回目: 更新
    const updateChain = createChain({ error: null });
    fromResults.push(updateChain);

    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const res = await POST(makeRequest({
      matches: [{
        transfer: { date: "2026-02-20", description: "タナカタロウ", amount: 30000 },
        order: { patient_id: "P-1", product_code: "MJL_2.5mg_1m", amount: 30000 },
      }],
    }));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.summary.total).toBe(1);
    expect(body.summary.updated).toBe(1);
    expect(body.matched[0].newPaymentId).toBe("bt_4");
    expect(body.matched[0].updateSuccess).toBe(true);
    consoleSpy.mockRestore();
  });

  it("注文なし → 部分エラー", async () => {
    // pendingOrders なし
    const pendingChain = createChain({ data: [], error: null });
    fromResults.push(pendingChain);

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await POST(makeRequest({
      matches: [{
        transfer: { date: "2026-02-20", description: "不明", amount: 10000 },
        order: { patient_id: "P-999", product_code: "UNKNOWN", amount: 10000 },
      }],
    }));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.summary.updated).toBe(0);
    expect(body.matched[0].updateSuccess).toBe(false);
    consoleSpy.mockRestore();
  });

  it("複数件: 2件中1件成功、1件失敗", async () => {
    // --- 1件目 ---
    // pending検索: 見つかる
    const pending1 = createChain({
      data: [{ id: "order-1", patient_id: "P-1", product_code: "MJL_2.5mg_1m", amount: 30000 }],
      error: null,
    });
    fromResults.push(pending1);

    // bt_xxx 採番
    const bt1 = createChain({ data: [], error: null });
    fromResults.push(bt1);

    // 更新: 成功
    const update1 = createChain({ error: null });
    fromResults.push(update1);

    // --- 2件目 ---
    // pending検索: 見つからない
    const pending2 = createChain({ data: [], error: null });
    fromResults.push(pending2);

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const res = await POST(makeRequest({
      matches: [
        {
          transfer: { date: "2026-02-20", description: "タナカ", amount: 30000 },
          order: { patient_id: "P-1", product_code: "MJL_2.5mg_1m", amount: 30000 },
        },
        {
          transfer: { date: "2026-02-20", description: "不明", amount: 50000 },
          order: { patient_id: "P-999", product_code: "UNKNOWN", amount: 50000 },
        },
      ],
    }));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.summary.total).toBe(2);
    expect(body.summary.updated).toBe(1);
    expect(body.matched[0].updateSuccess).toBe(true);
    expect(body.matched[1].updateSuccess).toBe(false);
    consoleSpy.mockRestore();
    logSpy.mockRestore();
  });

  it("更新エラー → updateSuccess: false", async () => {
    // pending検索
    const pendingChain = createChain({
      data: [{ id: "order-1", patient_id: "P-1", product_code: "MJL_2.5mg_1m", amount: 30000 }],
      error: null,
    });
    fromResults.push(pendingChain);

    // bt_xxx 採番
    const btChain = createChain({ data: [], error: null });
    fromResults.push(btChain);

    // 更新失敗
    const updateChain = createChain({ error: { message: "write error" } });
    fromResults.push(updateChain);

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await POST(makeRequest({
      matches: [{
        transfer: { date: "2026-02-20", description: "タナカ", amount: 30000 },
        order: { patient_id: "P-1", product_code: "MJL_2.5mg_1m", amount: 30000 },
      }],
    }));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.summary.updated).toBe(0);
    expect(body.matched[0].updateSuccess).toBe(false);
    consoleSpy.mockRestore();
  });

  it("bt_xxx 最大番号を正しく採番", async () => {
    // pending検索
    const pendingChain = createChain({
      data: [{ id: "order-1", patient_id: "P-1", product_code: "MJL_2.5mg_1m", amount: 30000 }],
      error: null,
    });
    fromResults.push(pendingChain);

    // bt_xxx 採番: bt_10, bt_7, bt_invalid が既存
    const btChain = createChain({
      data: [{ id: "bt_10" }, { id: "bt_7" }, { id: "bt_invalid" }],
      error: null,
    });
    fromResults.push(btChain);

    // 更新成功
    const updateChain = createChain({ error: null });
    fromResults.push(updateChain);

    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const res = await POST(makeRequest({
      matches: [{
        transfer: { date: "2026-02-20", description: "タナカ", amount: 30000 },
        order: { patient_id: "P-1", product_code: "MJL_2.5mg_1m", amount: 30000 },
      }],
    }));

    const body = await res.json();
    expect(body.matched[0].newPaymentId).toBe("bt_11");
    consoleSpy.mockRestore();
  });
});
