// lib/shipping/types.ts — 配送キャリア抽象化
export type CarrierType = "yamato" | "japanpost";

export interface ShippingOptionsConfig {
  allowCustomSender: boolean;      // 差出人名変更
  allowCosmeticsName: boolean;     // 品名を化粧品に変更
  allowHexidin: boolean;           // ヘキシジン変更（注射商品のみ）
  allowPostOfficeHold: boolean;    // 郵便局留め
}

export interface ShippingConfig {
  defaultCarrier: CarrierType;
  standardCutoffHour: number;        // 通常便の当日発送締め時間（デフォルト16）
  addressChangeCutoffHour: number;   // 住所変更可能時間（デフォルト16）
  options: ShippingOptionsConfig;    // 購入画面の発送オプション表示制御
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
  okinawaItemName: string; // 沖縄向け品名（航空輸送制限対応）
  coolType: string; // "0"=常温, "1"=冷凍, "2"=冷蔵
  forecastMessage: string;
  completedMessage: string;
}

export interface JapanPostConfig {
  senderName: string;
  senderPostal: string;
  senderAddress: string;
  senderPhone: string;
  itemName: string;
  kyushuItemName: string; // 九州向け品名（航空輸送制限対応）
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
  standardCutoffHour: 16,
  addressChangeCutoffHour: 16,
  options: {
    allowCustomSender: false,
    allowCosmeticsName: false,
    allowHexidin: false,
    allowPostOfficeHold: false,
  },
  yamato: {
    senderName: "",
    senderPostal: "",
    senderAddress: "",
    senderPhone: "",
    senderPhoneBranch: "01",
    senderEmail: "",
    billingCustomerCode: "",
    billingCategoryCode: "",
    fareManagementNo: "01",
    itemName: "サプリメント（引火性・高圧ガスなし）",
    okinawaItemName: "医薬品・注射器（未使用、引火性・高圧ガスなし）",
    coolType: "2",
    forecastMessage: "",
    completedMessage: "",
  },
  japanpost: {
    senderName: "",
    senderPostal: "",
    senderAddress: "",
    senderPhone: "",
    itemName: "サプリメント",
    kyushuItemName: "医薬品・注射器（未使用、引火性・高圧ガスなし）",
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
