// lib/behavior-filters.ts — 行動データフィルタリング共通ライブラリ
// セグメント配信・リッチメニュー出し分け・ステップ配信の条件評価で共通利用
import { supabaseAdmin } from "@/lib/supabase";
import { withTenant } from "@/lib/tenant";

// ── 来院回数 ──────────────────────────────────────────────
export async function getVisitCounts(
  patientIds: string[],
  dateRange?: string,
  tenantId?: string | null
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (patientIds.length === 0) return result;

  let query = withTenant(
    supabaseAdmin
      .from("reservations")
      .select("patient_id")
      .in("patient_id", patientIds)
      .neq("status", "canceled"),
    tenantId ?? null
  );

  if (dateRange && dateRange !== "all") {
    const since = getDateRangeStart(dateRange);
    if (since) query = query.gte("reserved_date", since);
  }

  const { data } = await query;
  for (const row of data || []) {
    result.set(row.patient_id, (result.get(row.patient_id) || 0) + 1);
  }
  // patient_idsのうちresultにないものは0として設定
  for (const pid of patientIds) {
    if (!result.has(pid)) result.set(pid, 0);
  }
  return result;
}

// ── 購入金額 ──────────────────────────────────────────────
export async function getPurchaseAmounts(
  patientIds: string[],
  dateRange?: string,
  tenantId?: string | null
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (patientIds.length === 0) return result;

  let query = withTenant(
    supabaseAdmin
      .from("orders")
      .select("patient_id, amount")
      .in("patient_id", patientIds)
      .eq("status", "paid"),
    tenantId ?? null
  );

  if (dateRange && dateRange !== "all") {
    const since = getDateRangeStart(dateRange);
    if (since) query = query.gte("paid_at", since);
  }

  const { data } = await query;
  for (const row of data || []) {
    result.set(row.patient_id, (result.get(row.patient_id) || 0) + (row.amount || 0));
  }
  for (const pid of patientIds) {
    if (!result.has(pid)) result.set(pid, 0);
  }
  return result;
}

// ── 最終来院日 ──────────────────────────────────────────────
export async function getLastVisitDates(
  patientIds: string[],
  tenantId?: string | null
): Promise<Map<string, string | null>> {
  const result = new Map<string, string | null>();
  if (patientIds.length === 0) return result;

  const { data } = await withTenant(
    supabaseAdmin
      .from("reservations")
      .select("patient_id, reserved_date")
      .in("patient_id", patientIds)
      .neq("status", "canceled")
      .order("reserved_date", { ascending: false }),
    tenantId ?? null
  );

  for (const row of data || []) {
    if (!result.has(row.patient_id)) {
      result.set(row.patient_id, row.reserved_date);
    }
  }
  for (const pid of patientIds) {
    if (!result.has(pid)) result.set(pid, null);
  }
  return result;
}

// ── 再処方回数 ──────────────────────────────────────────────
export async function getReorderCounts(
  patientIds: string[],
  tenantId?: string | null
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (patientIds.length === 0) return result;

  const { data } = await withTenant(
    supabaseAdmin
      .from("reorders")
      .select("patient_id")
      .in("patient_id", patientIds),
    tenantId ?? null
  );

  for (const row of data || []) {
    result.set(row.patient_id, (result.get(row.patient_id) || 0) + 1);
  }
  for (const pid of patientIds) {
    if (!result.has(pid)) result.set(pid, 0);
  }
  return result;
}

// ── 行動条件の判定 ──────────────────────────────────────────────
export function matchBehaviorCondition(
  value: number | string | null,
  operator: string,
  expected: string,
  expectedEnd?: string
): boolean {
  if (value === null) return false;

  // 日付比較（最終来院日用）
  if (operator === "within_days") {
    // N日以内
    const days = Number(expected);
    if (isNaN(days)) return false;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return new Date(String(value)) >= cutoff;
  }
  if (operator === "before_days") {
    // N日以上前
    const days = Number(expected);
    if (isNaN(days)) return false;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return new Date(String(value)) < cutoff;
  }

  // 数値比較
  const numValue = Number(value);
  const numExpected = Number(expected);
  if (isNaN(numValue) || isNaN(numExpected)) return false;

  switch (operator) {
    case "=": return numValue === numExpected;
    case "!=": return numValue !== numExpected;
    case ">": return numValue > numExpected;
    case ">=": return numValue >= numExpected;
    case "<": return numValue < numExpected;
    case "<=": return numValue <= numExpected;
    case "between": {
      const numEnd = Number(expectedEnd);
      if (isNaN(numEnd)) return false;
      return numValue >= numExpected && numValue <= numEnd;
    }
    default: return false;
  }
}

// ── ヘルパー ──────────────────────────────────────────────
function getDateRangeStart(range: string): string | null {
  const now = new Date();
  switch (range) {
    case "30d": now.setDate(now.getDate() - 30); break;
    case "90d": now.setDate(now.getDate() - 90); break;
    case "180d": now.setDate(now.getDate() - 180); break;
    case "1y": now.setFullYear(now.getFullYear() - 1); break;
    default: return null;
  }
  return now.toISOString().slice(0, 10);
}
