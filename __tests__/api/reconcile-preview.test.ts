// __tests__/api/reconcile-preview.test.ts
// 銀行振込CSV照合プレビューAPIのテスト
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
    from: vi.fn((..._args: any[]) => {
      const result = fromResults[fromCallIndex] || createChain();
      fromCallIndex++;
      return result;
    }),
  })),
}));

import { POST } from "@/app/api/admin/bank-transfer/reconcile/preview/route";
import { NextRequest } from "next/server";

// --- TextDecoder モック ---
// route.ts は TextDecoder("shift_jis") を使うが、テストでは UTF-8 のバイト列を渡すので
// shift_jis デコーダーを UTF-8 デコーダーに差し替える
const OriginalTextDecoder = globalThis.TextDecoder;
class MockTextDecoder {
  private decoder: InstanceType<typeof OriginalTextDecoder>;
  constructor(_encoding?: string) {
    // 常に UTF-8 としてデコード
    this.decoder = new OriginalTextDecoder("utf-8");
  }
  decode(input?: BufferSource) {
    return this.decoder.decode(input);
  }
}
vi.stubGlobal("TextDecoder", MockTextDecoder);

// CSVファイル付きのFormDataリクエストを作成
function makeRequest(csvContent?: string) {
  const formData = new FormData();
  if (csvContent !== undefined) {
    const blob = new Blob([csvContent], { type: "text/csv" });
    formData.append("file", blob, "test.csv");
  }
  return new NextRequest("http://localhost/api/admin/bank-transfer/reconcile/preview", {
    method: "POST",
    body: formData,
  });
}

function makeRequestWithoutFile() {
  const formData = new FormData();
  return new NextRequest("http://localhost/api/admin/bank-transfer/reconcile/preview", {
    method: "POST",
    body: formData,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuthorized = true;
  fromResults = [];
  fromCallIndex = 0;
});

describe("POST /api/admin/bank-transfer/reconcile/preview", () => {
  it("認証失敗 → 401", async () => {
    mockAuthorized = false;

    const res = await POST(makeRequest("日付,摘要,出金,入金\n2026/02/20,タナカタロウ,0,30000"));
    expect(res.status).toBe(401);
  });

  it("CSV なし → 400", async () => {
    const res = await POST(makeRequestWithoutFile());
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toContain("CSVファイルが指定されていません");
  });

  it("CSV 空 → 400（入金データなし）", async () => {
    // ヘッダーのみ、入金額0の行のみ
    const csv = "日付,摘要,出金,入金\n2026/02/20,テスト,1000,0";

    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const res = await POST(makeRequest(csv));
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toContain("入金データが見つかりませんでした");
    consoleSpy.mockRestore();
  });

  it("正常: 金額と名義人で照合", async () => {
    const csv = "日付,摘要,出金,入金\n2026/02/20,タナカタロウ,0,30000";

    // pending注文
    const ordersChain = createChain({
      data: [{
        id: "order-1",
        patient_id: "P-1",
        product_code: "MJL_2.5mg_1m",
        amount: 30000,
        account_name: "タナカタロウ",
        shipping_name: "田中太郎",
      }],
      error: null,
    });
    fromResults.push(ordersChain);

    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const res = await POST(makeRequest(csv));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.summary.matched).toBe(1);
    expect(body.summary.unmatched).toBe(0);
    expect(body.matched[0].order.patient_id).toBe("P-1");
    consoleSpy.mockRestore();
  });

  it("金額不一致 → unmatched", async () => {
    const csv = "日付,摘要,出金,入金\n2026/02/20,タナカタロウ,0,50000";

    // pending注文（金額が異なる）
    const ordersChain = createChain({
      data: [{
        id: "order-1",
        patient_id: "P-1",
        product_code: "MJL_2.5mg_1m",
        amount: 30000,
        account_name: "タナカタロウ",
        shipping_name: "田中太郎",
      }],
      error: null,
    });
    fromResults.push(ordersChain);

    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const res = await POST(makeRequest(csv));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.summary.matched).toBe(0);
    expect(body.summary.unmatched).toBe(1);
    expect(body.unmatched[0].amount).toBe(50000);
    consoleSpy.mockRestore();
  });

  it("名義人不一致 → unmatched", async () => {
    const csv = "日付,摘要,出金,入金\n2026/02/20,スズキハナコ,0,30000";

    const ordersChain = createChain({
      data: [{
        id: "order-1",
        patient_id: "P-1",
        product_code: "MJL_2.5mg_1m",
        amount: 30000,
        account_name: "タナカタロウ",
        shipping_name: "田中太郎",
      }],
      error: null,
    });
    fromResults.push(ordersChain);

    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const res = await POST(makeRequest(csv));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.summary.matched).toBe(0);
    expect(body.summary.unmatched).toBe(1);
    consoleSpy.mockRestore();
  });

  it("pending 注文が0件 → 全て unmatched", async () => {
    const csv = "日付,摘要,出金,入金\n2026/02/20,タナカタロウ,0,30000";

    const ordersChain = createChain({ data: [], error: null });
    fromResults.push(ordersChain);

    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const res = await POST(makeRequest(csv));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.summary.matched).toBe(0);
    expect(body.unmatched[0].reason).toContain("照合待ちの注文がありません");
    consoleSpy.mockRestore();
  });

  it("複数行CSV: 2件中1件マッチ", async () => {
    const csv = "日付,摘要,出金,入金\n2026/02/20,タナカタロウ,0,30000\n2026/02/21,フメイ,0,99999";

    const ordersChain = createChain({
      data: [{
        id: "order-1",
        patient_id: "P-1",
        product_code: "MJL_2.5mg_1m",
        amount: 30000,
        account_name: "タナカタロウ",
        shipping_name: "田中太郎",
      }],
      error: null,
    });
    fromResults.push(ordersChain);

    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const res = await POST(makeRequest(csv));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.summary.total).toBe(2);
    expect(body.summary.matched).toBe(1);
    expect(body.summary.unmatched).toBe(1);
    consoleSpy.mockRestore();
  });

  it("カタカナ正規化: 半角→全角で照合", async () => {
    // CSV側は半角カタカナ
    const csv = "日付,摘要,出金,入金\n2026/02/20,ﾀﾅｶﾀﾛｳ,0,30000";

    const ordersChain = createChain({
      data: [{
        id: "order-1",
        patient_id: "P-1",
        product_code: "MJL_2.5mg_1m",
        amount: 30000,
        account_name: "タナカタロウ",
        shipping_name: "田中太郎",
      }],
      error: null,
    });
    fromResults.push(ordersChain);

    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const res = await POST(makeRequest(csv));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.summary.matched).toBe(1);
    consoleSpy.mockRestore();
  });

  it("account_name が空の注文はスキップ", async () => {
    const csv = "日付,摘要,出金,入金\n2026/02/20,タナカタロウ,0,30000";

    const ordersChain = createChain({
      data: [{
        id: "order-1",
        patient_id: "P-1",
        product_code: "MJL_2.5mg_1m",
        amount: 30000,
        account_name: "", // 空
        shipping_name: "田中太郎",
      }],
      error: null,
    });
    fromResults.push(ordersChain);

    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const res = await POST(makeRequest(csv));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.summary.matched).toBe(0);
    expect(body.summary.unmatched).toBe(1);
    consoleSpy.mockRestore();
  });

  it("プレビューなので updated は常に0", async () => {
    const csv = "日付,摘要,出金,入金\n2026/02/20,タナカタロウ,0,30000";

    const ordersChain = createChain({
      data: [{
        id: "order-1",
        patient_id: "P-1",
        product_code: "MJL_2.5mg_1m",
        amount: 30000,
        account_name: "タナカタロウ",
        shipping_name: "田中太郎",
      }],
      error: null,
    });
    fromResults.push(ordersChain);

    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const res = await POST(makeRequest(csv));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.summary.updated).toBe(0);
    // マッチしている場合は newPaymentId が null
    if (body.matched.length > 0) {
      expect(body.matched[0].newPaymentId).toBeNull();
    }
    consoleSpy.mockRestore();
  });

  it("DB取得エラー → 500", async () => {
    const csv = "日付,摘要,出金,入金\n2026/02/20,タナカタロウ,0,30000";

    const ordersChain = createChain({
      data: null,
      error: { message: "connection failed" },
    });
    fromResults.push(ordersChain);

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const res = await POST(makeRequest(csv));
    expect(res.status).toBe(500);

    const body = await res.json();
    expect(body.error).toContain("データ取得エラー");
    consoleSpy.mockRestore();
    logSpy.mockRestore();
  });
});
