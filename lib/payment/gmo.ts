// lib/payment/gmo.ts — GMO ペイメントゲートウェイ プレースホルダー
import type {
  PaymentProvider,
  CheckoutParams,
  CheckoutResult,
  WebhookEvent,
  RefundResult,
} from "./types";

export class GmoPaymentProvider implements PaymentProvider {
  name = "gmo";

  async createCheckoutLink(_params: CheckoutParams): Promise<CheckoutResult> {
    throw new Error("GMO payment provider is not yet implemented");
  }

  async verifyWebhook(_req: Request): Promise<WebhookEvent | null> {
    throw new Error("GMO payment provider is not yet implemented");
  }

  async processRefund(_paymentId: string, _amount?: number): Promise<RefundResult> {
    throw new Error("GMO payment provider is not yet implemented");
  }
}
