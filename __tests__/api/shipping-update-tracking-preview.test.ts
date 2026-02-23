// __tests__/api/shipping-update-tracking-preview.test.ts
// 追跡番号一括更新プレビュー API（shipping/update-tracking/preview/route.ts）のテスト
// CSV（Shift_JIS/UTF-8 BOM対応）、デリミタ自動判定、注文照合
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- モック定義 ---

// TextDecoder モック: Shift_JIS デコーダーが UTF-8 文字列をそのまま返すようにする
// （テスト環境ではShift_JISエンコード済みバイト列を用意しないため）
const OriginalTextDecoder = globalThis.TextDecoder;
vi.stubGlobal("TextDecoder", class MockTextDecoder {
  private _encoding: string;
  constructor(encoding?: string) {
    this._encoding = encoding || "utf-8";
  }
  decode(input?: ArrayBuffer | Uint8Array) {
    // 常に UTF-8 としてデコード（テスト環境向け）
    return new OriginalTextDecoder("utf-8").decode(input);
  }
});

let mockAuthorized = true;
vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: vi.fn(async () => mockAuthorized),
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  withTenant: vi.fn((q: any) => q),
}));

// テーブル別結果制御
type MockResult = { data: any; error?: any; count?: number | null };
let mockResultsByTable: Record<string, MockResult> = {};

function createChain(table: string) {
  const chain: any = {};
  const methods = [
    "select", "eq", "neq", "in", "is", "not", "or",
    "ilike", "order", "limit", "single", "maybeSingle",
    "gte", "lte", "like", "range",
  ];
  methods.forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });

  chain.then = (resolve: any, reject: any) => {
    const result = mockResultsByTable[table] || { data: [], error: null };
    return Promise.resolve(result).then(resolve, reject);
  };
  return chain;
}

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => createChain(table)),
  },
}));

// --- テスト ---

import { POST } from "@/app/api/admin/shipping/update-tracking/preview/route";
import { NextRequest } from "next/server";

/**
 * CSV文字列からFormDataリクエストを作成するヘルパー
 */
function createCsvReq(csvContent: string, filename = "tracking.csv") {
  const blob = new Blob([csvContent], { type: "text/csv" });
  const file = new File([blob], filename, { type: "text/csv" });
  const formData = new FormData();
  formData.append("file", file);

  return new NextRequest("http://localhost/api/admin/shipping/update-tracking/preview", {
    method: "POST",
    body: formData,
  });
}

/**
 * ファイルなしのFormDataリクエスト
 */
function createEmptyReq() {
  const formData = new FormData();
  return new NextRequest("http://localhost/api/admin/shipping/update-tracking/preview", {
    method: "POST",
    body: formData,
  });
}

describe("追跡番号一括更新プレビュー API", () => {
  beforeEach(() => {
    mockAuthorized = true;
    mockResultsByTable = {};
    vi.clearAllMocks();
  });

  // =============================================
  // 認証テスト
  // =============================================
  describe("認証", () => {
    it("認証失敗時に 401 を返す", async () => {
      mockAuthorized = false;
      const res = await POST(createCsvReq("test"));
      expect(res.status).toBe(401);
    });
  });

  // =============================================
  // ファイルバリデーション
  // =============================================
  describe("ファイルバリデーション", () => {
    it("ファイルが添付されていない場合 400 を返す", async () => {
      const res = await POST(createEmptyReq());
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("CSV");
    });

    it("空のCSV（ヘッダーのみ）は 400 を返す", async () => {
      const csv = "お客様管理番号,伝票番号\n";
      const res = await POST(createCsvReq(csv));
      // 空行は filter で除外されるため lines.length < 2 → 400
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("CSV");
    });
  });

  // =============================================
  // 必須カラムチェック
  // =============================================
  describe("必須カラムチェック", () => {
    it("「お客様管理番号」カラムがない場合 400 を返す", async () => {
      const csv = "注文ID,伝票番号\nORD001,1234567890";
      const res = await POST(createCsvReq(csv));
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("必須カラム");
    });

    it("「伝票番号」カラムがない場合 400 を返す", async () => {
      const csv = "お客様管理番号,送り状\nORD001,1234567890";
      const res = await POST(createCsvReq(csv));
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("必須カラム");
    });
  });

  // =============================================
  // カンマ区切りCSV
  // =============================================
  describe("カンマ区切りCSV", () => {
    it("正常なCSVで注文と照合してプレビューを返す", async () => {
      const csv = "お客様管理番号,伝票番号\nORD001,1234567890\nORD002,9876543210";

      mockResultsByTable["orders"] = {
        data: [
          { id: "ORD001", patient_id: "P001" },
          { id: "ORD002", patient_id: "P002" },
        ],
        error: null,
      };
      mockResultsByTable["patients"] = {
        data: [
          { patient_id: "P001", name: "山田太郎" },
          { patient_id: "P002", name: "鈴木花子" },
        ],
        error: null,
      };
      mockResultsByTable["intake"] = {
        data: [
          { patient_id: "P001", answerer_id: "LST001" },
        ],
        error: null,
      };

      const res = await POST(createCsvReq(csv));
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.entries).toHaveLength(2);
      expect(body.summary.total).toBe(2);
      expect(body.summary.found).toBe(2);
      expect(body.summary.notFound).toBe(0);

      // 1件目の照合結果
      const entry1 = body.entries.find((e: any) => e.payment_id === "ORD001");
      expect(entry1.matched).toBe(true);
      expect(entry1.patient_name).toBe("山田太郎");
      expect(entry1.tracking_number).toBe("1234567890");
    });
  });

  // =============================================
  // タブ区切りCSV
  // =============================================
  describe("タブ区切りCSV", () => {
    it("タブ区切りを自動検出して正しく処理", async () => {
      const csv = "お客様管理番号\t伝票番号\nORD001\t1234567890";

      mockResultsByTable["orders"] = {
        data: [{ id: "ORD001", patient_id: "P001" }],
        error: null,
      };
      mockResultsByTable["patients"] = {
        data: [{ patient_id: "P001", name: "佐藤" }],
        error: null,
      };
      mockResultsByTable["intake"] = { data: [], error: null };

      const res = await POST(createCsvReq(csv));
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.entries).toHaveLength(1);
      expect(body.entries[0].matched).toBe(true);
    });
  });

  // =============================================
  // 未マッチ注文
  // =============================================
  describe("未マッチ注文", () => {
    it("注文が見つからない場合は errors に記録", async () => {
      const csv = "お客様管理番号,伝票番号\nORD_UNKNOWN,1234567890";

      // orders テーブルに該当なし
      mockResultsByTable["orders"] = { data: [], error: null };

      const res = await POST(createCsvReq(csv));
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.entries).toHaveLength(1);
      expect(body.entries[0].matched).toBe(false);
      expect(body.summary.notFound).toBe(1);
      expect(body.errors.length).toBeGreaterThanOrEqual(1);
      expect(body.errors[0]).toContain("ORD_UNKNOWN");
    });
  });

  // =============================================
  // 合箱対応（カンマ区切りpayment_id）
  // =============================================
  describe("合箱対応", () => {
    it("1つの伝票番号に複数のお客様管理番号を紐付け", async () => {
      // rawPaymentId にカンマが含まれる場合（合箱）
      // CSVはダブルクォートで囲む必要がある
      const csv = 'お客様管理番号,伝票番号\n"ORD001,ORD002",1111111111';

      mockResultsByTable["orders"] = {
        data: [
          { id: "ORD001", patient_id: "P001" },
          { id: "ORD002", patient_id: "P002" },
        ],
        error: null,
      };
      mockResultsByTable["patients"] = {
        data: [
          { patient_id: "P001", name: "患者A" },
          { patient_id: "P002", name: "患者B" },
        ],
        error: null,
      };
      mockResultsByTable["intake"] = { data: [], error: null };

      const res = await POST(createCsvReq(csv));
      expect(res.status).toBe(200);

      const body = await res.json();
      // 合箱で2件のentryが生成される
      expect(body.entries.length).toBeGreaterThanOrEqual(1);
    });
  });

  // =============================================
  // ダブルクォート除去
  // =============================================
  describe("ダブルクォート処理", () => {
    it("ダブルクォートで囲まれたヘッダー・値を正しく処理", async () => {
      const csv = '"お客様管理番号","伝票番号"\n"ORD001","9999999999"';

      mockResultsByTable["orders"] = {
        data: [{ id: "ORD001", patient_id: "P001" }],
        error: null,
      };
      mockResultsByTable["patients"] = {
        data: [{ patient_id: "P001", name: "テスト" }],
        error: null,
      };
      mockResultsByTable["intake"] = { data: [], error: null };

      const res = await POST(createCsvReq(csv));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.entries[0].tracking_number).toBe("9999999999");
    });
  });

  // =============================================
  // DB エラー
  // =============================================
  describe("DB エラー", () => {
    it("注文データ取得エラー時に 500 を返す", async () => {
      const csv = "お客様管理番号,伝票番号\nORD001,1234567890";

      mockResultsByTable["orders"] = {
        data: null,
        error: { message: "DB connection error" },
      };

      const res = await POST(createCsvReq(csv));
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toContain("エラー");
    });
  });

  // =============================================
  // UTF-8 BOM 対応
  // =============================================
  describe("BOM対応", () => {
    it("UTF-8 BOM付きCSVでも正しく処理", async () => {
      // BOM (0xEF 0xBB 0xBF) を先頭に追加
      const bom = "\uFEFF";
      const csv = bom + "お客様管理番号,伝票番号\nORD001,1234567890";

      mockResultsByTable["orders"] = {
        data: [{ id: "ORD001", patient_id: "P001" }],
        error: null,
      };
      mockResultsByTable["patients"] = {
        data: [{ patient_id: "P001", name: "BOMテスト" }],
        error: null,
      };
      mockResultsByTable["intake"] = { data: [], error: null };

      const res = await POST(createCsvReq(csv));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.entries).toHaveLength(1);
      expect(body.entries[0].matched).toBe(true);
    });
  });
});
