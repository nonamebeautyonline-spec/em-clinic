// lib/payment/types.ts — 決済プロバイダーインターフェース

export interface CheckoutParams {
  productTitle: string;
  price: number; // JPY
  redirectUrl: string;
  metadata: Record<string, string>; // PID, product_code, mode, reorderId
  askForShippingAddress?: boolean;
  locationId?: string;
}

export interface CheckoutResult {
  checkoutUrl: string;
  paymentLinkId?: string;
}

export interface WebhookEvent {
  type: "payment.created" | "refund.created" | "refund.updated";
  paymentId?: string;
  orderId?: string;
  amount?: number;
  currency?: string;
  metadata?: Record<string, string>;
  shippingAddress?: {
    name?: string;
    postalCode?: string;
    address?: string;
    phone?: string;
    email?: string;
  };
  rawEvent: any;
}

export interface RefundResult {
  success: boolean;
  refundId?: string;
  status?: string;
}

export interface PaymentProvider {
  name: string;
  createCheckoutLink(params: CheckoutParams): Promise<CheckoutResult>;
  verifyWebhook(req: Request): Promise<WebhookEvent | null>;
  processRefund?(paymentId: string, amount?: number): Promise<RefundResult>;
}
