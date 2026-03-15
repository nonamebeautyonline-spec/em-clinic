// lib/point-auto-grant.ts — ポイント自動付与ロジック
// - per_purchase: 購入金額の一定割合をポイント付与（trigger_config.rate: 0.01 = 1%）
// - first_purchase: 初回購入時に固定ポイント付与
// - amount_threshold: 購入金額が閾値以上の場合に固定ポイント付与（trigger_config.min_amount）

import { supabaseAdmin } from "@/lib/supabase";
import { withTenant, tenantPayload } from "@/lib/tenant";
import { grantPoints } from "@/lib/points";

/** 自動付与ルール型 */
export type PointAutoGrantRule = {
  id: string;
  tenant_id: string;
  name: string;
  trigger_type: "per_purchase" | "first_purchase" | "amount_threshold";
  points_amount: number;
  trigger_config: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

/** 自動付与ログ型 */
export type PointAutoGrantLog = {
  id: string;
  tenant_id: string;
  rule_id: string;
  patient_id: string;
  order_id: string | null;
  points_awarded: number;
  created_at: string;
};

/**
 * 購入時にポイント自動付与ルールを評価・実行する
 * @param tenantId テナントID
 * @param patientId 患者ID
 * @param orderId 注文ID（重複防止キー）
 * @param amount 購入金額（円）
 * @returns 付与されたポイントの合計
 */
export async function processAutoGrant(
  tenantId: string,
  patientId: string,
  orderId: string,
  amount: number,
): Promise<number> {
  if (!tenantId || !patientId || !orderId) {
    console.warn("[point-auto-grant] 必須パラメータ不足:", { tenantId, patientId, orderId });
    return 0;
  }

  // テナントの有効なルールを取得
  const { data: rules, error: rulesError } = await withTenant(
    supabaseAdmin
      .from("point_auto_grant_rules")
      .select("*")
      .eq("is_active", true),
    tenantId,
  );

  if (rulesError) {
    console.error("[point-auto-grant] ルール取得エラー:", rulesError);
    return 0;
  }

  if (!rules || rules.length === 0) return 0;

  let totalAwarded = 0;

  for (const rule of rules as PointAutoGrantRule[]) {
    try {
      const points = await evaluateAndGrant(tenantId, patientId, orderId, amount, rule);
      totalAwarded += points;
    } catch (err) {
      console.error(`[point-auto-grant] ルール ${rule.id} (${rule.name}) 処理エラー:`, err);
    }
  }

  return totalAwarded;
}

/**
 * 個別ルールを評価してポイントを付与する
 */
async function evaluateAndGrant(
  tenantId: string,
  patientId: string,
  orderId: string,
  amount: number,
  rule: PointAutoGrantRule,
): Promise<number> {
  // 重複チェック（rule_id + patient_id + order_id）
  const { data: existingLog } = await withTenant(
    supabaseAdmin
      .from("point_auto_grant_logs")
      .select("id")
      .eq("rule_id", rule.id)
      .eq("patient_id", patientId)
      .eq("order_id", orderId)
      .maybeSingle(),
    tenantId,
  );

  if (existingLog) {
    // 既に付与済み
    return 0;
  }

  let pointsToGrant = 0;

  switch (rule.trigger_type) {
    case "per_purchase": {
      // 購入金額の一定割合をポイント付与
      const rate = Number(rule.trigger_config.rate) || 0;
      if (rate <= 0) break;
      pointsToGrant = Math.floor(amount * rate);
      break;
    }

    case "first_purchase": {
      // 初回購入時のみ固定ポイント付与
      const { data: previousLogs } = await withTenant(
        supabaseAdmin
          .from("point_auto_grant_logs")
          .select("id")
          .eq("rule_id", rule.id)
          .eq("patient_id", patientId)
          .limit(1),
        tenantId,
      );

      if (previousLogs && previousLogs.length > 0) {
        // 既に初回付与済み
        return 0;
      }
      pointsToGrant = rule.points_amount;
      break;
    }

    case "amount_threshold": {
      // 購入金額が閾値以上の場合に固定ポイント付与
      const minAmount = Number(rule.trigger_config.min_amount) || 0;
      if (amount < minAmount) {
        return 0;
      }
      pointsToGrant = rule.points_amount;
      break;
    }

    default:
      console.warn(`[point-auto-grant] 未対応のトリガータイプ: ${rule.trigger_type}`);
      return 0;
  }

  if (pointsToGrant <= 0) return 0;

  // ポイント付与
  await grantPoints(
    tenantId,
    patientId,
    pointsToGrant,
    `自動付与: ${rule.name}`,
    "order",
    orderId,
  );

  // ログ記録（重複防止）
  const { error: logError } = await supabaseAdmin
    .from("point_auto_grant_logs")
    .insert({
      ...tenantPayload(tenantId),
      rule_id: rule.id,
      patient_id: patientId,
      order_id: orderId,
      points_awarded: pointsToGrant,
    });

  if (logError) {
    console.error("[point-auto-grant] ログ記録エラー:", logError);
    // ポイント自体は既に付与済みなのでエラーにはしない
  }

  console.log(`[point-auto-grant] ${rule.name}: ${patientId} に ${pointsToGrant}pt 付与 (order: ${orderId})`);
  return pointsToGrant;
}
