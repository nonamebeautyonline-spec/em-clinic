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

  private async getConfig() {
    const shopId = await getSettingOrEnv("gmo", "shop_id", "GMO_SHOP_ID");
    const shopPass = await getSettingOrEnv("gmo", "shop_pass", "GMO_SHOP_PASS");
    const siteId = await getSettingOrEnv("gmo", "site_id", "GMO_SITE_ID");
    const sitePass = await getSettingOrEnv("gmo", "site_pass", "GMO_SITE_PASS");
    const env = await getSettingOrEnv("gmo", "env", "GMO_ENV") || "production";

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
      const changeParams: Record<string, any> = {
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
    } catch (e: any) {
      console.error("[GMO] processRefund error:", e);
      return { success: false, status: e.message || "返金処理でエラーが発生しました" };
    }
  }

  // --- private helpers ---

  /** GMO PG API呼び出し（application/x-www-form-urlencoded） */
  private async callApi(
    baseUrl: string,
    path: string,
    params: Record<string, any>,
  ): Promise<Record<string, string>> {
    const body = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) {
        body.append(k, String(v));
      }
    }

    const res = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

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
