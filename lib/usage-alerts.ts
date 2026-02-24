// lib/usage-alerts.ts — 使用量アラート
//
// テナントのメッセージ使用率を監視し、閾値到達時にメール通知を送信する。
// Redis で送信済みフラグを管理し、月内の重複送信を防止する。

import { getCurrentMonthUsage } from "@/lib/usage";
import { sendUsageWarningEmail } from "@/lib/email";
import { createAlert } from "@/lib/security-alerts";
import { redis } from "@/lib/redis";
import { supabaseAdmin } from "@/lib/supabase";

/** 使用量アラート閾値 */
export const USAGE_THRESHOLDS = [
  { percent: 75, severity: "warning" as const },
  { percent: 100, severity: "critical" as const },
];

/**
 * テナントの使用量チェック＆アラート送信
 * 各閾値（75%, 100%）について、未送信かつ到達済みならメール＋アラートを発行
 */
export async function checkAndSendUsageAlerts(
  tenantId: string,
): Promise<void> {
  const usage = await getCurrentMonthUsage(tenantId);
  const usagePercent =
    usage.quota > 0
      ? Math.round((usage.messageCount / usage.quota) * 100)
      : 0;

  // テナントの管理者メールを取得
  const { data: members } = await supabaseAdmin
    .from("tenant_members")
    .select("admin_users(email)")
    .eq("tenant_id", tenantId)
    .eq("role", "owner");

  // テナント名を取得
  const { data: tenant } = await supabaseAdmin
    .from("tenants")
    .select("name")
    .eq("id", tenantId)
    .single();

  const tenantName = tenant?.name || "不明なテナント";

  // オーナーのメールアドレスリストを取得
  const ownerEmails: string[] = [];
  if (members) {
    for (const m of members) {
      const adminUser = m.admin_users as unknown as { email: string } | null;
      if (adminUser?.email) {
        ownerEmails.push(adminUser.email);
      }
    }
  }

  for (const threshold of USAGE_THRESHOLDS) {
    if (usagePercent < threshold.percent) continue;

    // Redis で送信済みフラグチェック
    const redisKey = `usage_alert_sent:${tenantId}:${usage.month}:${threshold.percent}`;

    try {
      const alreadySent = await redis.get(redisKey);
      if (alreadySent) continue;
    } catch {
      // Redis障害時はサービス継続優先（重複送信の可能性はあるが停止より優先）
      console.warn("[usage-alerts] Redis読み取りエラー、続行します");
    }

    // メール送信
    for (const email of ownerEmails) {
      try {
        await sendUsageWarningEmail(
          email,
          tenantName,
          usagePercent,
          usage.messageCount,
          usage.quota,
        );
      } catch (err) {
        console.error(
          `[usage-alerts] メール送信エラー (${email}):`,
          err,
        );
      }
    }

    // セキュリティアラートレコード作成
    try {
      await createAlert({
        tenantId,
        alertType: "usage_threshold",
        severity: threshold.severity === "critical" ? "high" : "medium",
        title: `メッセージ使用量が${threshold.percent}%に到達`,
        description: `${tenantName}: ${usage.messageCount}/${usage.quota}通 (${usagePercent}%)`,
        metadata: {
          threshold: threshold.percent,
          usagePercent,
          messageCount: usage.messageCount,
          quota: usage.quota,
        },
      });
    } catch (err) {
      console.error("[usage-alerts] アラートレコード作成エラー:", err);
    }

    // Redis に送信済みフラグをセット（TTL: 35日 = 月をまたいでも安全にクリアされる）
    try {
      await redis.set(redisKey, "1", { ex: 35 * 24 * 60 * 60 });
    } catch {
      console.warn("[usage-alerts] Redis書き込みエラー、続行します");
    }
  }
}
