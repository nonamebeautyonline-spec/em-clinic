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
  /** 決済完了通知ON/OFF */
  notifyReorderPaid: boolean;
  /** 発送完了通知ON/OFF */
  notifyReorderShipped: boolean;
  /** 問診後リマインダー時間（0=無効） */
  intakeReminderHours: number;
  /** 決済完了メッセージ文言 */
  paymentThankMessage: string;
  /** 同量再処方の自動承認 */
  autoApproveSameDose: boolean;
}

// 既存動作を維持するデフォルト値（通知ON、制限OFF）
const DEFAULTS: BusinessRules = {
  dosageChangeNotify: false,
  minReorderIntervalDays: 0,
  notifyReorderApply: true,
  notifyReorderApprove: true,
  notifyReorderPaid: true,
  notifyReorderShipped: true,
  intakeReminderHours: 0,
  paymentThankMessage: "",
  autoApproveSameDose: false,
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
    notifyReorderShipped: parseBool(get("notify_reorder_shipped"), DEFAULTS.notifyReorderShipped),
    intakeReminderHours: parseNum(get("intake_reminder_hours"), DEFAULTS.intakeReminderHours),
    paymentThankMessage: get("payment_thank_message") ?? DEFAULTS.paymentThankMessage,
    autoApproveSameDose: parseBool(get("auto_approve_same_dose"), DEFAULTS.autoApproveSameDose),
  };
}

/** ビジネスルールのデフォルト値（UI表示用） */
export const BUSINESS_RULES_DEFAULTS = DEFAULTS;
