// lib/__tests__/payment-gmo.test.ts
// GmoPaymentProvider クラスのテスト
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GmoPaymentProvider } from "@/lib/payment/gmo";

// getSettingOrEnv をモック
vi.mock("@/lib/settings", () => ({
  getSettingOrEnv: vi.fn(),
}));

import { getSettingOrEnv } from "@/lib/settings";
const mockGetSettingOrEnv = vi.mocked(getSettingOrEnv);

// --- ヘルパー ---

/** GMO API レスポンス形式（key=value&key=value）を返す fetch モック */
function mockFetchResponse(responseMap: Record<string, string>) {
  const body = Object.entries(responseMap)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
  return vi.fn().mockResolvedValue({
    text: () => Promise.resolve(body),
  });
}

/** 複数 API 呼び出しを順番にモック */
function mockFetchSequence(responses: Record<string, string>[]) {
  const fn = vi.fn();
  for (let i = 0; i < responses.length; i++) {
    const body = Object.entries(responses[i])
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join("&");
    fn.mockResolvedValueOnce({ text: () => Promise.resolve(body) });
  }
  return fn;
}

/** getSettingOrEnv のデフォルト設定（全値あり） */
function setupDefaultConfig() {
  mockGetSettingOrEnv.mockImplementation(async (_cat, key, _env) => {
    const map: Record<string, string> = {
      shop_id: "tshop00001",
      shop_pass: "pass1234",
      site_id: "tsite00001",
      site_pass: "sitepass",
      env: "sandbox",
    };
    return map[key];
  });
}

describe("GmoPaymentProvider", () => {
  let provider: GmoPaymentProvider;

  beforeEach(() => {
    vi.restoreAllMocks();
    provider = new GmoPaymentProvider();
  });

  // =============================================
  // createCheckoutLink
  // =============================================
  describe("createCheckoutLink", () => {
    it("正常フロー: EntryTran成功でcheckoutUrl・paymentLinkIdを返却", async () => {
      setupDefaultConfig();
      const fetchMock = mockFetchResponse({
        AccessID: "acc_id_123",
        AccessPass: "acc_pass_456",
      });
      vi.stubGlobal("fetch", fetchMock);

      const result = await provider.createCheckoutLink({
        productTitle: "テスト商品",
        price: 5000,
        redirectUrl: "https://example.com/return",
        metadata: { patientId: "p1", productCode: "prod1" },
      });

      expect(result.checkoutUrl).toContain("https://pt01.mul-pay.jp/link/tran/credit");
      expect(result.checkoutUrl).toContain("AccessID=acc_id_123");
      expect(result.paymentLinkId).toBeTruthy();
      // EntryTran が正しいエンドポイントに呼ばれていること
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/payment/EntryTran.idPass"),
        expect.objectContaining({ method: "POST" }),
      );
    });

    it("shop_id未設定でError", async () => {
      mockGetSettingOrEnv.mockImplementation(async (_cat, key, _env) => {
        if (key === "shop_id") return undefined;
        if (key === "shop_pass") return "pass";
        if (key === "env") return "sandbox";
        return undefined;
      });

      await expect(
        provider.createCheckoutLink({
          productTitle: "商品",
          price: 3000,
          redirectUrl: "https://example.com/return",
          metadata: {},
        }),
      ).rejects.toThrow("GMO設定が不足しています");
    });

    it("EntryTranがErrCode返却でError", async () => {
      setupDefaultConfig();
      const fetchMock = mockFetchResponse({
        ErrCode: "E01",
        ErrInfo: "E01010001",
      });
      vi.stubGlobal("fetch", fetchMock);

      await expect(
        provider.createCheckoutLink({
          productTitle: "商品",
          price: 3000,
          redirectUrl: "https://example.com/return",
          metadata: {},
        }),
      ).rejects.toThrow("GMO取引登録に失敗しました");
    });

    it("AccessID/AccessPassなしでError", async () => {
      setupDefaultConfig();
      // ErrCode なしだが AccessID/AccessPass もない不正レスポンス
      const fetchMock = mockFetchResponse({ Status: "OK" });
      vi.stubGlobal("fetch", fetchMock);

      await expect(
        provider.createCheckoutLink({
          productTitle: "商品",
          price: 3000,
          redirectUrl: "https://example.com/return",
          metadata: {},
        }),
      ).rejects.toThrow("GMO取引登録レスポンスが不正です");
    });

    it("metadataがclientFieldに正しく埋め込まれる（PID:xxx;Product:yyy形式）", async () => {
      setupDefaultConfig();
      const fetchMock = mockFetchResponse({
        AccessID: "acc1",
        AccessPass: "pass1",
      });
      vi.stubGlobal("fetch", fetchMock);

      const result = await provider.createCheckoutLink({
        productTitle: "商品A",
        price: 10000,
        redirectUrl: "https://example.com/return",
        metadata: {
          patientId: "patient_001",
          productCode: "GLP1",
          mode: "first",
          reorderId: "reorder_99",
        },
      });

      // checkoutUrl のクエリパラメータに ClientField1 が含まれる
      const url = new URL(result.checkoutUrl);
      const clientField1 = url.searchParams.get("ClientField1") || "";
      expect(clientField1).toContain("PID:patient_001");
      expect(clientField1).toContain("Product:GLP1");
      expect(clientField1).toContain("Mode:first");
      expect(clientField1).toContain("Reorder:reorder_99");
    });
  });

  // =============================================
  // verifyWebhook
  // =============================================
  describe("verifyWebhook", () => {
    /** Webhook リクエストを生成するヘルパー */
    function makeWebhookRequest(params: Record<string, string>): Request {
      const body = new URLSearchParams(params).toString();
      return new Request("https://example.com/api/webhook/gmo", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
    }

    it("Status=CAPTUREでpayment.createdイベントを返す", async () => {
      const req = makeWebhookRequest({
        ShopID: "shop1",
        OrderID: "ord_001",
        Status: "CAPTURE",
        Amount: "5000",
        AccessID: "acc_123",
        ClientField1: "PID:p1;Product:prod1",
      });

      const event = await provider.verifyWebhook(req);
      expect(event).not.toBeNull();
      expect(event!.type).toBe("payment.created");
      expect(event!.amount).toBe(5000);
      expect(event!.orderId).toBe("ord_001");
      expect(event!.paymentId).toBe("acc_123");
      expect(event!.currency).toBe("JPY");
      expect(event!.metadata).toEqual({
        patientId: "p1",
        productCode: "prod1",
      });
    });

    it("Status=SALESでpayment.createdイベントを返す", async () => {
      const req = makeWebhookRequest({
        OrderID: "ord_002",
        Status: "SALES",
        Amount: "3000",
        AccessID: "acc_456",
      });

      const event = await provider.verifyWebhook(req);
      expect(event).not.toBeNull();
      expect(event!.type).toBe("payment.created");
      expect(event!.amount).toBe(3000);
    });

    it("Status=RETURNでrefund.createdイベントを返す", async () => {
      const req = makeWebhookRequest({
        OrderID: "ord_003",
        Status: "RETURN",
        Amount: "2000",
        AccessID: "acc_789",
      });

      const event = await provider.verifyWebhook(req);
      expect(event).not.toBeNull();
      expect(event!.type).toBe("refund.created");
      expect(event!.amount).toBe(2000);
    });

    it("Status=CANCELでrefund.createdイベントを返す", async () => {
      const req = makeWebhookRequest({
        OrderID: "ord_004",
        Status: "CANCEL",
        Amount: "1000",
      });

      const event = await provider.verifyWebhook(req);
      expect(event).not.toBeNull();
      expect(event!.type).toBe("refund.created");
      expect(event!.amount).toBe(1000);
    });

    it("未知のStatusでnullを返す", async () => {
      const req = makeWebhookRequest({
        OrderID: "ord_005",
        Status: "UNKNOWN_STATUS",
        Amount: "500",
      });

      const event = await provider.verifyWebhook(req);
      expect(event).toBeNull();
    });

    it("不正なボディでnullを返す", async () => {
      // text() が例外を投げるリクエストを模擬
      const req = {
        text: () => {
          throw new Error("parse error");
        },
      } as unknown as Request;

      const event = await provider.verifyWebhook(req);
      expect(event).toBeNull();
    });
  });

  // =============================================
  // processRefund
  // =============================================
  describe("processRefund", () => {
    it("全額返金: SearchTrade成功→AlterTran(RETURN)で{success:true}を返す", async () => {
      setupDefaultConfig();
      const fetchMock = mockFetchSequence([
        // SearchTrade レスポンス
        { AccessID: "acc_r1", AccessPass: "pass_r1", Status: "CAPTURE" },
        // AlterTran レスポンス
        { Status: "RETURN" },
      ]);
      vi.stubGlobal("fetch", fetchMock);

      const result = await provider.processRefund("ord_refund_001");

      expect(result.success).toBe(true);
      expect(result.refundId).toBe("ord_refund_001");
      expect(result.status).toBe("RETURN");

      // AlterTran の呼び出しで JobCd=RETURN であること
      const alterCall = fetchMock.mock.calls[1];
      expect(alterCall[0]).toContain("/payment/AlterTran.idPass");
      const alterBody = alterCall[1].body as string;
      expect(alterBody).toContain("JobCd=RETURN");
      expect(alterBody).not.toContain("RETURNX");
    });

    it("部分返金: amount指定でAlterTran(RETURNX, Amount)を呼ぶ", async () => {
      setupDefaultConfig();
      const fetchMock = mockFetchSequence([
        { AccessID: "acc_r2", AccessPass: "pass_r2", Status: "CAPTURE" },
        { Status: "RETURNX" },
      ]);
      vi.stubGlobal("fetch", fetchMock);

      const result = await provider.processRefund("ord_refund_002", 2000);

      expect(result.success).toBe(true);

      // AlterTran の呼び出しで JobCd=RETURNX, Amount=2000
      const alterCall = fetchMock.mock.calls[1];
      const alterBody = alterCall[1].body as string;
      expect(alterBody).toContain("JobCd=RETURNX");
      expect(alterBody).toContain("Amount=2000");
    });

    it("SearchTrade失敗(ErrCode)で{success:false}を返す", async () => {
      setupDefaultConfig();
      const fetchMock = mockFetchResponse({
        ErrCode: "E01",
        ErrInfo: "E01040001",
      });
      vi.stubGlobal("fetch", fetchMock);

      const result = await provider.processRefund("ord_not_found");

      expect(result.success).toBe(false);
      expect(result.status).toContain("検索失敗");
    });

    it("AlterTran失敗で{success:false}を返す", async () => {
      setupDefaultConfig();
      const fetchMock = mockFetchSequence([
        { AccessID: "acc_r3", AccessPass: "pass_r3" },
        { ErrCode: "E01", ErrInfo: "E01050001" },
      ]);
      vi.stubGlobal("fetch", fetchMock);

      const result = await provider.processRefund("ord_alter_fail");

      expect(result.success).toBe(false);
      expect(result.status).toContain("返金失敗");
    });

    it("設定不足(shopId/shopPass未設定)で{success:false}を返す", async () => {
      mockGetSettingOrEnv.mockImplementation(async (_cat, key, _env) => {
        if (key === "shop_id") return undefined;
        if (key === "shop_pass") return undefined;
        if (key === "env") return "sandbox";
        return undefined;
      });

      const result = await provider.processRefund("ord_no_config");

      expect(result.success).toBe(false);
      expect(result.status).toContain("GMO設定が不足しています");
    });

    it("SearchTradeでAccessID/AccessPassなしで{success:false}を返す", async () => {
      setupDefaultConfig();
      // ErrCode なしだが AccessID/AccessPass もないレスポンス
      const fetchMock = mockFetchResponse({ Status: "UNKNOWN" });
      vi.stubGlobal("fetch", fetchMock);

      const result = await provider.processRefund("ord_no_access");

      expect(result.success).toBe(false);
      expect(result.status).toBe("取引情報が見つかりません");
    });
  });

  // =============================================
  // parseClientField（verifyWebhook経由でテスト）
  // =============================================
  describe("parseClientField", () => {
    it("ClientField文字列を正しくパースする", async () => {
      const req = new Request("https://example.com/api/webhook/gmo", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          OrderID: "ord_parse",
          Status: "CAPTURE",
          Amount: "9999",
          AccessID: "acc_parse",
          ClientField1: "PID:p1;Product:prod1;Mode:first;Reorder:r1",
        }).toString(),
      });

      const event = await provider.verifyWebhook(req);
      expect(event).not.toBeNull();
      expect(event!.metadata).toEqual({
        patientId: "p1",
        productCode: "prod1",
        mode: "first",
        reorderId: "r1",
      });
    });
  });
});
