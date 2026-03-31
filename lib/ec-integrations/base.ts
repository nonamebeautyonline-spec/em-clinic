// lib/ec-integrations/base.ts — BASE連携アダプター
// BASE API v1: https://docs.thebase.in/docs/api/
// WebhookはHMAC署名なし（本番ではIPアドレス制限で検証）

import type { EcAdapter, EcCheckout, EcLineItem, EcOrder } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */

export const baseAdapter: EcAdapter = {
  /**
   * Webhook署名検証
   * BASEはHMAC署名を提供しないため、常にtrueを返す。
   * 本番環境ではVercel Edge Config等でIPアドレス制限を併用すること。
   */
  verifyWebhook(
    _body: string,
    _headers: Record<string, string>,
    _secret: string,
  ): boolean {
    return true;
  },

  /** BASEのチェックアウト/注文ペイロードからカゴ落ちデータをパース */
  parseCheckout(payload: any): EcCheckout {
    const items: EcLineItem[] = (payload.order_items || []).map(
      (item: any) => ({
        name: item.title || item.item_title || "",
        price: parseInt(item.price || "0", 10),
        quantity: item.amount || 1,
        imageUrl: item.img_url || item.image_url || undefined,
      }),
    );
    return {
      email: payload.mail_address || payload.email,
      phone: payload.tel,
      lineItems: items,
      totalAmount: parseInt(payload.total || "0", 10),
    };
  },

  /** BASEの注文ペイロードからEcOrderデータをパース */
  parseOrder(payload: any): EcOrder {
    const items: EcLineItem[] = (payload.order_items || []).map(
      (item: any) => ({
        name: item.title || item.item_title || "",
        price: parseInt(item.price || "0", 10),
        quantity: item.amount || 1,
        imageUrl: item.img_url || undefined,
      }),
    );

    // 追跡URLの生成（日本郵便の追跡番号がある場合）
    const trackingUrl = payload.tracking_number
      ? `https://trackings.post.japanpost.jp/services/srv/search/?requestNo1=${payload.tracking_number}`
      : undefined;

    return {
      externalId: String(payload.order_id || payload.unique_key || ""),
      email: payload.mail_address || payload.email,
      phone: payload.tel,
      lineItems: items,
      totalAmount: parseInt(payload.total || "0", 10),
      status: payload.status || "ordered",
      createdAt: payload.ordered || new Date().toISOString(),
      fulfilledAt: payload.dispatched || undefined,
      trackingUrl,
    };
  },
};
