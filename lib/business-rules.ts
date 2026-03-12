// lib/business-rules.ts — テナント別ビジネスルールの取得ヘルパー
import { getSettingsBulk } from "@/lib/settings";

export interface BusinessRules {
  /** 用量変更時の管理者通知 */
  dosageChangeNotify: boolean;
  /** 再処方間隔の最低日数（0=制限なし） */
  minReorderIntervalDays: number;
  /** 再処方申請通知ON/OFF */
  notifyReorderApply: boolean;
  /** 再処方承認通知ON/OFF */
  notifyReorderApprove: boolean;
  /** 決済完了通知ON/OFF（患者へサンクスメッセージ） */
  notifyReorderPaid: boolean;
  /** 問診後リマインダー時間（0=無効） */
  intakeReminderHours: number;
  /** 承認通知メッセージ文言（患者向け） */
  approveMessage: string;
  /** 決済完了メッセージ文言（クレカ） */
  paymentThankMessageCard: string;
  /** 決済完了メッセージ文言（銀行振込） */
  paymentThankMessageBank: string;
  /** 決済完了Flex: ヘッダー（クレカ） */
  paymentThankHeaderCard: string;
  /** 決済完了Flex: ヘッダー（銀行振込） */
  paymentThankHeaderBank: string;
  /** 決済完了Flex: 商品名表示 */
  showProductName: boolean;
  /** 決済完了Flex: 金額表示 */
  showAmount: boolean;
  /** 決済完了Flex: 決済方法表示 */
  showPaymentMethod: boolean;
  /** 決済完了Flex: 配送先情報表示 */
  showShippingInfo: boolean;
  /** 決済完了Flex: 配送名義表示 */
  showShippingName: boolean;
  /** 決済完了Flex: 郵便番号表示 */
  showShippingPostal: boolean;
  /** 決済完了Flex: 住所表示 */
  showShippingAddress: boolean;
  /** 決済完了Flex: 電話番号表示 */
  showShippingPhone: boolean;
  /** 決済完了Flex: メールアドレス表示 */
  showShippingEmail: boolean;
  /** 同量再処方の自動承認 */
  autoApproveSameDose: boolean;
  /** 不通時のLINE自動通知ON/OFF */
  notifyNoAnswer: boolean;
  /** 不通時の通知メッセージ文言 */
  noAnswerMessage: string;
}

// 既存動作を維持するデフォルト値（通知ON、制限OFF）
const DEFAULTS: BusinessRules = {
  dosageChangeNotify: false,
  minReorderIntervalDays: 0,
  notifyReorderApply: true,
  notifyReorderApprove: true,
  notifyReorderPaid: true,
  intakeReminderHours: 0,
  approveMessage: "",
  paymentThankMessageCard: "",
  paymentThankMessageBank: "",
  paymentThankHeaderCard: "決済完了",
  paymentThankHeaderBank: "情報入力完了",
  showProductName: true,
  showAmount: true,
  showPaymentMethod: true,
  showShippingInfo: true,
  showShippingName: true,
  showShippingPostal: true,
  showShippingAddress: true,
  showShippingPhone: true,
  showShippingEmail: true,
  autoApproveSameDose: false,
  notifyNoAnswer: false,
  noAnswerMessage: "",
};

function parseBool(val: string | undefined, fallback: boolean): boolean {
  if (val === undefined) return fallback;
  return val === "true";
}

function parseNum(val: string | undefined, fallback: number): number {
  if (val === undefined) return fallback;
  const n = parseInt(val, 10);
  return isNaN(n) ? fallback : n;
}

/** テナントのビジネスルールを一括取得 */
export async function getBusinessRules(tenantId?: string): Promise<BusinessRules> {
  const bulk = await getSettingsBulk(["business_rules"], tenantId);
  const get = (key: string) => bulk.get(`business_rules:${key}`);

  return {
    dosageChangeNotify: parseBool(get("dosage_change_notify"), DEFAULTS.dosageChangeNotify),
    minReorderIntervalDays: parseNum(get("min_reorder_interval_days"), DEFAULTS.minReorderIntervalDays),
    notifyReorderApply: parseBool(get("notify_reorder_apply"), DEFAULTS.notifyReorderApply),
    notifyReorderApprove: parseBool(get("notify_reorder_approve"), DEFAULTS.notifyReorderApprove),
    notifyReorderPaid: parseBool(get("notify_reorder_paid"), DEFAULTS.notifyReorderPaid),
    intakeReminderHours: parseNum(get("intake_reminder_hours"), DEFAULTS.intakeReminderHours),
    approveMessage: get("approve_message") ?? DEFAULTS.approveMessage,
    paymentThankMessageCard: get("payment_thank_message_card") ?? get("payment_thank_message") ?? DEFAULTS.paymentThankMessageCard,
    paymentThankMessageBank: get("payment_thank_message_bank") ?? DEFAULTS.paymentThankMessageBank,
    paymentThankHeaderCard: get("payment_thank_header_card") ?? DEFAULTS.paymentThankHeaderCard,
    paymentThankHeaderBank: get("payment_thank_header_bank") ?? DEFAULTS.paymentThankHeaderBank,
    showProductName: parseBool(get("show_product_name"), DEFAULTS.showProductName),
    showAmount: parseBool(get("show_amount"), DEFAULTS.showAmount),
    showPaymentMethod: parseBool(get("show_payment_method"), DEFAULTS.showPaymentMethod),
    showShippingInfo: parseBool(get("show_shipping_info"), DEFAULTS.showShippingInfo),
    showShippingName: parseBool(get("show_shipping_name"), DEFAULTS.showShippingName),
    showShippingPostal: parseBool(get("show_shipping_postal"), DEFAULTS.showShippingPostal),
    showShippingAddress: parseBool(get("show_shipping_address"), DEFAULTS.showShippingAddress),
    showShippingPhone: parseBool(get("show_shipping_phone"), DEFAULTS.showShippingPhone),
    showShippingEmail: parseBool(get("show_shipping_email"), DEFAULTS.showShippingEmail),
    autoApproveSameDose: parseBool(get("auto_approve_same_dose"), DEFAULTS.autoApproveSameDose),
    notifyNoAnswer: parseBool(get("notify_no_answer"), DEFAULTS.notifyNoAnswer),
    noAnswerMessage: get("no_answer_message") ?? DEFAULTS.noAnswerMessage,
  };
}

/** ビジネスルールのデフォルト値（UI表示用） */
export const BUSINESS_RULES_DEFAULTS = DEFAULTS;

/** 承認通知のデフォルト文言 */
export const DEFAULT_APPROVE_MESSAGE = "再処方申請が承認されました\nマイページより決済のお手続きをお願いいたします。\n何かご不明な点がございましたら、お気軽にお知らせください";

/** 不通通知のデフォルト文言 */
export const DEFAULT_NO_ANSWER_MESSAGE = `本日、診察予約のお時間に医師よりご連絡させていただきましたが、つながらず診察が完了しておりません💦

診察をご希望の場合は、再度メッセージにてご連絡いただけますと幸いです💌
その際、診察時間はあらためて調整させていただきますので、ご了承くださいませ☺️

ご不明点などありましたら、いつでもお気軽にご連絡ください🫧`;

/** 配送情報 */
export interface ShippingInfo {
  shippingName?: string;
  postalCode?: string;
  address?: string;
  phone?: string;
  email?: string;
}

