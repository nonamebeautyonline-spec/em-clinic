// lib/security-alerts.ts
// セキュリティアラート管理ヘルパー

import { supabaseAdmin } from "@/lib/supabase";

/**
 * セキュリティアラートを作成
 */
export async function createAlert(params: {
  tenantId?: string | null;
  alertType: string;
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await supabaseAdmin.from("security_alerts").insert({
    tenant_id: params.tenantId || null,
    alert_type: params.alertType,
    severity: params.severity,
    title: params.title,
    description: params.description || null,
    metadata: params.metadata || null,
  });
}

/**
 * 未確認アラートの件数を取得
 */
export async function getUnacknowledgedCount(): Promise<number> {
  const { count } = await supabaseAdmin
    .from("security_alerts")
    .select("id", { count: "exact", head: true })
    .is("acknowledged_at", null);
  return count || 0;
}
