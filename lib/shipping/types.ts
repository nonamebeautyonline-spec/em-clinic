// lib/shipping/types.ts — 配送キャリア抽象化
export type CarrierType = "yamato" | "japanpost";

export interface ShippingConfig {
  defaultCarrier: CarrierType;
  yamato: YamatoConfig;
  japanpost: JapanPostConfig;
}

export interface YamatoConfig {
  senderName: string;
  senderPostal: string;
  senderAddress: string;
  senderPhone: string;
  senderPhoneBranch: string;
  senderEmail: string;
  billingCustomerCode: string;
  billingCategoryCode: string;
  fareManagementNo: string;
  itemName: string;
  coolType: string; // "0"=常温, "1"=冷蔵, "2"=冷凍
  forecastMessage: string;
  completedMessage: string;
}

export interface JapanPostConfig {
  senderName: string;
  senderPostal: string;
  senderAddress: string;
  senderPhone: string;
  itemName: string;
  packageType: string; // "ゆうパック" | "ゆうパケット" | "レターパック"
}

export interface OrderData {
  payment_id: string;
  name: string;
  postal: string;
  address: string;
  email: string;
  phone: string;
}

/** デフォルト設定 */
export const DEFAULT_SHIPPING_CONFIG: ShippingConfig = {
  defaultCarrier: "yamato",
  yamato: {
    senderName: "のなめビューティー",
    senderPostal: "1040061",
    senderAddress: "東京都中央区銀座７ー８ー８ー５Ｆ",
    senderPhone: "09086728115",
    senderPhoneBranch: "01",
    senderEmail: "noname.beauty.online@gmail.com",
    billingCustomerCode: "090867281159",
    billingCategoryCode: "",
    fareManagementNo: "01",
    itemName: "サプリメント（引火性・高圧ガスなし）",
    coolType: "2",
    forecastMessage: "のなめビューティーです。お荷物のお届け予定をお知らせします。",
    completedMessage: "のなめビューティーです。お荷物の配達完了をお知らせします。",
  },
  japanpost: {
    senderName: "のなめビューティー",
    senderPostal: "1040061",
    senderAddress: "東京都中央区銀座７ー８ー８ー５Ｆ",
    senderPhone: "09086728115",
    itemName: "サプリメント",
    packageType: "ゆうパック",
  },
};

/** 追跡URL生成 */
export function getTrackingUrl(carrier: CarrierType, trackingNumber: string): string {
  if (carrier === "japanpost") {
    return `https://trackings.post.japanpost.jp/services/srv/search/?requestNo1=${trackingNumber}`;
  }
  // yamato
  return `https://toi.kuronekoyamato.co.jp/cgi-bin/tneko?number=${trackingNumber}`;
}
