// lib/points.ts — ポイント制度ライブラリ
// ポイントの付与・利用・残高取得・履歴取得・設定取得を提供

import { supabaseAdmin } from "@/lib/supabase";
import { withTenant, tenantPayload } from "@/lib/tenant";

/** ポイント台帳レコード型 */
export type PointLedgerEntry = {
  id: string;
  tenant_id: string;
  patient_id: string;
  amount: number;
  balance_after: number;
  reason: string | null;
  reference_type: "order" | "reorder" | "manual" | "expired" | null;
  reference_id: string | null;
  created_at: string;
};

/** ポイント設定型 */
export type PointSettings = {
  id: string;
  tenant_id: string;
  points_per_yen: number;
  expiry_months: number;
  is_active: boolean;
};

/**
 * ポイント残高を取得
 * 最新のbalance_afterを返す（レコードがなければ0）
 */
export async function getBalance(
  tenantId: string | null,
  patientId: string,
): Promise<number> {
  const { data, error } = await withTenant(
    supabaseAdmin
      .from("point_ledger")
      .select("balance_after")
      .eq("patient_id", patientId),
    tenantId,
  )
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[points] getBalance error:", error);
    throw new Error("ポイント残高の取得に失敗しました");
  }

  return data?.balance_after ?? 0;
}

/**
 * ポイント付与
 * @returns 作成された台帳エントリ
 */
export async function grantPoints(
  tenantId: string | null,
  patientId: string,
  amount: number,
  reason: string,
  refType: "order" | "reorder" | "manual" | "expired",
  refId?: string,
): Promise<PointLedgerEntry> {
  if (amount <= 0) {
    throw new Error("付与ポイントは正の整数である必要があります");
  }

  const currentBalance = await getBalance(tenantId, patientId);
  const newBalance = currentBalance + amount;

  const record = {
    ...tenantPayload(tenantId),
    patient_id: patientId,
    amount,
    balance_after: newBalance,
    reason,
    reference_type: refType,
    reference_id: refId || null,
  };

  const { data, error } = await supabaseAdmin
    .from("point_ledger")
    .insert(record)
    .select()
    .single();

  if (error) {
    console.error("[points] grantPoints error:", error);
    throw new Error("ポイント付与に失敗しました");
  }

  return data as PointLedgerEntry;
}

/**
 * ポイント利用（残高チェック付き）
 * @returns 作成された台帳エントリ
 * @throws 残高不足の場合エラー
 */
export async function usePoints(
  tenantId: string | null,
  patientId: string,
  amount: number,
  reason: string,
  refType: "order" | "reorder" | "manual" | "expired",
  refId?: string,
): Promise<PointLedgerEntry> {
  if (amount <= 0) {
    throw new Error("利用ポイントは正の整数である必要があります");
  }

  const currentBalance = await getBalance(tenantId, patientId);
  if (currentBalance < amount) {
    throw new Error(
      `ポイント残高不足です（現在: ${currentBalance}pt, 必要: ${amount}pt）`,
    );
  }

  const newBalance = currentBalance - amount;

  const record = {
    ...tenantPayload(tenantId),
    patient_id: patientId,
    amount: -amount, // 利用は負の値
    balance_after: newBalance,
    reason,
    reference_type: refType,
    reference_id: refId || null,
  };

  const { data, error } = await supabaseAdmin
    .from("point_ledger")
    .insert(record)
    .select()
    .single();

  if (error) {
    console.error("[points] usePoints error:", error);
    throw new Error("ポイント利用に失敗しました");
  }

  return data as PointLedgerEntry;
}

/**
 * ポイント履歴を取得
 */
export async function getHistory(
  tenantId: string | null,
  patientId: string,
  limit = 50,
  offset = 0,
): Promise<PointLedgerEntry[]> {
  const { data, error } = await withTenant(
    supabaseAdmin
      .from("point_ledger")
      .select("*")
      .eq("patient_id", patientId),
    tenantId,
  )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("[points] getHistory error:", error);
    throw new Error("ポイント履歴の取得に失敗しました");
  }

  return (data ?? []) as PointLedgerEntry[];
}

/**
 * ポイント設定を取得
 * テナントの設定がなければデフォルト値を返す
 */
export async function getPointSettings(
  tenantId: string | null,
): Promise<PointSettings> {
  const { data, error } = await withTenant(
    supabaseAdmin.from("point_settings").select("*"),
    tenantId,
  )
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[points] getPointSettings error:", error);
    throw new Error("ポイント設定の取得に失敗しました");
  }

  if (data) return data as PointSettings;

  // デフォルト値を返す
  return {
    id: "",
    tenant_id: tenantId || "00000000-0000-0000-0000-000000000001",
    points_per_yen: 1,
    expiry_months: 12,
    is_active: true,
  };
}
