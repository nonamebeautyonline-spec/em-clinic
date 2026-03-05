// __tests__/api/admin-noname-master-refund.test.ts
// 決済マスター返金API（app/api/admin/noname-master/refund/route.ts）のテスト
import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { NextRequest } from "next/server";

// === モック設定 ===
const mockVerifyAdminAuth = vi.fn().mockResolvedValue(true);
vi.mock("@/lib/admin-auth", () => ({ verifyAdminAuth: mockVerifyAdminAuth }));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  withTenant: vi.fn((query) => query),
  tenantPayload: vi.fn(() => ({ tenant_id: "test-tenant" })),
}));

vi.mock("@/lib/redis", () => ({
  invalidateDashboardCache: vi.fn(),
}));

vi.mock("@/lib/settings", () => ({
  getSettingOrEnv: vi.fn().mockResolvedValue(""),
}));

const mockLogAudit = vi.fn();
vi.mock("@/lib/audit", () => ({
  logAudit: (...args: unknown[]) => mockLogAudit(...args),
}));

// Square processRefund モック
const mockProcessRefund = vi.fn();
vi.mock("@/lib/payment/square", () => ({
  SquarePaymentProvider: function () {
    return { processRefund: mockProcessRefund };
  },
}));

// fetch モック（LINE通知用）
const originalFetch = global.fetch;
beforeEach(() => {
  global.fetch = vi.fn().mockResolvedValue({ ok: true });
});

// === Supabase モック ===
let orderSelectResult: { data: unknown; error: unknown } = { data: null, error: null };
let orderUpdateResult: { error: unknown } = { error: null };

function createChain() {
  const chain: Record<string, unknown> = {};
  ["insert", "update", "delete", "select", "eq", "neq", "gt", "gte", "lt", "lte",
   "in", "is", "not", "order", "limit", "range", "single", "maybeSingle", "upsert",
   "ilike", "or", "count", "csv"].forEach(m => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.single = vi.fn().mockImplementation(() => orderSelectResult);
  chain.update = vi.fn().mockImplementation(() => {
    // update後のeq呼び出しでresultを返す
    const updateChain: Record<string, unknown> = {};
    ["eq", "neq", "in", "is", "not"].forEach(m => {
      updateChain[m] = vi.fn().mockImplementation(() => orderUpdateResult);
    });
    return updateChain;
  });
  return chain;
}

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn(() => createChain()),
  },
}));

// ADMIN_TOKEN 環境変数
const TEST_ADMIN_TOKEN = "test-secret-token";

beforeEach(() => {
  vi.clearAllMocks();
  process.env.ADMIN_TOKEN = TEST_ADMIN_TOKEN;
  orderSelectResult = { data: null, error: null };
  orderUpdateResult = { error: null };
  mockVerifyAdminAuth.mockResolvedValue(true);
  mockProcessRefund.mockResolvedValue({ success: true, refundId: "rfnd_123", status: "COMPLETED" });
});

afterAll(() => {
  global.fetch = originalFetch;
  delete process.env.ADMIN_TOKEN;
});

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/admin/noname-master/refund", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// テスト対象のインポート
const { POST } = await import("@/app/api/admin/noname-master/refund/route");

describe("POST /api/admin/noname-master/refund", () => {
  it("認証失敗で401を返す", async () => {
    mockVerifyAdminAuth.mockResolvedValue(false);
    const res = await POST(makeRequest({
      order_id: "pay_123",
      admin_token: TEST_ADMIN_TOKEN,
    }));
    expect(res.status).toBe(401);
  });

  it("admin_token不一致で403を返す", async () => {
    const res = await POST(makeRequest({
      order_id: "pay_123",
      admin_token: "wrong-token",
    }));
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toContain("管理者トークン");
  });

  it("order_id未指定でバリデーションエラー", async () => {
    const res = await POST(makeRequest({
      order_id: "",
      admin_token: TEST_ADMIN_TOKEN,
    }));
    expect(res.status).toBe(400);
  });

  it("注文が見つからない場合404を返す", async () => {
    orderSelectResult = { data: null, error: { message: "not found" } };
    const res = await POST(makeRequest({
      order_id: "pay_nonexistent",
      admin_token: TEST_ADMIN_TOKEN,
    }));
    expect(res.status).toBe(404);
  });

  it("既に返金済みの場合は冪等レスポンスを返す", async () => {
    orderSelectResult = {
      data: {
        id: "pay_123",
        patient_id: "P001",
        product_code: "MJL_2.5mg_1m",
        amount: 10000,
        status: "cancelled",
        payment_method: "credit_card",
        shipping_name: "テスト太郎",
        refund_status: "COMPLETED",
      },
      error: null,
    };
    const res = await POST(makeRequest({
      order_id: "pay_123",
      admin_token: TEST_ADMIN_TOKEN,
    }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.message).toContain("既に返金処理済み");
    // Square APIは呼ばれない
    expect(mockProcessRefund).not.toHaveBeenCalled();
  });

  it("キャンセル済み注文は返金不可", async () => {
    orderSelectResult = {
      data: {
        id: "pay_123",
        patient_id: "P001",
        amount: 10000,
        status: "cancelled",
        payment_method: "credit_card",
        refund_status: null,
      },
      error: null,
    };
    const res = await POST(makeRequest({
      order_id: "pay_123",
      admin_token: TEST_ADMIN_TOKEN,
    }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("キャンセル済み");
  });

  it("クレカ返金成功", async () => {
    orderSelectResult = {
      data: {
        id: "pay_123",
        patient_id: "P001",
        product_code: "MJL_2.5mg_1m",
        amount: 10000,
        status: "confirmed",
        payment_method: "credit_card",
        shipping_name: "テスト太郎",
        refund_status: null,
      },
      error: null,
    };
    const res = await POST(makeRequest({
      order_id: "pay_123",
      admin_token: TEST_ADMIN_TOKEN,
      memo: "患者希望",
    }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.refund_status).toBe("COMPLETED");
    expect(data.payment_method).toBe("credit_card");

    // Square processRefund が呼ばれた（reason付き）
    expect(mockProcessRefund).toHaveBeenCalledWith(
      "pay_123", 10000, "PID:P001;Product:MJL_2.5mg_1mの払戻し"
    );
    // 監査ログが記録された
    expect(mockLogAudit).toHaveBeenCalled();
  });

  it("Square返金失敗で500を返す", async () => {
    orderSelectResult = {
      data: {
        id: "pay_456",
        patient_id: "P002",
        amount: 5000,
        status: "confirmed",
        payment_method: "credit_card",
        refund_status: null,
      },
      error: null,
    };
    mockProcessRefund.mockResolvedValue({ success: false, status: "HTTP 400" });

    const res = await POST(makeRequest({
      order_id: "pay_456",
      admin_token: TEST_ADMIN_TOKEN,
    }));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toContain("Square返金に失敗");
  });

  it("銀行振込返金成功（PENDINGステータス）", async () => {
    orderSelectResult = {
      data: {
        id: "bt_789",
        patient_id: "P003",
        product_code: "MJL_5mg_1m",
        amount: 15000,
        status: "confirmed",
        payment_method: "bank_transfer",
        shipping_name: "振込太郎",
        refund_status: null,
      },
      error: null,
    };
    const res = await POST(makeRequest({
      order_id: "bt_789",
      admin_token: TEST_ADMIN_TOKEN,
    }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.refund_status).toBe("PENDING");
    expect(data.payment_method).toBe("bank_transfer");

    // Square APIは呼ばれない
    expect(mockProcessRefund).not.toHaveBeenCalled();
    // 監査ログは記録される
    expect(mockLogAudit).toHaveBeenCalled();
  });
});
