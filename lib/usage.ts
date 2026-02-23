// lib/usage.ts — テナント別メッセージ使用量の集計
//
// message_log テーブルから当月の送信数をリアルタイム集計し、
// tenant_plans の message_quota と比較して超過分を算出する。

import { supabaseAdmin } from "@/lib/supabase";

/** 使用量サマリー */
export interface UsageSummary {
  tenantId: string;
  month: string; // "2026-02" 形式
  messageCount: number; // 当月送信成功数
  quota: number; // プランの込み通数
  remaining: number; // 残り通数
  overageCount: number; // 超過数
  overageUnitPrice: number; // 超過単価
  overageAmount: number; // 超過金額（円）
}

/**
 * テナントの当月メッセージ使用量を取得
 */
export async function getCurrentMonthUsage(
  tenantId: string
): Promise<UsageSummary> {
  const now = new Date();
  return getMonthUsage(tenantId, now);
}

/**
 * テナントの指定月メッセージ使用量を取得
 */
export async function getMonthUsage(
  tenantId: string,
  date: Date
): Promise<UsageSummary> {
  const year = date.getFullYear();
  const month = date.getMonth();
  const monthStart = new Date(year, month, 1).toISOString();
  const monthEnd = new Date(year, month + 1, 1).toISOString();
  const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;

  // message_log から当月の送信成功数を集計
  const { count } = await supabaseAdmin
    .from("message_log")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("direction", "outgoing")
    .eq("status", "sent")
    .gte("sent_at", monthStart)
    .lt("sent_at", monthEnd);

  const messageCount = count ?? 0;

  // tenant_plans からクォータ・超過単価を取得
  const { data: plan } = await supabaseAdmin
    .from("tenant_plans")
    .select("message_quota, overage_unit_price")
    .eq("tenant_id", tenantId)
    .eq("status", "active")
    .maybeSingle();

  const quota = plan?.message_quota ?? 5000;
  const overageUnitPrice = plan?.overage_unit_price ?? 1.0;
  const overageCount = Math.max(0, messageCount - quota);
  const overageAmount = Math.ceil(overageCount * overageUnitPrice);

  return {
    tenantId,
    month: monthStr,
    messageCount,
    quota,
    remaining: Math.max(0, quota - messageCount),
    overageCount,
    overageUnitPrice,
    overageAmount,
  };
}

/**
 * monthly_usage テーブルに月次集計を保存（upsert）
 * 月末の cron ジョブから呼ばれる
 */
export async function saveMonthlyUsage(
  tenantId: string,
  date: Date
): Promise<void> {
  const usage = await getMonthUsage(tenantId, date);
  const year = date.getFullYear();
  const month = date.getMonth();
  const monthDate = new Date(year, month, 1).toISOString().split("T")[0];

  // 配信回数を集計
  const { count: broadcastCount } = await supabaseAdmin
    .from("broadcasts")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("status", "sent")
    .gte("sent_at", new Date(year, month, 1).toISOString())
    .lt("sent_at", new Date(year, month + 1, 1).toISOString());

  await supabaseAdmin.from("monthly_usage").upsert(
    {
      tenant_id: tenantId,
      month: monthDate,
      message_count: usage.messageCount,
      broadcast_count: broadcastCount ?? 0,
      overage_count: usage.overageCount,
      overage_amount: usage.overageAmount,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "tenant_id,month" }
  );
}

/**
 * 全アクティブテナントの月次集計を実行
 * cron ジョブから呼ばれる
 */
export async function saveAllTenantsMonthlyUsage(
  date: Date
): Promise<{ processed: number; errors: string[] }> {
  const { data: tenants } = await supabaseAdmin
    .from("tenants")
    .select("id")
    .eq("is_active", true);

  if (!tenants) return { processed: 0, errors: [] };

  const errors: string[] = [];
  let processed = 0;

  for (const tenant of tenants) {
    try {
      await saveMonthlyUsage(tenant.id, date);
      processed++;
    } catch (err) {
      errors.push(
        `${tenant.id}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  return { processed, errors };
}
