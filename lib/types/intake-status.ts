// lib/types/intake-status.ts
// intakeテーブルのstatus型定義

/**
 * intakeテーブルのstatus（診察結果）
 * - null: 未診（診察待ち）
 * - "OK": 診察済み・処方許可
 * - "NG": 診察済み・処方なし
 */
export type IntakeStatus = null | "OK" | "NG";

/**
 * reservationsテーブルのstatus（予約状態）
 * - "pending": 予約中（アクティブ）
 * - "canceled": キャンセル済み
 */
export type ReservationStatus = "pending" | "canceled";

/**
 * intakeテーブルのstatus値を検証
 * 不正な値（"pending"など）が入らないようにする
 */
export function validateIntakeStatus(status: any): IntakeStatus {
  if (status === null || status === undefined) return null;
  if (status === "OK" || status === "NG") return status;

  console.error(`[validateIntakeStatus] Invalid status value: "${status}". Returning null.`);
  return null;
}

/**
 * reservationsテーブルのstatus値を検証
 */
export function validateReservationStatus(status: any): ReservationStatus {
  if (status === "pending" || status === "canceled") return status;

  console.error(`[validateReservationStatus] Invalid status value: "${status}". Defaulting to "pending".`);
  return "pending";
}
