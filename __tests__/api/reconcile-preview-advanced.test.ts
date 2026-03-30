// __tests__/api/reconcile-preview-advanced.test.ts
// 銀行振込CSV照合プレビューAPIの追加テスト（分割振込検出・カナ正規化・全明細パース）
// 対象: app/api/admin/bank-transfer/reconcile/preview/route.ts

import { describe, it, expect, vi, beforeEach } from "vitest";

// --- 認証モック ---
let mockAuthorized = true;
vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: vi.fn(async () => mockAuthorized),
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => null),
  resolveTenantIdOrThrow: vi.fn(() => null),
  withTenant: vi.fn((q: unknown) => q),
  strictWithTenant: vi.fn((q: unknown) => q),
}));

vi.mock("@/lib/settings", () => ({
  getSetting: vi.fn(async () => null),
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(),
}));

// --- Supabase チェーンモック ---
function createChain(defaultResolve = { data: [], error: null }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  [
    "insert", "update", "delete", "select", "eq", "neq",
    "in", "is", "not", "order", "limit", "range", "single",
    "maybeSingle", "upsert", "like", "gte", "lte",
  ].forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.then = vi.fn((resolve: (val: unknown) => void) => resolve(defaultResolve));
  return chain;
}

let fromResults: ReturnType<typeof createChain>[] = [];
let fromCallIndex = 0;

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn((..._args: unknown[]) => {
      const result = fromResults[fromCallIndex] || createChain();
      fromCallIndex++;
      return result;
    }),
  })),
}));

import { POST } from "@/app/api/admin/bank-transfer/reconcile/preview/route";
import { NextRequest } from "next/server";

// TextDecoder モック（shift_jis → UTF-8）
const OriginalTextDecoder = globalThis.TextDecoder;
class MockTextDecoder {
  private decoder: InstanceType<typeof OriginalTextDecoder>;
  constructor(_encoding?: string) {
    this.decoder = new OriginalTextDecoder("utf-8");
  }
  decode(input?: BufferSource) {
    return this.decoder.decode(input);
  }
}
vi.stubGlobal("TextDecoder", MockTextDecoder);

function makeRequest(csvContent: string, csvFormat?: string) {
  const formData = new FormData();
  const blob = new Blob([csvContent], { type: "text/csv" });
  formData.append("file", blob, "test.csv");
  if (csvFormat) formData.append("csvFormat", csvFormat);
  return new NextRequest("http://localhost/api/admin/bank-transfer/reconcile/preview", {
    method: "POST",
    body: formData,
  });
}

function emptyStatementsChain() {
  return createChain({ data: [], error: null });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuthorized = true;
  fromResults = [];
  fromCallIndex = 0;
});

describe("POST /api/admin/bank-transfer/reconcile/preview（追加テスト）", () => {
  // ------------------------------------------------------------------
  // 分割振込検出テスト
  // ------------------------------------------------------------------
  describe("分割振込検出", () => {
    it("同一名義人の2回振込が注文金額と合算一致 → splitMatched に分類", async () => {
      // 注文金額30000に対し、15000+15000の2回振込
      const csv = [
        "日付,摘要,出金,入金",
        "2026/03/01,タナカタロウ,0,15000",
        "2026/03/05,タナカタロウ,0,15000",
      ].join("\n");

      const ordersChain = createChain({
        data: [{
          id: "order-split",
          patient_id: "P-S1",
          product_code: "MJL_5mg_1m",
          amount: 30000,
          account_name: "タナカタロウ",
          shipping_name: "田中太郎",
        }],
        error: null,
      });
      fromResults.push(emptyStatementsChain());
      fromResults.push(ordersChain);

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const res = await POST(makeRequest(csv));
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.splitMatched).toHaveLength(1);
      expect(body.splitMatched[0].totalAmount).toBe(30000);
      expect(body.splitMatched[0].transfers).toHaveLength(2);
      expect(body.summary.splitMatched).toBe(1);
      consoleSpy.mockRestore();
    });

    it("合算金額が注文金額と不一致 → amountMismatch のまま", async () => {
      // 注文金額30000に対し、10000+12000=22000（不一致）
      const csv = [
        "日付,摘要,出金,入金",
        "2026/03/01,タナカタロウ,0,10000",
        "2026/03/05,タナカタロウ,0,12000",
      ].join("\n");

      const ordersChain = createChain({
        data: [{
          id: "order-mismatch",
          patient_id: "P-M1",
          product_code: "MJL_5mg_1m",
          amount: 30000,
          account_name: "タナカタロウ",
          shipping_name: "田中太郎",
        }],
        error: null,
      });
      fromResults.push(emptyStatementsChain());
      fromResults.push(ordersChain);

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const res = await POST(makeRequest(csv));
      const body = await res.json();

      expect(body.splitMatched).toHaveLength(0);
      expect(body.amountMismatch.length).toBeGreaterThan(0);
      consoleSpy.mockRestore();
    });
  });

  // ------------------------------------------------------------------
  // カナ正規化テスト（ロジック検証）
  // ------------------------------------------------------------------
  describe("カナ正規化（ロジック検証）", () => {
    // normalizeKanaはモジュール内部関数のため、照合結果で検証
    it("ひらがな入力でもカタカナ注文名と照合できる", async () => {
      // CSV側がひらがな、注文側がカタカナ
      const csv = "日付,摘要,出金,入金\n2026/03/01,たなかたろう,0,30000";

      const ordersChain = createChain({
        data: [{
          id: "order-hira",
          patient_id: "P-H1",
          product_code: "MJL_2.5mg_1m",
          amount: 30000,
          account_name: "タナカタロウ",
          shipping_name: "田中太郎",
        }],
        error: null,
      });
      fromResults.push(emptyStatementsChain());
      fromResults.push(ordersChain);

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const res = await POST(makeRequest(csv));
      const body = await res.json();
      expect(body.summary.matched).toBe(1);
      consoleSpy.mockRestore();
    });

    it("濁音半角カタカナでも正しく照合できる", async () => {
      // CSV側が半角濁音（ガ = ｶﾞ）
      const csv = "日付,摘要,出金,入金\n2026/03/01,ﾀﾅｶﾞﾀﾛｳ,0,25000";

      const ordersChain = createChain({
        data: [{
          id: "order-dakuten",
          patient_id: "P-D1",
          product_code: "MJL_2.5mg_1m",
          amount: 25000,
          account_name: "タナガタロウ",
          shipping_name: "田中太郎",
        }],
        error: null,
      });
      fromResults.push(emptyStatementsChain());
      fromResults.push(ordersChain);

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const res = await POST(makeRequest(csv));
      const body = await res.json();
      expect(body.summary.matched).toBe(1);
      consoleSpy.mockRestore();
    });
  });

  // ------------------------------------------------------------------
  // CSVパース詳細テスト
  // ------------------------------------------------------------------
  describe("CSVパース", () => {
    it("ダブルクォート付きCSVを正しくパースする", async () => {
      const csv = '日付,摘要,出金,入金\n2026/03/01,"タナカ,タロウ",0,30000';

      const ordersChain = createChain({
        data: [{
          id: "order-quote",
          patient_id: "P-Q1",
          product_code: "MJL_2.5mg_1m",
          amount: 30000,
          account_name: "タナカ,タロウ",
          shipping_name: "田中太郎",
        }],
        error: null,
      });
      fromResults.push(emptyStatementsChain());
      fromResults.push(ordersChain);

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const res = await POST(makeRequest(csv));
      const body = await res.json();
      // ダブルクォート内のカンマを含む名前で照合
      expect(body.summary.total).toBe(1);
      consoleSpy.mockRestore();
    });

    it("金額にカンマ区切り（円記号付き）があっても正しくパースする", async () => {
      const csv = "日付,摘要,出金,入金\n2026/03/01,テスト,0,\"1,000,000円\"";

      const ordersChain = createChain({
        data: [{
          id: "order-comma",
          patient_id: "P-C1",
          product_code: "MJL_10mg_3m",
          amount: 1000000,
          account_name: "テスト",
          shipping_name: "テスト",
        }],
        error: null,
      });
      fromResults.push(emptyStatementsChain());
      fromResults.push(ordersChain);

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const res = await POST(makeRequest(csv));
      const body = await res.json();
      expect(body.summary.matched).toBe(1);
      consoleSpy.mockRestore();
    });
  });

  // ------------------------------------------------------------------
  // デバッグ情報テスト
  // ------------------------------------------------------------------
  describe("デバッグ情報", () => {
    it("pending注文がある場合はdebug情報がレスポンスに含まれる", async () => {
      const csv = "日付,摘要,出金,入金\n2026/03/01,テスト,0,10000";

      const ordersChain = createChain({
        data: [{
          id: "order-dbg",
          patient_id: "P-D1",
          product_code: "MJL_2.5mg_1m",
          amount: 20000,
          account_name: "テスト",
          shipping_name: "テスト",
        }],
        error: null,
      });
      fromResults.push(emptyStatementsChain());
      fromResults.push(ordersChain);

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const res = await POST(makeRequest(csv));
      const body = await res.json();
      expect(body.debug).toBeDefined();
      expect(body.debug.totalTransfers).toBe(1);
      expect(body.debug.totalPendingOrders).toBe(1);
      consoleSpy.mockRestore();
    });
  });

  // ------------------------------------------------------------------
  // サマリー構造テスト
  // ------------------------------------------------------------------
  describe("サマリー構造", () => {
    it("pending注文がある場合のsummaryに必要なフィールドがすべて含まれる", async () => {
      const csv = "日付,摘要,出金,入金\n2026/03/01,フメイ,0,10000";

      const ordersChain = createChain({
        data: [{
          id: "order-sum",
          patient_id: "P-S1",
          product_code: "MJL_2.5mg_1m",
          amount: 20000,
          account_name: "サトウ",
          shipping_name: "佐藤",
        }],
        error: null,
      });
      fromResults.push(emptyStatementsChain());
      fromResults.push(ordersChain);

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const res = await POST(makeRequest(csv));
      const body = await res.json();
      expect(body.summary).toHaveProperty("total");
      expect(body.summary).toHaveProperty("skippedReconciled");
      expect(body.summary).toHaveProperty("matched");
      expect(body.summary).toHaveProperty("splitMatched");
      expect(body.summary).toHaveProperty("amountMismatch");
      expect(body.summary).toHaveProperty("unmatched");
      expect(body.summary).toHaveProperty("updated");
      consoleSpy.mockRestore();
    });
  });

  // ------------------------------------------------------------------
  // 複数注文の優先順位テスト
  // ------------------------------------------------------------------
  describe("照合優先順位", () => {
    it("同一名義人の複数注文から金額完全一致を優先する", async () => {
      const csv = "日付,摘要,出金,入金\n2026/03/01,ヤマダハナコ,0,25000";

      const ordersChain = createChain({
        data: [
          {
            id: "order-a",
            patient_id: "P-A",
            product_code: "MJL_5mg_1m",
            amount: 50000,
            account_name: "ヤマダハナコ",
            shipping_name: "山田花子",
          },
          {
            id: "order-b",
            patient_id: "P-A",
            product_code: "MJL_2.5mg_1m",
            amount: 25000,
            account_name: "ヤマダハナコ",
            shipping_name: "山田花子",
          },
        ],
        error: null,
      });
      fromResults.push(emptyStatementsChain());
      fromResults.push(ordersChain);

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const res = await POST(makeRequest(csv));
      const body = await res.json();
      // 金額一致（25000）のorder-bがマッチ
      expect(body.summary.matched).toBe(1);
      expect(body.matched[0].order.amount).toBe(25000);
      consoleSpy.mockRestore();
    });

    it("既に使用された注文は二重マッチしない", async () => {
      const csv = [
        "日付,摘要,出金,入金",
        "2026/03/01,タナカタロウ,0,30000",
        "2026/03/02,タナカタロウ,0,30000",
      ].join("\n");

      const ordersChain = createChain({
        data: [{
          id: "order-only",
          patient_id: "P-1",
          product_code: "MJL_2.5mg_1m",
          amount: 30000,
          account_name: "タナカタロウ",
          shipping_name: "田中太郎",
        }],
        error: null,
      });
      fromResults.push(emptyStatementsChain());
      fromResults.push(ordersChain);

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const res = await POST(makeRequest(csv));
      const body = await res.json();
      // 1件のみマッチ、残り1件はunmatched
      expect(body.summary.matched).toBe(1);
      expect(body.summary.unmatched).toBe(1);
      consoleSpy.mockRestore();
    });
  });
});
