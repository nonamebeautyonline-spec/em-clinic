// lib/__tests__/square-inline.test.ts
// lib/payment/square-inline.ts のヘルパー関数テスト
import { describe, it, expect, vi, beforeEach } from "vitest";

import type { Mock } from "vitest";

// --- モックチェーン ---
type SupabaseChain = Record<string, Mock> & { then: Mock };

function createChain(defaultResolve = { data: null, error: null }): SupabaseChain {
  const chain = {} as SupabaseChain;
  [
    "insert", "update", "delete", "select", "eq", "neq",
    "is", "not", "order", "limit", "maybeSingle", "single", "upsert",
  ].forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.then = vi.fn((resolve: (val: unknown) => unknown) => resolve(defaultResolve));
  return chain;
}

const globalStore = globalThis as unknown as { __testTableChains: Record<string, SupabaseChain> };

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn((...args: unknown[]) => {
      const chains = globalStore.__testTableChains || {};
      const table = args[0] as string;
      if (!chains[table]) chains[table] = createChain();
      return chains[table];
    }),
  },
}));

vi.mock("@/lib/tenant", () => ({
  withTenant: vi.fn((q: unknown) => q),
  strictWithTenant: vi.fn((q: unknown) => q),
}));

// fetch モック
vi.stubGlobal("fetch", vi.fn());

import {
  ensureSquareCustomer,
  saveCardOnFile,
  createSquarePayment,
  markReorderPaid,
  getCardDetails,
} from "@/lib/payment/square-inline";

function setTableChain(table: string, chain: SupabaseChain) {
  globalStore.__testTableChains[table] = chain;
}

function mockSquareApi(response: Record<string, unknown>, ok = true, status?: number) {
  vi.mocked(fetch).mockResolvedValueOnce({
    ok,
    status: status ?? (ok ? 200 : 400),
    json: () => Promise.resolve(response),
  } as unknown as Response);
}

const BASE_URL = "https://connect.squareupsandbox.com";
const TOKEN = "sq-test-token";

describe("ensureSquareCustomer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalStore.__testTableChains = {};
  });

  it("DB に既存 customer_id があり Square API で有効 → そのまま返す", async () => {
    const pChain = createChain({
      data: { square_customer_id: "CUST_EXIST", name: "太郎", tel: "090" },
      error: null,
    });
    setTableChain("patients", pChain);

    // RetrieveCustomer API が200を返す
    mockSquareApi({ customer: { id: "CUST_EXIST" } });

    const result = await ensureSquareCustomer(BASE_URL, TOKEN, "PID_001", "test-tenant");
    expect(result).toBe("CUST_EXIST");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("DB に既存 customer_id があるが Square API で 404 → 新規作成", async () => {
    const pChain = createChain({
      data: { square_customer_id: "CUST_OLD", name: "太郎", tel: "090" },
      error: null,
    });
    setTableChain("patients", pChain);

    // RetrieveCustomer → 404
    mockSquareApi({}, false, 404);
    // CreateCustomer → 成功
    mockSquareApi({ customer: { id: "CUST_NEW" } });

    const result = await ensureSquareCustomer(BASE_URL, TOKEN, "PID_001", "test-tenant");
    expect(result).toBe("CUST_NEW");
    expect(fetch).toHaveBeenCalledTimes(2);
    // 旧customer_id + card_id がクリアされる
    expect(pChain.update).toHaveBeenCalled();
    const updateCall = pChain.update.mock.calls[0][0];
    expect(updateCall).toEqual(
      expect.objectContaining({ square_customer_id: null, square_card_id: null })
    );
  });

  it("DB に既存 customer_id があり Square API でネットワークエラー → 既存IDで続行", async () => {
    const pChain = createChain({
      data: { square_customer_id: "CUST_EXIST", name: "太郎", tel: "090" },
      error: null,
    });
    setTableChain("patients", pChain);

    // RetrieveCustomer → 500
    mockSquareApi({}, false, 500);

    const result = await ensureSquareCustomer(BASE_URL, TOKEN, "PID_001", "test-tenant");
    expect(result).toBe("CUST_EXIST");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("DB に customer_id がない場合は Square API で作成して保存", async () => {
    const pChain = createChain({
      data: { square_customer_id: null, name: "山田太郎", tel: "09012345678" },
      error: null,
    });
    setTableChain("patients", pChain);

    mockSquareApi({ customer: { id: "CUST_NEW" } });

    const result = await ensureSquareCustomer(BASE_URL, TOKEN, "PID_001", "test-tenant");
    expect(result).toBe("CUST_NEW");
    expect(fetch).toHaveBeenCalledTimes(1);
    // DB更新を確認
    expect(pChain.update).toHaveBeenCalled();
  });

  it("Square API 失敗時は null を返す", async () => {
    const pChain = createChain({
      data: { square_customer_id: null, name: null, tel: null },
      error: null,
    });
    setTableChain("patients", pChain);

    mockSquareApi({ errors: [{ detail: "Bad request" }] }, false);

    const result = await ensureSquareCustomer(BASE_URL, TOKEN, "PID_001", "test-tenant");
    expect(result).toBeNull();
  });
});

describe("saveCardOnFile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalStore.__testTableChains = {};
  });

  it("nonce からカードを保存して card_id を返す", async () => {
    const pChain = createChain({
      data: { square_customer_id: "CUST_001", name: null, tel: null },
      error: null,
    });
    setTableChain("patients", pChain);

    // RetrieveCustomer API（ensureSquareCustomer内）
    mockSquareApi({ customer: { id: "CUST_001" } });
    // Cards API レスポンス
    mockSquareApi({ card: { id: "ccof:NEW_CARD" } });

    const result = await saveCardOnFile(BASE_URL, TOKEN, "PID_001", "cnon:NONCE", "test-tenant");
    expect(result).toBe("ccof:NEW_CARD");
    // DB更新（square_card_id）
    expect(pChain.update).toHaveBeenCalled();
  });

  it("Cards API 失敗時は null を返す", async () => {
    const pChain = createChain({
      data: { square_customer_id: "CUST_001", name: null, tel: null },
      error: null,
    });
    setTableChain("patients", pChain);

    // RetrieveCustomer API（ensureSquareCustomer内）
    mockSquareApi({ customer: { id: "CUST_001" } });
    mockSquareApi({ errors: [{ detail: "Invalid nonce" }] }, false);

    const result = await saveCardOnFile(BASE_URL, TOKEN, "PID_001", "cnon:BAD_NONCE", "test-tenant");
    expect(result).toBeNull();
  });
});

describe("createSquarePayment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("決済成功時は payment を返す", async () => {
    mockSquareApi({
      payment: { id: "PAY_001", status: "COMPLETED", receipt_url: "https://squareup.com/receipt" },
    });

    const result = await createSquarePayment(BASE_URL, TOKEN, {
      sourceId: "ccof:CARD_1",
      amount: 13000,
      locationId: "LOC_1",
      note: "PID:001;Product:MJL_2.5mg_1m",
    });

    expect(result.ok).toBe(true);
    expect(result.payment?.id).toBe("PAY_001");
  });

  it("決済失敗時はエラーメッセージを返す", async () => {
    mockSquareApi({
      errors: [{ code: "CARD_DECLINED", detail: "Card declined" }],
    }, false);

    const result = await createSquarePayment(BASE_URL, TOKEN, {
      sourceId: "ccof:CARD_1",
      amount: 13000,
      locationId: "LOC_1",
      note: "test",
    });

    expect(result.ok).toBe(false);
    expect(result.error).toContain("カードが拒否されました");
  });

  it("customerId が渡された場合は customer_id が送信される", async () => {
    mockSquareApi({ payment: { id: "PAY_002" } });

    await createSquarePayment(BASE_URL, TOKEN, {
      sourceId: "ccof:CARD_1",
      amount: 5000,
      locationId: "LOC_1",
      note: "test",
      customerId: "CUST_001",
    });

    const callBody = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
    expect(callBody.customer_id).toBe("CUST_001");
  });
});

describe("markReorderPaid", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalStore.__testTableChains = {};
  });

  it("reorder_number で更新成功する", async () => {
    const rChain = createChain({ data: [{ id: 42 }], error: null });
    setTableChain("reorders", rChain);

    await markReorderPaid("42", "PID_001", "test-tenant");
    expect(rChain.update).toHaveBeenCalled();
    expect(rChain.eq).toHaveBeenCalledWith("reorder_number", 42);
  });

  it("不正な reorderId (NaN) の場合は何もしない", async () => {
    const rChain = createChain();
    setTableChain("reorders", rChain);

    await markReorderPaid("abc", "PID_001", "test-tenant");
    expect(rChain.update).not.toHaveBeenCalled();
  });

  it("reorderId < 2 の場合は何もしない", async () => {
    const rChain = createChain();
    setTableChain("reorders", rChain);

    await markReorderPaid("1", "PID_001", "test-tenant");
    expect(rChain.update).not.toHaveBeenCalled();
  });
});

describe("getCardDetails", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("カード情報を返す", async () => {
    mockSquareApi({ card: { id: "ccof:1", card_brand: "VISA", last_4: "1234", enabled: true } });

    const result = await getCardDetails(BASE_URL, TOKEN, "ccof:1");
    expect(result.ok).toBe(true);
    expect(result.card?.card_brand).toBe("VISA");
  });

  it("API失敗時は ok: false", async () => {
    mockSquareApi({}, false);
    const result = await getCardDetails(BASE_URL, TOKEN, "ccof:invalid");
    expect(result.ok).toBe(false);
  });
});
