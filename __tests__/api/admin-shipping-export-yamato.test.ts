// __tests__/api/admin-shipping-export-yamato.test.ts
// ヤマトB2 CSV出力 API のテスト
// 対象: app/api/admin/shipping/export-yamato-b2/route.ts
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

// supabase クライアントモック（このルートは createClient を直接使う）
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn((table: string) => getOrCreateChain(table)),
  })),
}));

vi.mock("@/lib/admin-auth", () => ({
  verifyAdminAuth: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  withTenant: vi.fn((q: any) => q),
  tenantPayload: vi.fn(() => ({ tenant_id: "test-tenant" })),
}));

vi.mock("@/lib/validations/helpers", () => ({
  parseBody: vi.fn(),
}));

// generateYamatoB2Csv モック
vi.mock("@/utils/yamato-b2-formatter", () => ({
  generateYamatoB2Csv: vi.fn(() => "ヘッダー行\r\nデータ行"),
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

import { POST } from "@/app/api/admin/shipping/export-yamato-b2/route";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { parseBody } from "@/lib/validations/helpers";
import { generateYamatoB2Csv } from "@/utils/yamato-b2-formatter";

// チェーンをリセットするヘルパー
function resetChain(chain: any, defaultResolve = { data: null, error: null }) {
  [
    "insert", "update", "delete", "select", "eq", "neq", "gt", "gte", "lt", "lte",
    "in", "is", "not", "order", "limit", "range", "single", "maybeSingle", "upsert",
    "ilike", "or", "count", "csv",
  ].forEach(m => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.then = vi.fn((resolve: any) => resolve(defaultResolve));
}

describe("ヤマトB2 CSV出力 API (export-yamato-b2/route.ts)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableChains = {};
    (verifyAdminAuth as any).mockResolvedValue(true);
  });

  // ========================================
  // 認証
  // ========================================
  it("認証失敗 → 401", async () => {
    (verifyAdminAuth as any).mockResolvedValue(false);
    const req = createMockRequest("POST", "http://localhost/api/admin/shipping/export-yamato-b2", {
      order_ids: ["ord-1"],
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Unauthorized");
  });

  // ========================================
  // バリデーション
  // ========================================
  it("バリデーションエラー → parseBody のエラーレスポンスを返す", async () => {
    const errorResponse = new Response(JSON.stringify({ error: "入力値が不正です" }), { status: 400 });
    (parseBody as any).mockResolvedValue({ error: errorResponse });

    const req = createMockRequest("POST", "http://localhost/api/admin/shipping/export-yamato-b2", {});
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  // ========================================
  // 注文取得エラー
  // ========================================
  it("注文取得DBエラー → 500", async () => {
    (parseBody as any).mockResolvedValue({ data: { order_ids: ["ord-1"] } });
    const ordersChain = createChain({ data: null, error: { message: "DB接続エラー" } });
    tableChains["orders"] = ordersChain;

    const req = createMockRequest("POST", "http://localhost/api/admin/shipping/export-yamato-b2", {
      order_ids: ["ord-1"],
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("Database error");
  });

  // ========================================
  // 注文なし
  // ========================================
  it("注文が見つからない → 404", async () => {
    (parseBody as any).mockResolvedValue({ data: { order_ids: ["ord-1"] } });
    const ordersChain = createChain({ data: [], error: null });
    tableChains["orders"] = ordersChain;

    const req = createMockRequest("POST", "http://localhost/api/admin/shipping/export-yamato-b2", {
      order_ids: ["ord-1"],
    });
    const res = await POST(req);
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe("No orders found");
  });

  // ========================================
  // 患者取得エラー
  // ========================================
  it("患者取得DBエラー → 500", async () => {
    (parseBody as any).mockResolvedValue({ data: { order_ids: ["ord-1"] } });
    const ordersChain = createChain({
      data: [{ id: "ord-1", patient_id: "pat-1" }],
      error: null,
    });
    tableChains["orders"] = ordersChain;
    const patientsChain = createChain({ data: null, error: { message: "患者テーブルエラー" } });
    tableChains["patients"] = patientsChain;

    const req = createMockRequest("POST", "http://localhost/api/admin/shipping/export-yamato-b2", {
      order_ids: ["ord-1"],
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.details).toBe("患者テーブルエラー");
  });

  // ========================================
  // 正常系: CSV生成
  // ========================================
  it("正常系 → CSV レスポンスが返る", async () => {
    (parseBody as any).mockResolvedValue({ data: { order_ids: ["ord-1", "ord-2"] } });

    const ordersChain = createChain({
      data: [
        { id: "ord-1", patient_id: "pat-1" },
        { id: "ord-2", patient_id: "pat-2" },
      ],
      error: null,
    });
    tableChains["orders"] = ordersChain;

    const patientsChain = createChain({
      data: [
        { patient_id: "pat-1", name: "山田太郎", tel: "09012345678" },
        { patient_id: "pat-2", name: "鈴木花子", tel: "08098765432" },
      ],
      error: null,
    });
    tableChains["patients"] = patientsChain;

    const req = createMockRequest("POST", "http://localhost/api/admin/shipping/export-yamato-b2", {
      order_ids: ["ord-1", "ord-2"],
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/csv");
    expect(res.headers.get("Content-Disposition")).toContain("yamato_b2_");

    // generateYamatoB2Csv が正しく呼ばれたか
    expect(generateYamatoB2Csv).toHaveBeenCalledTimes(1);
    const callArgs = (generateYamatoB2Csv as any).mock.calls[0];
    // 第1引数: CSV用データ配列
    expect(callArgs[0]).toHaveLength(2);
    expect(callArgs[0][0].payment_id).toBe("ord-1");
    expect(callArgs[0][0].name).toBe("山田太郎");
    expect(callArgs[0][0].phone).toBe("09012345678");
    // 第2引数: 出荷予定日（yyyy/MM/dd形式）
    expect(callArgs[1]).toMatch(/^\d{4}\/\d{2}\/\d{2}$/);
  });

  // ========================================
  // 患者データが null の場合の安全処理
  // ========================================
  it("患者データが見つからない注文 → 空文字でCSV生成される", async () => {
    (parseBody as any).mockResolvedValue({ data: { order_ids: ["ord-1"] } });

    const ordersChain = createChain({
      data: [{ id: "ord-1", patient_id: "pat-unknown" }],
      error: null,
    });
    tableChains["orders"] = ordersChain;

    // 該当する患者がいない
    const patientsChain = createChain({ data: [], error: null });
    tableChains["patients"] = patientsChain;

    const req = createMockRequest("POST", "http://localhost/api/admin/shipping/export-yamato-b2", {
      order_ids: ["ord-1"],
    });
    const res = await POST(req);
    expect(res.status).toBe(200);

    const callArgs = (generateYamatoB2Csv as any).mock.calls[0];
    expect(callArgs[0][0].name).toBe("");
    expect(callArgs[0][0].phone).toBe("");
  });

  // ========================================
  // 重複patient_idの処理
  // ========================================
  it("同一患者の複数注文 → 患者ID重複除去される", async () => {
    (parseBody as any).mockResolvedValue({ data: { order_ids: ["ord-1", "ord-2"] } });

    const ordersChain = createChain({
      data: [
        { id: "ord-1", patient_id: "pat-1" },
        { id: "ord-2", patient_id: "pat-1" },  // 同一患者
      ],
      error: null,
    });
    tableChains["orders"] = ordersChain;

    const patientsChain = createChain({
      data: [{ patient_id: "pat-1", name: "山田太郎", tel: "09012345678" }],
      error: null,
    });
    tableChains["patients"] = patientsChain;

    const req = createMockRequest("POST", "http://localhost/api/admin/shipping/export-yamato-b2", {
      order_ids: ["ord-1", "ord-2"],
    });
    const res = await POST(req);
    expect(res.status).toBe(200);

    // patients テーブルの .in() は重複除去した ID で呼ばれる
    expect(patientsChain.in).toHaveBeenCalled();
    const inCallArgs = patientsChain.in.mock.calls[0];
    // patient_id のユニークリスト
    expect(inCallArgs[1]).toEqual(["pat-1"]);
  });
});
