// __tests__/api/bank-transfer-pending.test.ts
// 銀行振込 pending 注文一覧APIのテスト
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

// --- Supabase チェーンモック ---
function createChain(defaultResolve = { data: [], error: null }) {
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

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn((...args: any[]) => {
      const result = fromResults[fromCallIndex] || createChain();
      fromCallIndex++;
      return result;
    }),
  })),
}));

import { GET } from "@/app/api/admin/bank-transfer/pending/route";
import { NextRequest } from "next/server";

function makeRequest() {
  return new NextRequest("http://localhost/api/admin/bank-transfer/pending", {
    method: "GET",
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuthorized = true;
  fromResults = [];
  fromCallIndex = 0;
});

describe("GET /api/admin/bank-transfer/pending", () => {
  it("認証失敗 → 401", async () => {
    mockAuthorized = false;

    const res = await GET(makeRequest());
    expect(res.status).toBe(401);

    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("正常: pending 注文一覧を返す", async () => {
    // 1回目: orders 取得
    const ordersChain = createChain({
      data: [
        {
          id: "order-1",
          patient_id: "P-1",
          product_code: "MJL_2.5mg_1m",
          amount: 30000,
          shipping_name: "田中太郎",
          account_name: "タナカタロウ",
          address: "東京都渋谷区",
          postal_code: "150-0001",
          phone: "09012345678",
          created_at: "2026-02-20T00:00:00Z",
        },
      ],
      error: null,
    });
    fromResults.push(ordersChain);

    // 2回目: patients 名前取得
    const patientsChain = createChain({
      data: [{ patient_id: "P-1", name: "田中太郎" }],
      error: null,
    });
    fromResults.push(patientsChain);

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.orders).toHaveLength(1);
    expect(body.orders[0].id).toBe("order-1");
    expect(body.orders[0].patient_name).toBe("田中太郎");
    expect(body.orders[0].product_name).toBe("マンジャロ 2.5mg 1ヶ月");
  });

  it("0件: 空配列を返す", async () => {
    // orders: 0件
    const ordersChain = createChain({ data: [], error: null });
    fromResults.push(ordersChain);

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.orders).toHaveLength(0);
  });

  it("DB エラー → 500", async () => {
    const ordersChain = createChain({
      data: null,
      error: { message: "connection error" },
    });
    fromResults.push(ordersChain);

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await GET(makeRequest());
    expect(res.status).toBe(500);

    const body = await res.json();
    expect(body.error).toBe("Database error");
    consoleSpy.mockRestore();
  });

  it("product_code が不明 → そのまま返す", async () => {
    const ordersChain = createChain({
      data: [
        {
          id: "order-2",
          patient_id: "P-2",
          product_code: "UNKNOWN_CODE",
          amount: 99999,
          shipping_name: "",
          account_name: "",
          address: "",
          postal_code: "",
          phone: "",
          created_at: "2026-02-21T00:00:00Z",
        },
      ],
      error: null,
    });
    fromResults.push(ordersChain);

    const patientsChain = createChain({ data: [], error: null });
    fromResults.push(patientsChain);

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);

    const body = await res.json();
    // product_name は product_code がそのまま表示される
    expect(body.orders[0].product_name).toBe("UNKNOWN_CODE");
    // 患者名が見つからない場合は空文字
    expect(body.orders[0].patient_name).toBe("");
  });

  it("複数注文: 複数患者の名前を取得", async () => {
    const ordersChain = createChain({
      data: [
        { id: "o-1", patient_id: "P-1", product_code: "MJL_5mg_1m", amount: 50000, shipping_name: "", account_name: "", address: "", postal_code: "", phone: "", created_at: "2026-02-20" },
        { id: "o-2", patient_id: "P-2", product_code: "MJL_5mg_2m", amount: 90000, shipping_name: "", account_name: "", address: "", postal_code: "", phone: "", created_at: "2026-02-21" },
      ],
      error: null,
    });
    fromResults.push(ordersChain);

    const patientsChain = createChain({
      data: [
        { patient_id: "P-1", name: "鈴木花子" },
        { patient_id: "P-2", name: "佐藤次郎" },
      ],
      error: null,
    });
    fromResults.push(patientsChain);

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.orders).toHaveLength(2);
    expect(body.orders[0].patient_name).toBe("鈴木花子");
    expect(body.orders[1].patient_name).toBe("佐藤次郎");
  });
});
