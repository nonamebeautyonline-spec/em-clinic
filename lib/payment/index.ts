// lib/payment/index.ts — 決済プロバイダーファクトリ
import type { PaymentProvider } from "./types";
import { SquarePaymentProvider } from "./square";
import { GmoPaymentProvider } from "./gmo";
import { getSetting } from "@/lib/settings";

export type { PaymentProvider, CheckoutParams, CheckoutResult, WebhookEvent, RefundResult } from "./types";

const providers: Record<string, () => PaymentProvider> = {
  square: () => new SquarePaymentProvider(),
  gmo: () => new GmoPaymentProvider(),
};

/** 設定に基づき決済プロバイダーを取得（デフォルト: Square） */
export async function getPaymentProvider(tenantId?: string): Promise<PaymentProvider> {
  const providerName = await getSetting("payment", "provider", tenantId);
  const name = providerName || "square";

  const factory = providers[name];
  if (!factory) {
    console.warn(`[payment] Unknown provider "${name}", falling back to square`);
    return new SquarePaymentProvider();
  }

  return factory();
}

/** 利用可能なプロバイダー一覧 */
export function getAvailableProviders(): { name: string; label: string; implemented: boolean }[] {
  return [
    { name: "square", label: "Square", implemented: true },
    { name: "gmo", label: "GMO ペイメントゲートウェイ", implemented: false },
  ];
}
