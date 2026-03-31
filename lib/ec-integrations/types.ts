// lib/ec-integrations/types.ts — EC連携の共通型定義

/** EC注文データ */
export interface EcOrder {
  externalId: string;
  email?: string;
  phone?: string;
  lineItems: EcLineItem[];
  totalAmount: number;
  status: string;
  createdAt: string;
  fulfilledAt?: string;
  trackingUrl?: string;
}

/** EC商品明細 */
export interface EcLineItem {
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
}

/** EC顧客データ */
export interface EcCustomer {
  externalId: string;
  email?: string;
  phone?: string;
  name?: string;
}

/** ECチェックアウト（カゴ落ち候補） */
export interface EcCheckout {
  email?: string;
  phone?: string;
  lineItems: EcLineItem[];
  totalAmount: number;
}

/** ECプラットフォームアダプターインターフェース */
export interface EcAdapter {
  /** Webhook署名検証 */
  verifyWebhook(
    body: string,
    headers: Record<string, string>,
    secret: string,
  ): boolean;
  /** チェックアウトペイロードをパース */
  parseCheckout(payload: unknown): EcCheckout;
  /** 注文ペイロードをパース */
  parseOrder(payload: unknown): EcOrder;
}
