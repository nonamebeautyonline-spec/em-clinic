// lib/payment/square.ts — Square 決済プロバイダー実装
import crypto from "crypto";
import { getSettingOrEnv } from "@/lib/settings";
import type {
  PaymentProvider,
  CheckoutParams,
  CheckoutResult,
  WebhookEvent,
  RefundResult,
} from "./types";

export class SquarePaymentProvider implements PaymentProvider {
  name = "square";

  private async getConfig() {
    const accessToken = await getSettingOrEnv("square", "access_token", "SQUARE_ACCESS_TOKEN");
    const locationId = await getSettingOrEnv("square", "location_id", "SQUARE_LOCATION_ID");
    const env = await getSettingOrEnv("square", "env", "SQUARE_ENV") || "production";
    const webhookSignatureKey = await getSettingOrEnv("square", "webhook_signature_key", "SQUARE_WEBHOOK_SIGNATURE_KEY");

    const baseUrl =
      env === "sandbox"
        ? "https://connect.squareupsandbox.com"
        : "https://connect.squareup.com";

    return { accessToken, locationId, env, webhookSignatureKey, baseUrl };
  }

  async createCheckoutLink(params: CheckoutParams): Promise<CheckoutResult> {
    const config = await this.getConfig();

    if (!config.accessToken || !config.locationId) {
      throw new Error("Square configuration missing: access_token or location_id");
    }

    const idempotencyKey = crypto.randomUUID();
    const locationId = params.locationId || config.locationId;

    // メタデータを payment_note に埋め込む（既存フォーマット互換）
    const noteParts: string[] = [];
    if (params.metadata.patientId) noteParts.push(`PID:${params.metadata.patientId}`);
    if (params.metadata.productCode) {
      let productPart = `Product:${params.metadata.productCode}`;
      if (params.metadata.mode) productPart += ` (${params.metadata.mode})`;
      noteParts.push(productPart);
    }
    if (params.metadata.reorderId) noteParts.push(`Reorder:${params.metadata.reorderId}`);
    const paymentNote = noteParts.join(";");

    const res = await fetch(
      `${config.baseUrl}/v2/online-checkout/payment-links`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.accessToken}`,
          "Square-Version": "2024-04-17",
        },
        body: JSON.stringify({
          idempotency_key: idempotencyKey,
          quick_pay: {
            name: params.productTitle,
            price_money: {
              amount: params.price,
              currency: "JPY",
            },
            location_id: locationId,
          },
          checkout_options: {
            redirect_url: params.redirectUrl,
            ask_for_shipping_address: params.askForShippingAddress ?? true,
          },
          payment_note: paymentNote,
        }),
      }
    );

    if (!res.ok) {
      console.error("Square CreatePaymentLink failed:", res.status);
      throw new Error("Failed to create Square checkout link");
    }

    const json = await res.json();
    const checkoutUrl = json?.payment_link?.url;

    if (!checkoutUrl) {
      console.error("Square response missing url");
      throw new Error("Square did not return a payment link URL");
    }

    return {
      checkoutUrl,
      paymentLinkId: json?.payment_link?.id,
    };
  }

  async verifyWebhook(req: Request): Promise<WebhookEvent | null> {
    const config = await this.getConfig();
    const body = await req.text();

    // 署名検証
    if (config.webhookSignatureKey) {
      const signature = req.headers.get("x-square-hmacsha256-signature");
      const notificationUrl = process.env.SQUARE_WEBHOOK_NOTIFICATION_URL || "";

      if (signature) {
        const hmac = crypto.createHmac("sha256", config.webhookSignatureKey);
        hmac.update(notificationUrl + body);
        const expectedSig = hmac.digest("base64");

        if (signature !== expectedSig) {
          console.error("[square-webhook] Signature mismatch");
          return null;
        }
      }
    }

    const event = JSON.parse(body);
    const eventType = event?.type;

    if (eventType === "payment.created" || eventType === "payment.updated") {
      return {
        type: "payment.created",
        paymentId: event?.data?.object?.payment?.id,
        orderId: event?.data?.object?.payment?.order_id,
        amount: event?.data?.object?.payment?.amount_money?.amount,
        currency: event?.data?.object?.payment?.amount_money?.currency,
        rawEvent: event,
      };
    }

    if (eventType === "refund.created" || eventType === "refund.updated") {
      return {
        type: eventType.startsWith("refund.created") ? "refund.created" : "refund.updated",
        paymentId: event?.data?.object?.refund?.payment_id,
        amount: event?.data?.object?.refund?.amount_money?.amount,
        rawEvent: event,
      };
    }

    return null;
  }

  async processRefund(paymentId: string, amount?: number): Promise<RefundResult> {
    const config = await this.getConfig();

    if (!config.accessToken) {
      return { success: false, status: "Square access token not configured" };
    }

    const idempotencyKey = crypto.randomUUID();
    const body: any = {
      idempotency_key: idempotencyKey,
      payment_id: paymentId,
      reason: "Requested by admin",
    };
    if (amount) {
      body.amount_money = { amount, currency: "JPY" };
    }

    const res = await fetch(`${config.baseUrl}/v2/refunds`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.accessToken}`,
        "Square-Version": "2024-04-17",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      console.error("Square refund failed:", res.status);
      return { success: false, status: `HTTP ${res.status}` };
    }

    const json = await res.json();
    return {
      success: true,
      refundId: json?.refund?.id,
      status: json?.refund?.status,
    };
  }
}
