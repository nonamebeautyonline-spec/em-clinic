// __tests__/api/line-analytics-report.test.ts
// LINE配信分析レポートPDF生成 API（line/analytics/report/route.ts）のテスト
// 配信別統計、クリック集計、CVR算出、PDF生成
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- モック定義 ---

let mockAuthorized = true;
vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: vi.fn(async () => mockAuthorized),
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  withTenant: vi.fn((q: any) => q),
}));

// jsPDF モック — vi.hoisted() でホイスト対応の変数を作成
const { mockJsPDFOutput, mockJsPDFText, mockJsPDFSetFontSize } = vi.hoisted(() => {
  return {
    mockJsPDFOutput: vi.fn().mockReturnValue(new ArrayBuffer(100)),
    mockJsPDFText: vi.fn(),
    mockJsPDFSetFontSize: vi.fn(),
  };
});

vi.mock("jspdf", () => {
  // new jsPDF() で呼ばれるためコンストラクタ関数として定義
  function JsPDFMock() {
    return {
      setFontSize: mockJsPDFSetFontSize,
      text: mockJsPDFText,
      output: mockJsPDFOutput,
      internal: { pageSize: { getWidth: () => 210 } },
      lastAutoTable: { finalY: 80 },
    };
  }
  return { jsPDF: JsPDFMock };
});

vi.mock("jspdf-autotable", () => ({
  default: vi.fn(),
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

  // range メソッドは fetchAll のページネーションで使われる
  chain.range = vi.fn().mockImplementation(() => {
    const result = mockResultsByTable[table] || { data: [], error: null };
    return Promise.resolve(result);
  });

  // select で count:exact, head:true のパターン（CVR算出用）
  chain.select = vi.fn().mockImplementation((_cols?: string, opts?: any) => {
    if (opts?.count === "exact" && opts?.head === true) {
      const countChain: any = {};
      methods.forEach((m) => {
        countChain[m] = vi.fn().mockReturnValue(countChain);
      });
      countChain.then = (resolve: any, reject: any) => {
        const result = mockResultsByTable[`${table}_count`] || { count: 0, data: null, error: null };
        return Promise.resolve({ count: result.count ?? 0, data: null, error: null }).then(resolve, reject);
      };
      return countChain;
    }
    return chain;
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

import { GET } from "@/app/api/admin/line/analytics/report/route";
import { NextRequest } from "next/server";

function createReq(params?: Record<string, string>) {
  const url = new URL("http://localhost/api/admin/line/analytics/report");
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  return new NextRequest(url);
}

describe("LINE配信分析レポートPDF生成 API", () => {
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
      const res = await GET(createReq());
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe("Unauthorized");
    });
  });

  // =============================================
  // 正常系: PDF生成
  // =============================================
  describe("正常系", () => {
    it("配信データがある場合にPDFを返す", async () => {
      mockResultsByTable["broadcasts"] = {
        data: [
          {
            id: 1,
            name: "新年キャンペーン",
            status: "sent",
            total_targets: 500,
            sent_count: 480,
            failed_count: 20,
            no_uid_count: 5,
            sent_at: "2026-02-01T10:00:00Z",
            created_at: "2026-02-01T09:00:00Z",
          },
        ],
        error: null,
      };
      // クリック追跡リンク
      mockResultsByTable["click_tracking_links"] = {
        data: [{ id: 10, broadcast_id: 1 }],
        error: null,
      };
      // クリックイベント
      mockResultsByTable["click_tracking_events"] = {
        data: [
          { link_id: 10, ip_address: "1.1.1.1" },
          { link_id: 10, ip_address: "2.2.2.2" },
          { link_id: 10, ip_address: "1.1.1.1" },
        ],
        error: null,
      };
      // CVR用の注文数
      mockResultsByTable["orders_count"] = { count: 3, data: null, error: null };

      const res = await GET(createReq({ period: "30" }));
      expect(res.status).toBe(200);

      // Content-Type が application/pdf
      expect(res.headers.get("Content-Type")).toBe("application/pdf");
      // Content-Disposition にファイル名が含まれる
      const disposition = res.headers.get("Content-Disposition");
      expect(disposition).toContain("attachment");
      expect(disposition).toContain("line-analytics");
      expect(disposition).toContain(".pdf");
    });

    it("レスポンスがバイナリデータ（Buffer）を返す", async () => {
      mockResultsByTable["broadcasts"] = { data: [], error: null };

      const res = await GET(createReq());
      expect(res.status).toBe(200);

      // レスポンスボディが存在
      const buffer = await res.arrayBuffer();
      expect(buffer).toBeTruthy();
      expect(buffer.byteLength).toBeGreaterThan(0);
    });
  });

  // =============================================
  // period パラメータ
  // =============================================
  describe("period パラメータ", () => {
    it("period=7 で7日間のデータを取得", async () => {
      mockResultsByTable["broadcasts"] = { data: [], error: null };
      const res = await GET(createReq({ period: "7" }));
      expect(res.status).toBe(200);
    });

    it("period=90 で90日間のデータを取得", async () => {
      mockResultsByTable["broadcasts"] = { data: [], error: null };
      const res = await GET(createReq({ period: "90" }));
      expect(res.status).toBe(200);
    });

    it("不正な period 値はデフォルト30にフォールバック", async () => {
      mockResultsByTable["broadcasts"] = { data: [], error: null };
      const res = await GET(createReq({ period: "999" }));
      expect(res.status).toBe(200);
    });
  });

  // =============================================
  // 配信 0 件
  // =============================================
  describe("配信 0 件", () => {
    it("配信データが空でもPDFを正常生成", async () => {
      mockResultsByTable["broadcasts"] = { data: [], error: null };

      const res = await GET(createReq());
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("application/pdf");

      // jsPDF が呼ばれたことを確認
      expect(mockJsPDFOutput).toHaveBeenCalledWith("arraybuffer");
    });
  });

  // =============================================
  // クリック集計
  // =============================================
  describe("クリック集計", () => {
    it("ユニーククリックが IP アドレスベースで正しくカウントされる", async () => {
      mockResultsByTable["broadcasts"] = {
        data: [
          {
            id: 1,
            name: "テスト配信",
            status: "sent",
            total_targets: 100,
            sent_count: 90,
            failed_count: 10,
            no_uid_count: 0,
            sent_at: "2026-02-15T10:00:00Z",
            created_at: "2026-02-15T09:00:00Z",
          },
        ],
        error: null,
      };
      mockResultsByTable["click_tracking_links"] = {
        data: [{ id: 20, broadcast_id: 1 }],
        error: null,
      };
      mockResultsByTable["click_tracking_events"] = {
        data: [
          { link_id: 20, ip_address: "10.0.0.1" },
          { link_id: 20, ip_address: "10.0.0.1" },
          { link_id: 20, ip_address: "10.0.0.2" },
          { link_id: 20, ip_address: "10.0.0.3" },
        ],
        error: null,
      };
      mockResultsByTable["orders_count"] = { count: 1, data: null, error: null };

      const res = await GET(createReq());
      expect(res.status).toBe(200);

      // PDFが生成され、autoTable が呼ばれる（配信テーブルに1行のデータ）
      const { default: autoTable } = await import("jspdf-autotable");
      expect(autoTable).toHaveBeenCalled();
    });
  });

  // =============================================
  // jsPDF メソッド呼び出し検証
  // =============================================
  describe("PDF内容", () => {
    it("タイトルとフッターが含まれる", async () => {
      mockResultsByTable["broadcasts"] = { data: [], error: null };

      await GET(createReq());

      // タイトルが書き込まれた
      expect(mockJsPDFText).toHaveBeenCalledWith(
        "LINE Broadcast Analytics Report",
        105,
        20,
        { align: "center" }
      );

      // フッターが書き込まれた
      expect(mockJsPDFText).toHaveBeenCalledWith(
        "Generated by L-ope for CLINIC",
        105,
        285,
        { align: "center" }
      );
    });

    it("output(arraybuffer) が呼ばれる", async () => {
      mockResultsByTable["broadcasts"] = { data: [], error: null };
      await GET(createReq());
      expect(mockJsPDFOutput).toHaveBeenCalledWith("arraybuffer");
    });
  });
});
