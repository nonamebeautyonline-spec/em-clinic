// lib/behavior-filters.ts — 行動データフィルタリング共通ライブラリ
// セグメント配信・リッチメニュー出し分け・ステップ配信の条件評価で共通利用
import { supabaseAdmin } from "@/lib/supabase";
import { withTenant } from "@/lib/tenant";

// ── 最終決済日 ──────────────────────────────────────────────
export async function getLastPaymentDates(
  patientIds: string[],
  tenantId?: string | null
): Promise<Map<string, string | null>> {
  const result = new Map<string, string | null>();
  if (patientIds.length === 0) return result;

  // .in()はURL長制限でサイレント失敗するためテナント全件取得→JSフィルタ
  const pidsSet = new Set(patientIds);
  const { data } = await withTenant(
    supabaseAdmin
      .from("orders")
      .select("patient_id, paid_at")
      .eq("status", "paid")
      .not("paid_at", "is", null)
      .order("paid_at", { ascending: false }),
    tenantId ?? null
  );

  for (const row of data || []) {
    if (pidsSet.has(row.patient_id) && !result.has(row.patient_id)) {
      result.set(row.patient_id, row.paid_at);
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

  // .in()はURL長制限でサイレント失敗するためテナント全件取得→JSフィルタ
  const pidsSet = new Set(patientIds);
  const { data } = await withTenant(
    supabaseAdmin
      .from("reorders")
      .select("patient_id"),
    tenantId ?? null
  );

  for (const row of data || []) {
    if (pidsSet.has(row.patient_id)) {
      result.set(row.patient_id, (result.get(row.patient_id) || 0) + 1);
    }
  }
  for (const pid of patientIds) {
    if (!result.has(pid)) result.set(pid, 0);
  }
  return result;
}

// ── 商品購入履歴 ──────────────────────────────────────────────
// 指定した商品コードを購入済みの患者IDセットを返す
// dateFrom/dateTo で購入時期を絞り込める（どちらか片方だけでもOK）
export async function getProductPurchasePatients(
  patientIds: string[],
  productCodes: string[],
  tenantId?: string | null,
  dateFrom?: string,
  dateTo?: string
): Promise<Set<string>> {
  const result = new Set<string>();
  if (patientIds.length === 0 || productCodes.length === 0) return result;

  // .in("patient_id")はURL長制限でサイレント失敗するためテナント全件取得→JSフィルタ
  // .in("product_code")は通常少数なので問題なし
  const pidsSet = new Set(patientIds);

  // orders テーブルから検索
  let query = withTenant(
    supabaseAdmin
      .from("orders")
      .select("patient_id")
      .in("product_code", productCodes)
      .eq("status", "paid"),
    tenantId ?? null
  );
  if (dateFrom) query = query.gte("paid_at", dateFrom);
  if (dateTo) query = query.lte("paid_at", dateTo + "T23:59:59");

  const { data } = await query;
  for (const row of data || []) {
    if (pidsSet.has(row.patient_id)) result.add(row.patient_id);
  }

  // reorders テーブルからも検索（再処方も購入歴に含む）
  let reorderQuery = withTenant(
    supabaseAdmin
      .from("reorders")
      .select("patient_id")
      .in("product_code", productCodes)
      .eq("status", "paid"),
    tenantId ?? null
  );
  if (dateFrom) reorderQuery = reorderQuery.gte("paid_at", dateFrom);
  if (dateTo) reorderQuery = reorderQuery.lte("paid_at", dateTo + "T23:59:59");

  const { data: reorderData } = await reorderQuery;
  for (const row of reorderData || []) {
    if (pidsSet.has(row.patient_id)) result.add(row.patient_id);
  }

  return result;
}

// ── 最終決済日の日付範囲マッチ ──────────────────────────────
export function matchLastPaymentDate(
  paidAt: string | null,
  from?: string,
  to?: string
): boolean {
  if (!paidAt) return false;
  const date = paidAt.slice(0, 10); // YYYY-MM-DD
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}

// ── 行動条件の判定（再処方回数用） ──────────────────────────
export function matchBehaviorCondition(
  value: number | string | null,
  operator: string,
  expected: string,
  expectedEnd?: string
): boolean {
  if (value === null) return false;

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
