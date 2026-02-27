// lib/usage-quota.ts — テナント使用量クォータチェック
//
// message_log から当月のメッセージ数をカウントし、
// tenant_plans.message_quota と比較して使用率を判定する。
// 80%/90%/100% のしきい値でアラートレベルを返す。

import { supabaseAdmin } from "@/lib/supabase";

/** クォータチェック結果 */
export interface QuotaCheckResult {
  withinQuota: boolean;
  usage: number;
  quota: number;
  percentUsed: number;
}

/** アラートレベル */
export type AlertLevel = "normal" | "caution" | "warning" | "limit";

/** アラートしきい値定義 */
export const ALERT_THRESHOLDS = [
  { percent: 80, level: "caution" as const, label: "注意" },
  { percent: 90, level: "warning" as const, label: "警告" },
  { percent: 100, level: "limit" as const, label: "制限" },
] as const;

/**
 * テナントの当月クォータをチェック
 */
export async function checkQuota(
  tenantId: string,
): Promise<QuotaCheckResult> {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const monthStart = new Date(year, month, 1).toISOString();
  const monthEnd = new Date(year, month + 1, 1).toISOString();

  // message_log から当月の送信成功メッセージ数をカウント
  const { count } = await supabaseAdmin
    .from("message_log")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("direction", "outgoing")
    .eq("status", "sent")
    .gte("sent_at", monthStart)
    .lt("sent_at", monthEnd);

  const usage = count ?? 0;

  // tenant_plans からクォータを取得
  const { data: plan } = await supabaseAdmin
    .from("tenant_plans")
    .select("message_quota")
    .eq("tenant_id", tenantId)
    .eq("status", "active")
    .maybeSingle();

  const quota = plan?.message_quota ?? 5000;
  const percentUsed = quota > 0 ? Math.round((usage / quota) * 100) : 0;

  return {
    withinQuota: usage <= quota,
    usage,
    quota,
    percentUsed,
  };
}

/**
 * 使用率からアラートレベルを判定
 */
export function getAlertLevel(percentUsed: number): AlertLevel {
  if (percentUsed >= 100) return "limit";
  if (percentUsed >= 90) return "warning";
  if (percentUsed >= 80) return "caution";
  return "normal";
}

/**
 * アラートレベルの日本語ラベルを取得
 */
export function getAlertLabel(level: AlertLevel): string {
  const labels: Record<AlertLevel, string> = {
    normal: "正常",
    caution: "注意",
    warning: "警告",
    limit: "制限",
  };
  return labels[level];
}
