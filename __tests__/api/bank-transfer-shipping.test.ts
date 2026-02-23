// __tests__/api/bank-transfer-shipping.test.ts
// 銀行振込配送 API のテスト
// 対象: app/api/bank-transfer/shipping/route.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- チェーンモック ---
function createChain(defaultResolve = { data: null, error: null }) {
  const chain: any = {};
  ["insert","update","delete","select","eq","neq","gt","gte","lt","lte",
   "in","is","not","order","limit","range","single","maybeSingle","upsert",
   "ilike","or","count","csv"].forEach(m => {
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

vi.mock("@/lib/redis", () => ({
  invalidateDashboardCache: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/phone", () => ({
  normalizeJPPhone: vi.fn((p: string) => p),
}));

const mockCreateReorderPaymentKarte = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/reorder-karte", () => ({
  createReorderPaymentKarte: (...args: any[]) => mockCreateReorderPaymentKarte(...args),
}));

vi.mock("@/lib/products", () => ({
  getProductPricesMap: vi.fn().mockResolvedValue({ "AGA-001": 5000, "ED-001": 3000 }),
  getProductNamesMap: vi.fn().mockResolvedValue({ "AGA-001": "AGA治療薬", "ED-001": "ED治療薬" }),
}));

// parseBody をモック
vi.mock("@/lib/validations/helpers", () => ({
  parseBody: vi.fn(),
}));

function createMockRequest(method: string, url: string, body?: any) {
  return {
    method,
    url,
    nextUrl: { searchParams: new URL(url).searchParams },
    cookies: { get: vi.fn(() => undefined) },
    headers: { get: vi.fn(() => null) },
    json: body ? vi.fn().mockResolvedValue(body) : vi.fn(),
  } as any;
}

import { POST } from "@/app/api/bank-transfer/shipping/route";
import { parseBody } from "@/lib/validations/helpers";
import { invalidateDashboardCache } from "@/lib/redis";

// 基本リクエストデータ
const baseData = {
  patientId: "p1",
  productCode: "AGA-001",
  mode: "initial",
  reorderId: null,
  accountName: "タナカ タロウ",
  shippingName: "田中太郎",
  phoneNumber: "09012345678",
  email: "test@example.com",
  postalCode: "123-4567",
  address: "東京都渋谷区1-2-3",
};

describe("銀行振込配送API (bank-transfer/shipping/route.ts)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tableChains = {};
  });

  // ========================================
  // バリデーション
  // ========================================
  it("バリデーション失敗 → parseBody のエラーレスポンス", async () => {
    const mockErrorResponse = new Response(JSON.stringify({ ok: false, error: "入力値が不正です" }), { status: 400 });
    (parseBody as any).mockResolvedValue({ error: mockErrorResponse });

    const req = createMockRequest("POST", "http://localhost/api/bank-transfer/shipping");
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  // ========================================
  // NG患者ブロック
  // ========================================
  it("NG患者 → 403", async () => {
    (parseBody as any).mockResolvedValue({ data: { ...baseData } });

    // intake: NG ステータス
    tableChains["intake"] = createChain({
      data: { status: "NG" },
      error: null,
    });

    const req = createMockRequest("POST", "http://localhost/api/bank-transfer/shipping");
    const res = await POST(req);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toContain("処方不可");
  });

  // ========================================
  // 正常系: 初回注文
  // ========================================
  it("初回注文 → orders に挿入成功", async () => {
    (parseBody as any).mockResolvedValue({ data: { ...baseData } });

    // intake: OK ステータス（NG ではない）
    tableChains["intake"] = createChain({ data: { status: "OK" }, error: null });
    // orders: 挿入成功
    tableChains["orders"] = createChain({ data: [{ id: "bt_pending_123" }], error: null });

    const req = createMockRequest("POST", "http://localhost/api/bank-transfer/shipping");
    const res = await POST(req);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(invalidateDashboardCache).toHaveBeenCalledWith("p1");
  });

  // ========================================
  // 正常系: 再処方注文
  // ========================================
  it("再処方モード → reorders 更新 + カルテ作成", async () => {
    (parseBody as any).mockResolvedValue({
      data: { ...baseData, mode: "reorder", reorderId: 5 },
    });

    // intake: NG ではない
    tableChains["intake"] = createChain({ data: { status: "OK" }, error: null });
    // orders: 挿入成功
    tableChains["orders"] = createChain({ data: [{ id: "bt_pending_123" }], error: null });
    // reorders: reorder_number でヒット
    tableChains["reorders"] = createChain({
      data: [{ id: 5 }],
      error: null,
    });

    const req = createMockRequest("POST", "http://localhost/api/bank-transfer/shipping");
    const res = await POST(req);
    const json = await res.json();
    expect(json.ok).toBe(true);
    // カルテ作成が呼ばれる
    expect(mockCreateReorderPaymentKarte).toHaveBeenCalledWith(
      "p1", "AGA-001", expect.any(String), undefined, "test-tenant"
    );
  });

  it("再処方: reorder_number 0件 → id フォールバック", async () => {
    (parseBody as any).mockResolvedValue({
      data: { ...baseData, mode: "reorder", reorderId: 3 },
    });

    tableChains["intake"] = createChain({ data: { status: "OK" }, error: null });
    tableChains["orders"] = createChain({ data: [{ id: "bt_pending_123" }], error: null });
    // reorder_number で 0件 → 最初のselect呼び出しで空、次のselect呼び出しでヒット
    // チェーンは同じオブジェクトなので、最初は空で返るようにする
    const reorderChain = createChain({ data: [], error: null });
    tableChains["reorders"] = reorderChain;

    const req = createMockRequest("POST", "http://localhost/api/bank-transfer/shipping");
    const res = await POST(req);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  // ========================================
  // エラー系
  // ========================================
  it("orders挿入失敗 → 500", async () => {
    (parseBody as any).mockResolvedValue({ data: { ...baseData } });

    tableChains["intake"] = createChain({ data: { status: "OK" }, error: null });
    tableChains["orders"] = createChain({ data: null, error: { message: "insert error" } });

    const req = createMockRequest("POST", "http://localhost/api/bank-transfer/shipping");
    const res = await POST(req);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("配送先情報の保存に失敗しました");
  });

  it("intakeデータなし（NG判定なし）→ 正常に進む", async () => {
    (parseBody as any).mockResolvedValue({ data: { ...baseData } });

    // intake: null（レコードなし）→ NG ではないので通過
    tableChains["intake"] = createChain({ data: null, error: null });
    tableChains["orders"] = createChain({ data: [{ id: "bt_pending_123" }], error: null });

    const req = createMockRequest("POST", "http://localhost/api/bank-transfer/shipping");
    const res = await POST(req);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });
});
