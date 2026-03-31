// lib/salon-reservation-flow.ts — SALON予約フローのステート管理
//
// LINE上での予約フローをMapベースのインメモリキャッシュで管理（TTL: 5分）
// 本番ではUpstash Redis推奨だが、まずはシンプルにMapで実装

/** 予約フローの各ステップ */
export type ReservationStep =
  | "menu_select"
  | "stylist_select"
  | "date_select"
  | "time_select"
  | "confirm";

/** 予約フローの状態 */
export interface ReservationFlowState {
  step: ReservationStep;
  tenantId: string;
  patientId: string;
  lineUid: string;
  selectedMenuId?: string;
  selectedMenuName?: string;
  selectedMenuDuration?: number;
  selectedMenuPrice?: number;
  selectedStylistId?: string;
  selectedStylistName?: string;
  selectedDate?: string;
  selectedTime?: string;
}

// インメモリキャッシュ（lineUid → { state, expires }）
const flowStates = new Map<string, { state: ReservationFlowState; expires: number }>();
const FLOW_TTL = 5 * 60 * 1000; // 5分

/**
 * フロー状態を取得（TTL超過時は自動削除してnull返却）
 */
export function getFlowState(lineUid: string): ReservationFlowState | null {
  const entry = flowStates.get(lineUid);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    flowStates.delete(lineUid);
    return null;
  }
  return entry.state;
}

/**
 * フロー状態を保存（TTLリセット）
 */
export function setFlowState(lineUid: string, state: ReservationFlowState): void {
  flowStates.set(lineUid, {
    state,
    expires: Date.now() + FLOW_TTL,
  });
}

/**
 * フロー状態をクリア
 */
export function clearFlowState(lineUid: string): void {
  flowStates.delete(lineUid);
}
