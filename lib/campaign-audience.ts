// lib/campaign-audience.ts — キャンペーン/クーポン対象患者の条件評価
//
// ConditionBuilder で設定した ConditionRule[] に対して
// 単一患者がマッチするかを評価する（checkout時の利用可否判定用）

import { supabaseAdmin } from "@/lib/supabase";
import { withTenant } from "@/lib/tenant";
import {
  getLastPaymentDates,
  getProductPurchasePatients,
  getReorderCounts,
  matchLastPaymentDate,
  matchBehaviorCondition,
} from "@/lib/behavior-filters";
import type { ConditionRule } from "@/app/admin/line/_components/ConditionBuilder";

/**
 * 単一患者が条件ルール群にマッチするか評価（AND条件）
 * すべてのルールを満たす場合のみ true
 */
export async function evaluateAudienceCondition(
  patientId: string,
  rules: ConditionRule[],
  tenantId: string,
): Promise<boolean> {
  if (!rules || rules.length === 0) return true;

  for (const rule of rules) {
    const matched = await evaluateRule(patientId, rule, tenantId);
    if (!matched) return false;
  }
  return true;
}

async function evaluateRule(
  patientId: string,
  rule: ConditionRule,
  tenantId: string,
): Promise<boolean> {
  switch (rule.type) {
    case "tag":
      return evaluateTagRule(patientId, rule, tenantId);
    case "mark":
      return evaluateMarkRule(patientId, rule, tenantId);
    case "name":
      return evaluateNameRule(patientId, rule, tenantId);
    case "registered_date":
      return evaluateRegisteredDateRule(patientId, rule, tenantId);
    case "field":
      return evaluateFieldRule(patientId, rule, tenantId);
    case "last_payment_date":
      return evaluateLastPaymentDateRule(patientId, rule, tenantId);
    case "product_purchase":
      return evaluateProductPurchaseRule(patientId, rule, tenantId);
    case "reorder_count":
      return evaluateReorderCountRule(patientId, rule, tenantId);
    case "intake_status":
      return evaluateIntakeStatusRule(patientId, rule, tenantId);
    case "reservation_status":
      return evaluateReservationStatusRule(patientId, rule, tenantId);
    default:
      return true;
  }
}

// ── タグ条件 ──
async function evaluateTagRule(
  patientId: string,
  rule: ConditionRule,
  tenantId: string,
): Promise<boolean> {
  if (!rule.tag_ids?.length) return true;

  const { data } = await withTenant(
    supabaseAdmin
      .from("patient_tags")
      .select("tag_id")
      .eq("patient_id", patientId),
    tenantId,
  );
  const patientTagIds = (data || []).map((r: { tag_id: number }) => r.tag_id);

  switch (rule.tag_match) {
    case "any_include":
      return rule.tag_ids.some((id) => patientTagIds.includes(id));
    case "all_include":
      return rule.tag_ids.every((id) => patientTagIds.includes(id));
    case "any_exclude":
      return !rule.tag_ids.some((id) => patientTagIds.includes(id));
    case "all_exclude":
      return !rule.tag_ids.every((id) => patientTagIds.includes(id));
    default:
      return rule.tag_ids.some((id) => patientTagIds.includes(id));
  }
}

// ── 対応マーク条件 ──
async function evaluateMarkRule(
  patientId: string,
  rule: ConditionRule,
  tenantId: string,
): Promise<boolean> {
  if (!rule.mark_values?.length) return true;

  const { data } = await withTenant(
    supabaseAdmin
      .from("patients")
      .select("mark")
      .eq("patient_id", patientId)
      .maybeSingle(),
    tenantId,
  );
  const mark = data?.mark || "";

  switch (rule.mark_match) {
    case "any_match":
      return rule.mark_values.some((v) => v === mark);
    case "all_match":
      return rule.mark_values.every((v) => v === mark);
    case "any_exclude":
      return !rule.mark_values.some((v) => v === mark);
    case "all_exclude":
      return !rule.mark_values.every((v) => v === mark);
    default:
      return rule.mark_values.some((v) => v === mark);
  }
}

// ── 名前条件 ──
async function evaluateNameRule(
  patientId: string,
  rule: ConditionRule,
  tenantId: string,
): Promise<boolean> {
  if (!rule.name_value) return true;

  const { data } = await withTenant(
    supabaseAdmin
      .from("patients")
      .select("name")
      .eq("patient_id", patientId)
      .maybeSingle(),
    tenantId,
  );
  const name = data?.name || "";

  switch (rule.name_operator) {
    case "contains":
      return name.includes(rule.name_value);
    case "not_contains":
      return !name.includes(rule.name_value);
    case "equals":
      return name === rule.name_value;
    default:
      return name.includes(rule.name_value);
  }
}

// ── 友だち登録日条件 ──
async function evaluateRegisteredDateRule(
  patientId: string,
  rule: ConditionRule,
  tenantId: string,
): Promise<boolean> {
  const { data } = await withTenant(
    supabaseAdmin
      .from("patients")
      .select("created_at")
      .eq("patient_id", patientId)
      .maybeSingle(),
    tenantId,
  );
  if (!data?.created_at) return false;
  const regDate = data.created_at.slice(0, 10);

  switch (rule.date_operator) {
    case "before":
      return rule.date_value ? regDate < rule.date_value : false;
    case "after":
      return rule.date_value ? regDate > rule.date_value : false;
    case "between":
      return (
        (!rule.date_value || regDate >= rule.date_value) &&
        (!rule.date_value_end || regDate <= rule.date_value_end)
      );
    default:
      return false;
  }
}

// ── 友だち情報フィールド条件 ──
async function evaluateFieldRule(
  patientId: string,
  rule: ConditionRule,
  tenantId: string,
): Promise<boolean> {
  if (!rule.field_id) return true;

  const { data } = await withTenant(
    supabaseAdmin
      .from("friend_field_values")
      .select("value")
      .eq("patient_id", patientId)
      .eq("field_id", rule.field_id)
      .maybeSingle(),
    tenantId,
  );
  const value = data?.value ?? "";
  const expected = rule.field_value ?? "";

  switch (rule.field_operator) {
    case "=":
      return value === expected;
    case "!=":
      return value !== expected;
    case "contains":
      return value.includes(expected);
    case ">":
      return Number(value) > Number(expected);
    case ">=":
      return Number(value) >= Number(expected);
    case "<":
      return Number(value) < Number(expected);
    case "<=":
      return Number(value) <= Number(expected);
    default:
      return value === expected;
  }
}

// ── 最終決済日条件 ──
async function evaluateLastPaymentDateRule(
  patientId: string,
  rule: ConditionRule,
  tenantId: string,
): Promise<boolean> {
  const map = await getLastPaymentDates([patientId], tenantId);
  const paidAt = map.get(patientId) ?? null;
  return matchLastPaymentDate(paidAt, rule.payment_date_from, rule.payment_date_to);
}

// ── 商品購入履歴条件 ──
async function evaluateProductPurchaseRule(
  patientId: string,
  rule: ConditionRule,
  tenantId: string,
): Promise<boolean> {
  if (!rule.product_codes?.length) return true;

  const purchasedSet = await getProductPurchasePatients(
    [patientId],
    rule.product_codes,
    tenantId,
    rule.product_date_from,
    rule.product_date_to,
  );

  const hasPurchased = purchasedSet.has(patientId);
  return rule.product_match === "not_purchased" ? !hasPurchased : hasPurchased;
}

// ── 再処方回数条件 ──
async function evaluateReorderCountRule(
  patientId: string,
  rule: ConditionRule,
  tenantId: string,
): Promise<boolean> {
  const map = await getReorderCounts([patientId], tenantId);
  const count = map.get(patientId) ?? 0;
  return matchBehaviorCondition(
    count,
    rule.behavior_operator || ">=",
    rule.behavior_value || "0",
    rule.behavior_value_end,
  );
}

// ── 診察ステータス条件 ──
async function evaluateIntakeStatusRule(
  patientId: string,
  rule: ConditionRule,
  tenantId: string,
): Promise<boolean> {
  if (!rule.status_value) return true;

  const { data } = await withTenant(
    supabaseAdmin
      .from("intake")
      .select("status")
      .eq("patient_id", patientId)
      .not("status", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    tenantId,
  );
  return data?.status === rule.status_value;
}

// ── 予約ステータス条件 ──
async function evaluateReservationStatusRule(
  patientId: string,
  rule: ConditionRule,
  tenantId: string,
): Promise<boolean> {
  if (!rule.status_value) return true;

  const { data } = await withTenant(
    supabaseAdmin
      .from("intake")
      .select("reserve_status")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    tenantId,
  );
  return data?.reserve_status === rule.status_value;
}
