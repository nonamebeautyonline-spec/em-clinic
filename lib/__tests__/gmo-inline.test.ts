// lib/__tests__/gmo-inline.test.ts
// GMOインライン決済ヘルパー（lib/payment/gmo-inline.ts）のテスト
import { describe, it, expect, vi, beforeEach } from "vitest";

// === モック設定 ===
const mockFrom = vi.fn();
vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: { from: (...args: unknown[]) => mockFrom(...args) },
}));

vi.mock("@/lib/tenant", () => ({
  withTenant: vi.fn((query) => query),
}));

// GmoPaymentProvider モック
const mockEntryTran = vi.fn();
const mockExecTranToken = vi.fn();
const mockExecTranWithMember = vi.fn();
const mockSaveMember = vi.fn();
const mockSaveCard = vi.fn();
const mockSearchCard = vi.fn();
const mockTradedCard = vi.fn();

vi.mock("@/lib/payment/gmo", () => ({
  GmoPaymentProvider: class {
    entryTran = mockEntryTran;
    execTranToken = mockExecTranToken;
    execTranWithMember = mockExecTranWithMember;
    saveMember = mockSaveMember;
    saveCard = mockSaveCard;
    searchCard = mockSearchCard;
    tradedCard = mockTradedCard;
  },
}));

// markReorderPaid は square-inline から再エクスポートされているのでモック
vi.mock("@/lib/payment/square-inline", () => ({
  markReorderPaid: vi.fn(),
}));

import {
  translateGmoError,
  generateOrderId,
  ensureGmoMember,
  saveGmoCard,
  saveCardViaTradedCard,
  createGmoPayment,
  createGmoPaymentWithSavedCard,
  getGmoSavedCard,
} from "@/lib/payment/gmo-inline";

// Supabase chain ヘルパー
function createChain(result: { data: unknown; error: unknown } = { data: null, error: null }) {
  const chain: Record<string, unknown> = {};
  const methods = [
    "select", "insert", "update", "delete", "upsert",
    "eq", "neq", "not", "is", "in", "like", "ilike",
    "order", "limit", "single",
    "gt", "gte", "lt", "lte", "range",
  ];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  // await対応
  chain.then = (resolve: (val: unknown) => void) => resolve(result);
  // maybeSingle は thenable を返す（withTenant().maybeSingle()パターン対応）
  chain.maybeSingle = vi.fn().mockReturnValue({
    then: (resolve: (val: unknown) => void) => resolve(result),
  });
  return chain;
}

describe("translateGmoError", () => {
  it("カード拒否エラーコードを日本語に変換", () => {
    expect(translateGmoError("42G020000")).toBe("カードが拒否されました。別のカードをお試しください。");
  });

  it("有効期限切れエラーを変換", () => {
    expect(translateGmoError("42G220000")).toBe("カードの有効期限が切れています。");
  });

  it("セキュリティコードエラーを変換", () => {
    expect(translateGmoError("42G440000")).toBe("セキュリティコードが正しくありません。");
  });

  it("残高不足エラーを変換", () => {
    expect(translateGmoError("42G560000")).toBe("残高が不足しています。");
  });

  it("不明なエラーコードはデフォルトメッセージ", () => {
    expect(translateGmoError("UNKNOWN_CODE")).toBe("決済に失敗しました。時間をおいて再度お試しください。");
  });

  it("undefinedはデフォルトメッセージ", () => {
    expect(translateGmoError(undefined)).toBe("決済に失敗しました");
  });

  it("複合エラー文字列から一致するコードを検出", () => {
    expect(translateGmoError("E01040010|E01050010")).toBe("カード番号を入力してください。");
  });
});

describe("generateOrderId", () => {
  it("最大27文字以内のIDを生成", () => {
    const id = generateOrderId();
    expect(id.length).toBeLessThanOrEqual(27);
  });

  it("'o'で始まるIDを生成", () => {
    const id = generateOrderId();
    expect(id.startsWith("o")).toBe(true);
  });

  it("ハイフンを含む形式", () => {
    const id = generateOrderId();
    expect(id).toMatch(/^o[a-z0-9]+-[a-f0-9]+$/);
  });

  it("毎回異なるIDを生成", () => {
    const ids = new Set(Array.from({ length: 10 }, () => generateOrderId()));
    expect(ids.size).toBe(10);
  });
});

describe("ensureGmoMember", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("既存のgmo_member_idがあればそれを返す", async () => {
    mockFrom.mockReturnValue(
      createChain({ data: { gmo_member_id: "existing-member-123" }, error: null }),
    );

    const result = await ensureGmoMember("patient_001", null);
    expect(result).toBe("existing-member-123");
    expect(mockSaveMember).not.toHaveBeenCalled();
  });

  it("gmo_member_idがなければGMO会員登録してDBに保存", async () => {
    // 1回目のfrom: patients select → gmo_member_id なし
    // 2回目のfrom: patients update
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return createChain({ data: { gmo_member_id: null }, error: null });
      }
      return createChain({ data: null, error: null });
    });

    const result = await ensureGmoMember("patient_002", "tenant-1");
    expect(result).toBe("patient_002");
    expect(mockSaveMember).toHaveBeenCalledWith("patient_002");
  });
});

describe("saveGmoCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("正常系: カード保存に成功しcardSeqを返す", async () => {
    // ensureGmoMember用
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return createChain({ data: { gmo_member_id: "member-1" }, error: null });
      }
      return createChain({ data: null, error: null });
    });
    mockSaveCard.mockResolvedValue({ cardSeq: "0" });

    const result = await saveGmoCard("patient_001", "tok_xxx", null);
    expect(result).toBe("0");
    expect(mockSaveCard).toHaveBeenCalledWith("member-1", "tok_xxx");
  });

  it("エラー時はnullを返す", async () => {
    mockFrom.mockReturnValue(
      createChain({ data: { gmo_member_id: "member-1" }, error: null }),
    );
    mockSaveCard.mockRejectedValue(new Error("GMO API error"));

    const result = await saveGmoCard("patient_001", "tok_xxx", null);
    expect(result).toBeNull();
  });
});

describe("saveCardViaTradedCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("TradedCard成功時はtrueを返す", async () => {
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return createChain({ data: { gmo_member_id: "member-1" }, error: null });
      }
      return createChain({ data: null, error: null });
    });
    mockTradedCard.mockResolvedValue({ ok: true, cardSeq: "0" });

    const result = await saveCardViaTradedCard("patient_001", "order-1", null);
    expect(result).toBe(true);
  });

  it("TradedCard失敗時はfalseを返す（例外なし）", async () => {
    mockFrom.mockReturnValue(
      createChain({ data: { gmo_member_id: "member-1" }, error: null }),
    );
    mockTradedCard.mockResolvedValue({ ok: false, error: "some error" });

    const result = await saveCardViaTradedCard("patient_001", "order-1", null);
    expect(result).toBe(false);
  });

  it("例外発生時もfalseを返す", async () => {
    mockFrom.mockReturnValue(
      createChain({ data: { gmo_member_id: "member-1" }, error: null }),
    );
    mockTradedCard.mockRejectedValue(new Error("network error"));

    const result = await saveCardViaTradedCard("patient_001", "order-1", null);
    expect(result).toBe(false);
  });
});

describe("createGmoPayment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("正常系: 決済成功", async () => {
    mockEntryTran.mockResolvedValue({ accessId: "aid", accessPass: "apass" });
    mockExecTranToken.mockResolvedValue({});

    const result = await createGmoPayment({
      token: "tok_xxx",
      amount: 5000,
      patientId: "p1",
      productCode: "PROD_001",
    });

    expect(result.ok).toBe(true);
    expect(result.orderId).toBeDefined();
    expect(mockEntryTran).toHaveBeenCalled();
    expect(mockExecTranToken).toHaveBeenCalled();
  });

  it("ExecTranがエラーを返した場合", async () => {
    mockEntryTran.mockResolvedValue({ accessId: "aid", accessPass: "apass" });
    mockExecTranToken.mockResolvedValue({ ErrCode: "E01", ErrInfo: "42G020000" });

    const result = await createGmoPayment({
      token: "tok_xxx",
      amount: 5000,
      patientId: "p1",
      productCode: "PROD_001",
    });

    expect(result.ok).toBe(false);
    expect(result.error).toBe("カードが拒否されました。別のカードをお試しください。");
  });

  it("3DS認証が必要な場合", async () => {
    mockEntryTran.mockResolvedValue({ accessId: "aid", accessPass: "apass" });
    mockExecTranToken.mockResolvedValue({
      ACS: "1",
      RedirectUrl: "https://acs.example.com/3ds",
    });

    const result = await createGmoPayment({
      token: "tok_xxx",
      amount: 5000,
      patientId: "p1",
      productCode: "PROD_001",
    });

    expect(result.ok).toBe(false);
    expect(result.needs3ds).toBe(true);
    expect(result.acsUrl).toBe("https://acs.example.com/3ds");
    expect(result.accessId).toBe("aid");
    expect(result.accessPass).toBe("apass");
  });

  it("例外発生時はエラーを返す", async () => {
    mockEntryTran.mockRejectedValue(new Error("network timeout"));

    const result = await createGmoPayment({
      token: "tok_xxx",
      amount: 5000,
      patientId: "p1",
      productCode: "PROD_001",
    });

    expect(result.ok).toBe(false);
    expect(result.error).toBe("network timeout");
  });

  it("clientField1にメタデータが含まれる", async () => {
    mockEntryTran.mockResolvedValue({ accessId: "aid", accessPass: "apass" });
    mockExecTranToken.mockResolvedValue({});

    await createGmoPayment({
      token: "tok_xxx",
      amount: 5000,
      patientId: "p1",
      productCode: "PROD_001",
      mode: "reorder",
      reorderId: "42",
    });

    const execCall = mockExecTranToken.mock.calls[0][0];
    expect(execCall.clientField1).toContain("PID:p1");
    expect(execCall.clientField1).toContain("Product:PROD_001");
    expect(execCall.clientField1).toContain("Mode:reorder");
    expect(execCall.clientField1).toContain("Reorder:42");
  });
});

describe("createGmoPaymentWithSavedCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("正常系: 保存済みカードで決済成功", async () => {
    mockEntryTran.mockResolvedValue({ accessId: "aid", accessPass: "apass" });
    mockExecTranWithMember.mockResolvedValue({});

    const result = await createGmoPaymentWithSavedCard({
      memberId: "member-1",
      cardSeq: "0",
      amount: 3000,
      patientId: "p1",
      productCode: "PROD_001",
    });

    expect(result.ok).toBe(true);
    expect(result.orderId).toBeDefined();
  });

  it("エラー時はok=falseを返す", async () => {
    mockEntryTran.mockResolvedValue({ accessId: "aid", accessPass: "apass" });
    mockExecTranWithMember.mockResolvedValue({ ErrCode: "E01", ErrInfo: "42G560000" });

    const result = await createGmoPaymentWithSavedCard({
      memberId: "member-1",
      cardSeq: "0",
      amount: 3000,
      patientId: "p1",
      productCode: "PROD_001",
    });

    expect(result.ok).toBe(false);
    expect(result.error).toBe("残高が不足しています。");
  });

  it("3DS認証が必要な場合", async () => {
    mockEntryTran.mockResolvedValue({ accessId: "aid", accessPass: "apass" });
    mockExecTranWithMember.mockResolvedValue({
      ACS: "1",
      RedirectUrl: "https://acs.example.com",
    });

    const result = await createGmoPaymentWithSavedCard({
      memberId: "member-1",
      cardSeq: "0",
      amount: 3000,
      patientId: "p1",
      productCode: "PROD_001",
    });

    expect(result.ok).toBe(false);
    expect(result.needs3ds).toBe(true);
  });

  it("例外発生時はエラーメッセージを返す", async () => {
    mockEntryTran.mockRejectedValue(new Error("API timeout"));

    const result = await createGmoPaymentWithSavedCard({
      memberId: "member-1",
      cardSeq: "0",
      amount: 3000,
      patientId: "p1",
      productCode: "PROD_001",
    });

    expect(result.ok).toBe(false);
    expect(result.error).toBe("API timeout");
  });
});

describe("getGmoSavedCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("gmo_member_idがない場合はhasCard=false", async () => {
    mockFrom.mockReturnValue(
      createChain({ data: { gmo_member_id: null, gmo_card_seq: null }, error: null }),
    );

    const result = await getGmoSavedCard("patient_001", null);
    expect(result.hasCard).toBe(false);
  });

  it("カードが保存されている場合はカード情報を返す", async () => {
    mockFrom.mockReturnValue(
      createChain({ data: { gmo_member_id: "member-1", gmo_card_seq: "0" }, error: null }),
    );
    mockSearchCard.mockResolvedValue({
      hasCard: true,
      cardSeq: "0",
      cardNo: "****1234",
      brand: "VISA",
    });

    const result = await getGmoSavedCard("patient_001", null);
    expect(result.hasCard).toBe(true);
    expect(result.cardSeq).toBe("0");
    expect(result.last4).toBe("1234");
    expect(result.brand).toBe("VISA");
  });

  it("GMO SearchCardでカード未登録の場合", async () => {
    mockFrom.mockReturnValue(
      createChain({ data: { gmo_member_id: "member-1", gmo_card_seq: "0" }, error: null }),
    );
    mockSearchCard.mockResolvedValue({ hasCard: false });

    const result = await getGmoSavedCard("patient_001", null);
    expect(result.hasCard).toBe(false);
  });

  it("GMO SearchCardで例外が発生した場合", async () => {
    mockFrom.mockReturnValue(
      createChain({ data: { gmo_member_id: "member-1", gmo_card_seq: "0" }, error: null }),
    );
    mockSearchCard.mockRejectedValue(new Error("API error"));

    const result = await getGmoSavedCard("patient_001", null);
    expect(result.hasCard).toBe(false);
  });
});
