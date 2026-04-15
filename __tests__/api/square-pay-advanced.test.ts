// __tests__/api/square-pay-advanced.test.ts
// POST /api/square/pay の高度テスト: マルチフィールド・payment_note・配送先・サンクス通知・タグ
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// --- モックチェーン ---
function createChain(defaultResolve: Record<string, unknown> = { data: null, error: null }) {
  const chain: Record<string, unknown> = {};
  [
    "insert", "update", "delete", "select", "eq", "neq", "gte",
    "is", "not", "order", "limit", "maybeSingle", "single", "upsert",
  ].forEach((m) => {
    (chain as Record<string, ReturnType<typeof vi.fn>>)[m] = vi.fn().mockReturnValue(chain);
  });
  chain.then = vi.fn((resolve: (v: unknown) => void) => resolve(defaultResolve));
  return chain;
}

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn((...args: unknown[]) => {
      const g = globalThis as unknown as Record<string, Record<string, Record<string, unknown>>>;
      const chains = g.__testTableChains || {};
      const table = args[0] as string;
      if (!chains[table]) chains[table] = createChain();
      return chains[table];
    }),
  },
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantId: vi.fn(() => "test-tenant"),
  resolveTenantIdOrThrow: vi.fn(() => "test-tenant"),
  withTenant: vi.fn((q: unknown) => q),
  strictWithTenant: vi.fn((q: unknown) => q),
  tenantPayload: vi.fn(() => ({ tenant_id: "test-tenant" })),
}));

vi.mock("@/lib/square-account-server", () => ({
  getActiveSquareAccount: vi.fn(),
}));

vi.mock("@/lib/products", () => ({
  getProductByCode: vi.fn(),
}));

vi.mock("@/lib/phone", () => ({
  normalizeJPPhone: vi.fn((v: string) => v?.replace(/-/g, "") || ""),
}));

vi.mock("@/lib/redis", () => ({
  invalidateDashboardCache: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ limited: false, remaining: 5 }),
  getClientIp: vi.fn(() => "127.0.0.1"),
}));

vi.mock("@/lib/reorder-karte", () => ({
  createReorderPaymentKarte: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/payment/square-inline", () => ({
  ensureSquareCustomer: vi.fn(),
  saveCardOnFile: vi.fn(),
  createSquarePayment: vi.fn(),
  markReorderPaid: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/validations/helpers", () => ({
  parseBody: vi.fn(),
}));

vi.mock("@/lib/medical-fields", () => ({
  isMultiFieldEnabled: vi.fn().mockResolvedValue(false),
}));

vi.mock("@/lib/patient-session", () => ({
  verifyPatientSession: vi.fn().mockResolvedValue({ patientId: "PID_001", lineUserId: "U123" }),
  createPatientToken: vi.fn().mockResolvedValue("mock-jwt"),
  patientSessionCookieOptions: vi.fn().mockReturnValue({ httpOnly: true, secure: true, sameSite: "none", path: "/", maxAge: 31536000 }),
}));

vi.mock("@/lib/distributed-lock", () => ({
  acquireLock: vi.fn().mockResolvedValue({ acquired: true, release: vi.fn().mockResolvedValue(undefined) }),
}));

vi.mock("@/lib/purchase/resolve-cart", () => ({
  resolveCart: vi.fn().mockResolvedValue({
    items: [{ code: "MJL_2.5mg_1m", title: "マンジャロ 2.5mg 1ヶ月", price: 13000, qty: 1, coolType: null, shippingDelayDays: 0 }],
    subtotal: 13000,
    shippingFee: 0,
    totalAmount: 13000,
    productCode: "MJL_2.5mg_1m",
    productName: "マンジャロ 2.5mg 1ヶ月",
  }),
}));

vi.mock("@/lib/address-utils", () => ({
  hasAddressDuplication: vi.fn().mockReturnValue(false),
}));

vi.mock("@/lib/business-rules", () => ({
  getBusinessRules: vi.fn().mockResolvedValue({ notifyReorderPaid: false }),
}));

vi.mock("@/lib/payment-thank-flex", () => ({
  sendPaymentThankNotification: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/tag-auto-rules", () => ({
  evaluateTagAutoRules: vi.fn().mockResolvedValue(undefined),
}));

// --- ルートインポート ---
import { POST } from "@/app/api/square/pay/route";
import { getActiveSquareAccount } from "@/lib/square-account-server";
import { getProductByCode } from "@/lib/products";
import { parseBody } from "@/lib/validations/helpers";
import { createSquarePayment, ensureSquareCustomer, saveCardOnFile } from "@/lib/payment/square-inline";
import { checkRateLimit } from "@/lib/rate-limit";
import { isMultiFieldEnabled } from "@/lib/medical-fields";
import { getBusinessRules } from "@/lib/business-rules";
import { sendPaymentThankNotification } from "@/lib/payment-thank-flex";
import { evaluateTagAutoRules } from "@/lib/tag-auto-rules";
import { acquireLock } from "@/lib/distributed-lock";
import { normalizeJPPhone } from "@/lib/phone";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyPatientSession } from "@/lib/patient-session";

function setTableChain(table: string, chain: Record<string, unknown>) {
  const g = globalThis as unknown as Record<string, Record<string, Record<string, unknown>>>;
  g.__testTableChains[table] = chain;
}

const validBody = {
  sourceId: "cnon:CARD_NONCE",
  productCode: "MJL_2.5mg_1m",
  mode: "current",
  patientId: "PID_001",
  reorderId: null,
  saveCard: true,
  shipping: {
    name: "山田太郎",
    postalCode: "160-0023",
    address: "東京都新宿区西新宿1-1-1",
    phone: "090-1234-5678",
    email: "test@example.com",
  },
};

function createRequest(body: unknown = validBody) {
  return new NextRequest("http://localhost:3000/api/square/pay", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function setupDefaults() {
  vi.mocked(verifyPatientSession).mockResolvedValue({ patientId: "PID_001", lineUserId: "U123" });
  vi.mocked(checkRateLimit).mockResolvedValue({ limited: false, remaining: 5 });
  vi.mocked(normalizeJPPhone).mockImplementation((v: string) => v?.replace(/-/g, "") || "");
  vi.mocked(parseBody).mockResolvedValue({ data: validBody });
  vi.mocked(getActiveSquareAccount).mockResolvedValue({
    accessToken: "sq-test-token",
    applicationId: "",
    locationId: "LOC_123",
    webhookSignatureKey: "",
    env: "sandbox",
    threeDsEnabled: false,
    baseUrl: "https://connect.squareupsandbox.com",
  });
  vi.mocked(getProductByCode).mockResolvedValue({
    code: "MJL_2.5mg_1m",
    title: "マンジャロ 2.5mg 1ヶ月",
    price: 13000,
  });
  vi.mocked(createSquarePayment).mockResolvedValue({
    ok: true,
    payment: { id: "PAY_001", created_at: "2026-03-01T12:00:00Z", receipt_url: "https://squareup.com/receipt" },
  });
  vi.mocked(ensureSquareCustomer).mockResolvedValue("CUST_001");
  vi.mocked(saveCardOnFile).mockResolvedValue("ccof:SAVED_CARD");
  vi.mocked(acquireLock).mockResolvedValue({ acquired: true, release: vi.fn().mockResolvedValue(undefined) });

  const intakeChain = createChain({ data: { status: "OK" }, error: null });
  setTableChain("intake", intakeChain);
  const ordersChain = createChain({ data: null, error: null });
  setTableChain("orders", ordersChain);
}

describe("POST /api/square/pay 高度テスト", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as unknown as Record<string, Record<string, unknown>>).__testTableChains = {};
    setupDefaults();
  });

  // === マルチフィールド対応 ===
  describe("マルチフィールド NG判定", () => {
    it("マルチフィールド有効時、商品のfield_idでintakeをフィルタ", async () => {
      vi.mocked(isMultiFieldEnabled).mockResolvedValue(true);
      vi.mocked(getProductByCode).mockResolvedValue({
        code: "MJL_2.5mg_1m",
        title: "マンジャロ 2.5mg 1ヶ月",
        price: 13000,
        field_id: "field_derma",
      });

      const intakeChain = createChain({ data: { status: "OK" }, error: null });
      setTableChain("intake", intakeChain);

      const res = await POST(createRequest());
      const body = await res.json();

      expect(body.success).toBe(true);
      expect(isMultiFieldEnabled).toHaveBeenCalledWith("test-tenant");
      // field_id でフィルタのeqが呼ばれている
      expect(intakeChain.eq).toHaveBeenCalledWith("field_id", "field_derma");
    });

    it("マルチフィールド有効でもfield_id未設定の商品はフィルタなし", async () => {
      vi.mocked(isMultiFieldEnabled).mockResolvedValue(true);
      vi.mocked(getProductByCode).mockResolvedValue({
        code: "MJL_2.5mg_1m",
        title: "マンジャロ 2.5mg 1ヶ月",
        price: 13000,
        // field_id なし
      });

      const intakeChain = createChain({ data: { status: "OK" }, error: null });
      setTableChain("intake", intakeChain);

      const res = await POST(createRequest());
      const body = await res.json();

      expect(body.success).toBe(true);
      // field_idなし → eq("field_id", ...) は呼ばれない
      // ただしeqは他の呼び出しがあるので、field_id引数で呼ばれていないことを確認
      const eqCalls = vi.mocked(intakeChain.eq as ReturnType<typeof vi.fn>).mock.calls;
      const fieldIdCall = eqCalls.find((c: unknown[]) => c[0] === "field_id");
      expect(fieldIdCall).toBeUndefined();
    });

    it("マルチフィールド有効かつNG時は403", async () => {
      vi.mocked(isMultiFieldEnabled).mockResolvedValue(true);
      vi.mocked(getProductByCode).mockResolvedValue({
        code: "MJL_2.5mg_1m",
        title: "マンジャロ 2.5mg 1ヶ月",
        price: 13000,
        field_id: "field_aga",
      });

      const intakeChain = createChain({ data: { status: "NG" }, error: null });
      setTableChain("intake", intakeChain);

      const res = await POST(createRequest());
      expect(res.status).toBe(403);
    });

    it("マルチフィールド無効時はfield_idフィルタなし", async () => {
      vi.mocked(isMultiFieldEnabled).mockResolvedValue(false);

      const intakeChain = createChain({ data: { status: "OK" }, error: null });
      setTableChain("intake", intakeChain);

      const res = await POST(createRequest());
      const body = await res.json();

      expect(body.success).toBe(true);
      const eqCalls = vi.mocked(intakeChain.eq as ReturnType<typeof vi.fn>).mock.calls;
      const fieldIdCall = eqCalls.find((c: unknown[]) => c[0] === "field_id");
      expect(fieldIdCall).toBeUndefined();
    });
  });

  // === payment_note 組み立て ===
  describe("payment_note 組み立てロジック", () => {
    it("基本パターン: PID + Product", async () => {
      const res = await POST(createRequest());
      expect(res.status).toBe(200);

      expect(createSquarePayment).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          note: "PID:PID_001;Product:MJL_2.5mg_1m (current)",
        }),
      );
    });

    it("reorderId付きでReorder情報がnoteに含まれる", async () => {
      const reorderBody = { ...validBody, mode: "reorder", reorderId: "42" };
      vi.mocked(parseBody).mockResolvedValue({ data: reorderBody });

      await POST(createRequest(reorderBody));

      expect(createSquarePayment).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          note: "PID:PID_001;Product:MJL_2.5mg_1m (reorder);Reorder:42",
        }),
      );
    });

    it("modeなしの場合はカッコなし", async () => {
      const noModeBody = { ...validBody, mode: null };
      vi.mocked(parseBody).mockResolvedValue({ data: noModeBody });

      await POST(createRequest(noModeBody));

      expect(createSquarePayment).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          note: "PID:PID_001;Product:MJL_2.5mg_1m",
        }),
      );
    });
  });

  // === 配送先フォーマット ===
  describe("配送先フォーマット", () => {
    it("郵便番号がハイフンなし7桁ならハイフン挿入", async () => {
      const body = { ...validBody, shipping: { ...validBody.shipping, postalCode: "1600023" } };
      vi.mocked(parseBody).mockResolvedValue({ data: body });

      const ordersChain = createChain({ data: null, error: null });
      setTableChain("orders", ordersChain);

      await POST(createRequest(body));

      expect(ordersChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({ postal_code: "160-0023" }),
      );
    });

    it("郵便番号が既にハイフン付きならそのまま", async () => {
      const body = { ...validBody, shipping: { ...validBody.shipping, postalCode: "160-0023" } };
      vi.mocked(parseBody).mockResolvedValue({ data: body });

      const ordersChain = createChain({ data: null, error: null });
      setTableChain("orders", ordersChain);

      await POST(createRequest(body));

      expect(ordersChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({ postal_code: "160-0023" }),
      );
    });

    it("電話番号はnormalizeJPPhoneで正規化される", async () => {
      await POST(createRequest());

      expect(normalizeJPPhone).toHaveBeenCalledWith("090-1234-5678");
    });

    it("orders INSERTに全配送情報が含まれる", async () => {
      const ordersChain = createChain({ data: null, error: null });
      setTableChain("orders", ordersChain);

      await POST(createRequest());

      expect(ordersChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          shipping_name: "山田太郎",
          address: "東京都新宿区西新宿1-1-1",
          email: "test@example.com",
          payment_status: "COMPLETED",
          payment_method: "credit_card",
          shipping_status: "pending",
          status: "confirmed",
        }),
      );
    });

    it("郵便番号が非標準フォーマットの場合はそのまま保存", async () => {
      const body = { ...validBody, shipping: { ...validBody.shipping, postalCode: "ABC" } };
      vi.mocked(parseBody).mockResolvedValue({ data: body });

      const ordersChain = createChain({ data: null, error: null });
      setTableChain("orders", ordersChain);

      await POST(createRequest(body));

      // 7桁でないのでそのまま
      expect(ordersChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({ postal_code: "ABC" }),
      );
    });
  });

  // === payment_thank メッセージ送信 ===
  describe("payment_thank メッセージ送信", () => {
    it("notifyReorderPaid有効 + LINE ID ありでサンクスメッセージ送信", async () => {
      vi.mocked(getBusinessRules).mockResolvedValue({
        notifyReorderPaid: true,
        paymentThankMessageCard: "お支払いありがとうございます",
      } as any);

      const patientsChain = createChain({ data: { line_id: "U_LINE_001" }, error: null });
      setTableChain("patients", patientsChain);

      await POST(createRequest());

      expect(sendPaymentThankNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          patientId: "PID_001",
          lineUid: "U_LINE_001",
          message: "お支払いありがとうございます",
          paymentMethod: "credit_card",
          productName: "マンジャロ 2.5mg 1ヶ月",
          amount: 13000,
        }),
      );
    });

    it("notifyReorderPaid無効時はサンクスメッセージ送信しない", async () => {
      vi.mocked(getBusinessRules).mockResolvedValue({
        notifyReorderPaid: false,
      } as any);

      await POST(createRequest());

      expect(sendPaymentThankNotification).not.toHaveBeenCalled();
    });

    it("LINE IDなしの患者にはサンクスメッセージ送信しない", async () => {
      vi.mocked(getBusinessRules).mockResolvedValue({
        notifyReorderPaid: true,
        paymentThankMessageCard: "ありがとう",
      } as any);

      const patientsChain = createChain({ data: { line_id: null }, error: null });
      setTableChain("patients", patientsChain);

      await POST(createRequest());

      expect(sendPaymentThankNotification).not.toHaveBeenCalled();
    });

    it("paymentThankMessageCard未設定時はデフォルトメッセージ", async () => {
      vi.mocked(getBusinessRules).mockResolvedValue({
        notifyReorderPaid: true,
        paymentThankMessageCard: undefined,
      } as any);

      const patientsChain = createChain({ data: { line_id: "U_LINE_001" }, error: null });
      setTableChain("patients", patientsChain);

      await POST(createRequest());

      expect(sendPaymentThankNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "お支払いありがとうございます。発送準備を進めてまいります。",
        }),
      );
    });

    it("サンクスメッセージ送信エラーでも決済成功レスポンスを返す", async () => {
      vi.mocked(getBusinessRules).mockResolvedValue({
        notifyReorderPaid: true,
        paymentThankMessageCard: "test",
      } as any);

      const patientsChain = createChain({ data: { line_id: "U_LINE_001" }, error: null });
      setTableChain("patients", patientsChain);

      vi.mocked(sendPaymentThankNotification).mockRejectedValue(new Error("LINE API error"));

      const res = await POST(createRequest());
      const body = await res.json();

      expect(body.success).toBe(true);
      expect(body.paymentId).toBe("PAY_001");
    });
  });

  // === タグ自動付与 ===
  describe("タグ自動付与", () => {
    it("決済成功後にevaluateTagAutoRulesが呼ばれる", async () => {
      await POST(createRequest());

      expect(evaluateTagAutoRules).toHaveBeenCalledWith(
        "PID_001",
        "checkout_completed",
        "test-tenant",
      );
    });

    it("evaluateTagAutoRulesの例外は握りつぶされる（fire-and-forget）", async () => {
      vi.mocked(evaluateTagAutoRules).mockRejectedValue(new Error("tag error"));

      const res = await POST(createRequest());
      const body = await res.json();

      // エラーでも決済成功
      expect(body.success).toBe(true);
    });
  });

  // === 分散ロック ===
  describe("分散ロック", () => {
    it("ロック取得失敗で409を返す", async () => {
      vi.mocked(acquireLock).mockResolvedValue({ acquired: false, release: vi.fn() });

      const res = await POST(createRequest());
      const body = await res.json();

      expect(res.status).toBe(409);
      expect(body.message).toContain("決済処理中");
    });

    it("処理完了後にロックが解放される", async () => {
      const release = vi.fn().mockResolvedValue(undefined);
      vi.mocked(acquireLock).mockResolvedValue({ acquired: true, release });

      await POST(createRequest());

      expect(release).toHaveBeenCalled();
    });

    it("処理エラー時でもロックが解放される（finally）", async () => {
      const release = vi.fn().mockResolvedValue(undefined);
      vi.mocked(acquireLock).mockResolvedValue({ acquired: true, release });
      vi.mocked(createSquarePayment).mockRejectedValue(new Error("Square API error"));

      await POST(createRequest());

      expect(release).toHaveBeenCalled();
    });
  });

  // === セッション検証なし ===
  describe("セッション未認証", () => {
    it("verifyPatientSession がnullを返すと403", async () => {
      const { verifyPatientSession } = await import("@/lib/patient-session");
      vi.mocked(verifyPatientSession).mockResolvedValue(null);

      const res = await POST(createRequest());
      expect(res.status).toBe(403);
    });
  });

  // === IPレート制限 ===
  describe("IPレート制限", () => {
    it("IP制限に引っかかると429", async () => {
      // 両方のレート制限チェックで、IP側だけlimitedにする
      vi.mocked(checkRateLimit).mockImplementation(async (key: string) => {
        if (key.startsWith("square-pay:ip:")) {
          return { limited: true, remaining: 0, retryAfter: 300 };
        }
        return { limited: false, remaining: 5 };
      });

      const res = await POST(createRequest());
      const body = await res.json();

      expect(res.status).toBe(429);
      expect(body.message).toContain("決済リクエストが多すぎます");
    });
  });

  // === レスポンス構造 ===
  describe("レスポンス構造", () => {
    it("成功レスポンスにpaymentIdとreceiptUrlが含まれる", async () => {
      const res = await POST(createRequest());
      const body = await res.json();

      expect(body.success).toBe(true);
      expect(body.paymentId).toBe("PAY_001");
      expect(body.receiptUrl).toBe("https://squareup.com/receipt");
    });
  });
});
