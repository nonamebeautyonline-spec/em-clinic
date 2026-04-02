// lib/payment/gmo.ts — GMO ペイメントゲートウェイ実装
import crypto from "crypto";
import { getSettingOrEnv } from "@/lib/settings";
import type {
  PaymentProvider,
  CheckoutParams,
  CheckoutResult,
  WebhookEvent,
  RefundResult,
} from "./types";

// GMO PG API エンドポイント
const GMO_SANDBOX_URL = "https://pt01.mul-pay.jp";
const GMO_PRODUCTION_URL = "https://p01.mul-pay.jp";

export class GmoPaymentProvider implements PaymentProvider {
  name = "gmo";
  private tenantId?: string;

  constructor(tenantId?: string) {
    this.tenantId = tenantId;
  }

  private async getConfig() {
    const tid = this.tenantId;
    const shopId = await getSettingOrEnv("gmo", "shop_id", "GMO_SHOP_ID", tid);
    const shopPass = await getSettingOrEnv("gmo", "shop_pass", "GMO_SHOP_PASS", tid);
    const siteId = await getSettingOrEnv("gmo", "site_id", "GMO_SITE_ID", tid);
    const sitePass = await getSettingOrEnv("gmo", "site_pass", "GMO_SITE_PASS", tid);
    const env = await getSettingOrEnv("gmo", "env", "GMO_ENV", tid) || "production";

    const baseUrl = env === "sandbox" ? GMO_SANDBOX_URL : GMO_PRODUCTION_URL;

    return { shopId, shopPass, siteId, sitePass, env, baseUrl };
  }

  /**
   * GMO PG のリンク型決済を利用してチェックアウトURLを生成
   * https://docs.mul-pay.jp/payment/credit/linktype
   */
  async createCheckoutLink(params: CheckoutParams): Promise<CheckoutResult> {
    const config = await this.getConfig();

    if (!config.shopId || !config.shopPass) {
      throw new Error("GMO設定が不足しています: shop_id または shop_pass");
    }

    // 注文IDを生成（GMO は最大27文字）
    const orderId = `ord_${Date.now().toString(36)}_${crypto.randomBytes(4).toString("hex")}`.slice(0, 27);

    // メタデータをclientField（自由項目）に埋め込み
    const clientField = [
      params.metadata.patientId ? `PID:${params.metadata.patientId}` : "",
      params.metadata.productCode ? `Product:${params.metadata.productCode}` : "",
      params.metadata.mode ? `Mode:${params.metadata.mode}` : "",
      params.metadata.reorderId ? `Reorder:${params.metadata.reorderId}` : "",
      params.metadata.couponId ? `Coupon:${params.metadata.couponId}` : "",
      params.metadata.campaignId ? `Campaign:${params.metadata.campaignId}` : "",
    ].filter(Boolean).join(";");

    // Step 1: 取引登録 (EntryTran)
    const entryRes = await this.callApi(config.baseUrl, "/payment/EntryTran.idPass", {
      ShopID: config.shopId,
      ShopPass: config.shopPass,
      OrderID: orderId,
      JobCd: "CAPTURE", // 即時売上
      Amount: params.price,
    });

    if (entryRes.ErrCode) {
      console.error("[GMO] EntryTran failed:", entryRes.ErrCode, entryRes.ErrInfo);
      throw new Error(`GMO取引登録に失敗しました: ${entryRes.ErrInfo || entryRes.ErrCode}`);
    }

    const accessId = entryRes.AccessID;
    const accessPass = entryRes.AccessPass;

    if (!accessId || !accessPass) {
      throw new Error("GMO取引登録レスポンスが不正です");
    }

    // Step 2: リンク型決済URL生成
    // GMO のリンク型決済は、パラメータをクエリ文字列で渡す
    const linkParams = new URLSearchParams({
      ShopID: config.shopId!,
      AccessID: accessId,
      OrderID: orderId,
      RetURL: params.redirectUrl,
      ClientField1: clientField.slice(0, 100),
      ClientField2: params.productTitle.slice(0, 100),
      ClientField3: orderId,
    });

    const checkoutUrl = `${config.baseUrl}/link/tran/credit?${linkParams.toString()}`;

    return {
      checkoutUrl,
      paymentLinkId: orderId,
    };
  }

  /**
   * GMO PG の結果通知を検証・パース
   * GMO は POST で通知を送信（Webhook）
   */
  async verifyWebhook(req: Request): Promise<WebhookEvent | null> {
    try {
      const body = await req.text();
      const params = new URLSearchParams(body);

      const shopId = params.get("ShopID");
      const orderId = params.get("OrderID");
      const status = params.get("Status");
      const amount = params.get("Amount");
      const accessId = params.get("AccessID");

      // ClientField からメタデータを復元
      const clientField1 = params.get("ClientField1") || "";

      // 結果通知の種別判定
      if (status === "CAPTURE" || status === "SALES") {
        // 決済完了
        return {
          type: "payment.created",
          paymentId: accessId || orderId || undefined,
          orderId: orderId || undefined,
          amount: amount ? parseInt(amount, 10) : undefined,
          currency: "JPY",
          metadata: this.parseClientField(clientField1),
          rawEvent: Object.fromEntries(params.entries()),
        };
      }

      if (status === "RETURN" || status === "RETURNX") {
        // 返金
        return {
          type: "refund.created",
          paymentId: accessId || orderId || undefined,
          orderId: orderId || undefined,
          amount: amount ? parseInt(amount, 10) : undefined,
          rawEvent: Object.fromEntries(params.entries()),
        };
      }

      if (status === "CANCEL" || status === "VOID") {
        // キャンセル（返金扱い）
        return {
          type: "refund.created",
          paymentId: accessId || orderId || undefined,
          orderId: orderId || undefined,
          amount: amount ? parseInt(amount, 10) : undefined,
          rawEvent: Object.fromEntries(params.entries()),
        };
      }

      console.warn("[GMO] 未対応の結果通知ステータス:", status);
      return null;
    } catch (e) {
      console.error("[GMO] Webhook parse error:", e);
      return null;
    }
  }

  /**
   * GMO PG の返金処理（ChangeTran で RETURN に変更）
   */
  async processRefund(paymentId: string, amount?: number): Promise<RefundResult> {
    const config = await this.getConfig();

    if (!config.shopId || !config.shopPass) {
      return { success: false, status: "GMO設定が不足しています" };
    }

    try {
      // Step 1: 取引情報を検索して AccessID/AccessPass を取得
      const searchRes = await this.callApi(config.baseUrl, "/payment/SearchTrade.idPass", {
        ShopID: config.shopId,
        ShopPass: config.shopPass,
        OrderID: paymentId,
      });

      if (searchRes.ErrCode) {
        console.error("[GMO] SearchTrade failed:", searchRes.ErrCode, searchRes.ErrInfo);
        return { success: false, status: `検索失敗: ${searchRes.ErrInfo || searchRes.ErrCode}` };
      }

      const accessId = searchRes.AccessID;
      const accessPass = searchRes.AccessPass;

      if (!accessId || !accessPass) {
        return { success: false, status: "取引情報が見つかりません" };
      }

      // Step 2: 取引変更（返金）
      const changeParams: Record<string, string | number> = {
        ShopID: config.shopId,
        ShopPass: config.shopPass,
        AccessID: accessId,
        AccessPass: accessPass,
        JobCd: "RETURN",
      };

      // 部分返金の場合は金額を指定
      if (amount) {
        changeParams.JobCd = "RETURNX"; // 金額変更返品
        changeParams.Amount = amount;
      }

      const changeRes = await this.callApi(config.baseUrl, "/payment/AlterTran.idPass", changeParams);

      if (changeRes.ErrCode) {
        console.error("[GMO] AlterTran failed:", changeRes.ErrCode, changeRes.ErrInfo);
        return { success: false, status: `返金失敗: ${changeRes.ErrInfo || changeRes.ErrCode}` };
      }

      return {
        success: true,
        refundId: paymentId,
        status: changeRes.Status || "RETURN",
      };
    } catch (e) {
      console.error("[GMO] processRefund error:", e);
      return { success: false, status: (e instanceof Error ? e.message : null) || "返金処理でエラーが発生しました" };
    }
  }

  // --- インライン決済（トークン型）メソッド ---

  /**
   * トークンで決済実行（EntryTran → ExecTran）
   * 3Dセキュア2.0対応
   */
  async execTranToken(params: {
    accessId: string;
    accessPass: string;
    orderId: string;
    token: string;
    amount: number;
    clientField1?: string;
    clientField2?: string;
    clientField3?: string;
    retUrl?: string;
  }): Promise<Record<string, string>> {
    const config = await this.getConfig();
    return this.callApi(config.baseUrl, "/payment/ExecTran.idPass", {
      AccessID: params.accessId,
      AccessPass: params.accessPass,
      OrderID: params.orderId,
      Method: 1, // 一括払い
      Token: params.token,
      // 3Dセキュア2.0
      TdFlag: 2,
      Tds2Type: 2,
      ...(params.retUrl ? { RetUrl: params.retUrl } : {}),
      ...(params.clientField1 ? { ClientField1: params.clientField1 } : {}),
      ...(params.clientField2 ? { ClientField2: params.clientField2 } : {}),
      ...(params.clientField3 ? { ClientField3: params.clientField3 } : {}),
    });
  }

  /**
   * 保存済みカードで決済実行（EntryTran → ExecTran with MemberID/CardSeq）
   */
  async execTranWithMember(params: {
    accessId: string;
    accessPass: string;
    orderId: string;
    memberId: string;
    cardSeq: string;
    amount: number;
    clientField1?: string;
    clientField2?: string;
    clientField3?: string;
    retUrl?: string;
  }): Promise<Record<string, string>> {
    const config = await this.getConfig();
    return this.callApi(config.baseUrl, "/payment/ExecTran.idPass", {
      AccessID: params.accessId,
      AccessPass: params.accessPass,
      OrderID: params.orderId,
      Method: 1,
      SiteID: config.siteId!,
      SitePass: config.sitePass!,
      MemberID: params.memberId,
      CardSeq: params.cardSeq,
      // 3Dセキュア2.0
      TdFlag: 2,
      Tds2Type: 2,
      ...(params.retUrl ? { RetUrl: params.retUrl } : {}),
      ...(params.clientField1 ? { ClientField1: params.clientField1 } : {}),
      ...(params.clientField2 ? { ClientField2: params.clientField2 } : {}),
      ...(params.clientField3 ? { ClientField3: params.clientField3 } : {}),
    });
  }

  /**
   * GMO会員登録（SaveMember）
   * 既存会員の場合はエラーコードE01390010を検出して正常扱い
   */
  async saveMember(memberId: string): Promise<{ ok: boolean; memberId: string }> {
    const config = await this.getConfig();
    if (!config.siteId || !config.sitePass) {
      throw new Error("GMO設定が不足しています: site_id または site_pass");
    }
    const res = await this.callApi(config.baseUrl, "/payment/SaveMember.idPass", {
      SiteID: config.siteId,
      SitePass: config.sitePass,
      MemberID: memberId,
      MemberName: memberId,
    });
    // E01390010 = 既に存在する会員ID → 正常扱い
    if (res.ErrCode && !res.ErrInfo?.includes("E01390010")) {
      console.error("[GMO] SaveMember failed:", res.ErrCode, res.ErrInfo);
      throw new Error(`GMO会員登録に失敗しました: ${res.ErrInfo || res.ErrCode}`);
    }
    return { ok: true, memberId };
  }

  /**
   * カード保存（SaveCard）— トークンで登録
   */
  async saveCard(memberId: string, token: string): Promise<{ cardSeq: string }> {
    const config = await this.getConfig();
    if (!config.siteId || !config.sitePass) {
      throw new Error("GMO設定が不足しています: site_id または site_pass");
    }
    const res = await this.callApi(config.baseUrl, "/payment/SaveCard.idPass", {
      SiteID: config.siteId,
      SitePass: config.sitePass,
      MemberID: memberId,
      Token: token,
    });
    if (res.ErrCode) {
      console.error("[GMO] SaveCard failed:", res.ErrCode, res.ErrInfo);
      throw new Error(`GMOカード保存に失敗しました: ${res.ErrInfo || res.ErrCode}`);
    }
    return { cardSeq: res.CardSeq || "0" };
  }

  /**
   * 保存済みカード情報取得（SearchCard）
   */
  async searchCard(memberId: string): Promise<{
    hasCard: boolean;
    cardSeq?: string;
    cardNo?: string; // マスク済み（****1234）
    brand?: string;
    expire?: string;
  }> {
    const config = await this.getConfig();
    if (!config.siteId || !config.sitePass) {
      return { hasCard: false };
    }
    const res = await this.callApi(config.baseUrl, "/payment/SearchCard.idPass", {
      SiteID: config.siteId,
      SitePass: config.sitePass,
      MemberID: memberId,
      SeqMode: 0, // 降順（最新カードが先頭）
    });
    if (res.ErrCode) {
      // E01390002 = 会員が存在しない、E01240002 = カードが存在しない
      if (res.ErrInfo?.includes("E01390002") || res.ErrInfo?.includes("E01240002")) {
        return { hasCard: false };
      }
      console.error("[GMO] SearchCard failed:", res.ErrCode, res.ErrInfo);
      return { hasCard: false };
    }
    // レスポンスはパイプ区切りで複数カード（最新=先頭）
    const cardSeq = res.CardSeq?.split("|")[0];
    const cardNo = res.CardNo?.split("|")[0];
    const forwardCode = res.Forward?.split("|")[0];
    const expire = res.Expire?.split("|")[0];
    // カード番号の先頭桁からブランドを推定
    const firstDigit = cardNo?.replace(/\*/g, "").charAt(0);
    const brandMap: Record<string, string> = { "4": "VISA", "5": "Mastercard", "3": "AMEX/JCB", "6": "Discover" };
    const brand = brandMap[firstDigit || ""] || forwardCode;
    if (!cardSeq) return { hasCard: false };
    return { hasCard: true, cardSeq, cardNo, brand, expire };
  }

  /**
   * 3Dセキュア2.0 認証結果確認（SecureTran2）
   */
  async secureTran2(accessId: string, accessPass: string): Promise<Record<string, string>> {
    const config = await this.getConfig();
    return this.callApi(config.baseUrl, "/payment/SecureTran2.idPass", {
      ShopID: config.shopId!,
      ShopPass: config.shopPass!,
      AccessID: accessId,
      AccessPass: accessPass,
    });
  }

  /**
   * 取引登録（EntryTran）— 公開ラッパー
   */
  async entryTran(params: {
    orderId: string;
    amount: number;
    jobCd?: string;
  }): Promise<{ accessId: string; accessPass: string }> {
    const config = await this.getConfig();
    if (!config.shopId || !config.shopPass) {
      throw new Error("GMO設定が不足しています: shop_id または shop_pass");
    }
    const res = await this.callApi(config.baseUrl, "/payment/EntryTran.idPass", {
      ShopID: config.shopId,
      ShopPass: config.shopPass,
      OrderID: params.orderId,
      JobCd: params.jobCd || "CAPTURE",
      Amount: params.amount,
    });
    if (res.ErrCode) {
      console.error("[GMO] EntryTran failed:", res.ErrCode, res.ErrInfo);
      throw new Error(`GMO取引登録に失敗しました: ${res.ErrInfo || res.ErrCode}`);
    }
    if (!res.AccessID || !res.AccessPass) {
      throw new Error("GMO取引登録レスポンスが不正です");
    }
    return { accessId: res.AccessID, accessPass: res.AccessPass };
  }

  // --- private helpers ---

  /** GMO PG API呼び出し（application/x-www-form-urlencoded） */
  private async callApi(
    baseUrl: string,
    path: string,
    params: Record<string, string | number>,
  ): Promise<Record<string, string>> {
    const body = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) {
        body.append(k, String(v));
      }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    let res: Response;
    try {
      res = await fetch(`${baseUrl}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
        signal: controller.signal,
      });
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        throw new Error(`GMO API タイムアウト: ${path}`);
      }
      throw e;
    } finally {
      clearTimeout(timeout);
    }

    const text = await res.text();
    // GMO のレスポンスは key=value&key=value 形式
    const result: Record<string, string> = {};
    for (const pair of text.split("&")) {
      const [k, v] = pair.split("=");
      if (k) result[decodeURIComponent(k)] = decodeURIComponent(v || "");
    }
    return result;
  }

  /** ClientField1 のメタデータ文字列をパース */
  private parseClientField(field: string): Record<string, string> {
    const result: Record<string, string> = {};
    for (const part of field.split(";")) {
      const [k, v] = part.split(":");
      if (k && v) {
        const keyMap: Record<string, string> = {
          PID: "patientId",
          Product: "productCode",
          Mode: "mode",
          Reorder: "reorderId",
        };
        result[keyMap[k] || k] = v;
      }
    }
    return result;
  }
}
