// 患者業務フロー状態管理（Phase 2-4: Conversation State Machine）
// 既存のfetchPatientFlowStatusを活用し、AI用の構造化された状態管理を提供

import { supabaseAdmin } from "@/lib/supabase";
import { withTenant, tenantPayload, strictWithTenant } from "@/lib/tenant";
import { fetchPatientFlowStatus, type PatientFlowStatus } from "@/lib/ai-reply";

// 状態定義
export const PATIENT_STATES = {
  new_patient: "新規患者",
  awaiting_registration: "個人情報登録待ち",
  awaiting_verification: "電話番号認証待ち",
  awaiting_questionnaire: "問診待ち",
  awaiting_reservation: "予約待ち",
  awaiting_consultation: "診察待ち",
  awaiting_payment: "決済待ち",
  awaiting_shipping: "発送待ち",
  awaiting_staff_callback: "スタッフ対応待ち",
  post_consult_followup: "診察後フォロー",
  reorder_pending: "再処方申請中",
  idle: "アイドル",
} as const;

export type PatientStateType = keyof typeof PATIENT_STATES;

export interface PatientState {
  id?: number;
  current_state: PatientStateType;
  state_confidence: number;
  state_source: string;
  context: Record<string, unknown>;
  last_transition_at: string;
}

/**
 * 患者の現在の状態を取得（DBから、なければflowStatusから推論）
 */
export async function fetchPatientState(
  patientId: string,
  tenantId: string | null
): Promise<PatientState> {
  // DB上の状態を確認
  const { data } = await strictWithTenant(
    supabaseAdmin
      .from("ai_patient_state")
      .select("id, current_state, state_confidence, state_source, context, last_transition_at")
      .eq("patient_id", patientId)
      .maybeSingle(),
    tenantId
  );

  if (data) {
    return data as PatientState;
  }

  // DBに状態がない場合、flowStatusから推論
  const flowStatus = await fetchPatientFlowStatus(patientId, tenantId);
  const inferred = inferStateFromFlowStatus(flowStatus);

  // 推論結果をDBに保存（初回のみ）
  try {
    await supabaseAdmin
      .from("ai_patient_state")
      .upsert({
        ...tenantPayload(tenantId),
        patient_id: patientId,
        current_state: inferred.current_state,
        state_confidence: inferred.state_confidence,
        state_source: "system",
        context: inferred.context,
        last_transition_at: new Date().toISOString(),
      }, { onConflict: "tenant_id,patient_id" });
  } catch {
    // upsert失敗はスルー（次回再試行）
  }

  return inferred;
}

/**
 * flowStatusから状態を推論
 */
function inferStateFromFlowStatus(status: PatientFlowStatus): PatientState {
  const ctx: Record<string, unknown> = { flowStage: status.flowStage };
  let state: PatientStateType = "idle";
  let confidence = 0.9;

  if (status.flowStage === "不明") {
    state = "new_patient";
    confidence = 0.7;
  } else if (!status.hasRegisteredPersonalInfo) {
    state = "awaiting_registration";
  } else if (!status.hasVerifiedPhone) {
    state = "awaiting_verification";
  } else if (!status.hasCompletedQuestionnaire) {
    state = "awaiting_questionnaire";
  } else if (!status.hasReservation) {
    state = "awaiting_reservation";
  } else if (status.activeReorder) {
    state = "reorder_pending";
    ctx.reorder_status = status.activeReorder.status;
  } else if (status.latestOrder) {
    const o = status.latestOrder;
    if (o.paymentStatus !== "paid") {
      state = "awaiting_payment";
      ctx.payment_method = o.paymentMethod;
    } else if (o.shippingStatus !== "shipped" && o.shippingStatus !== "delivered") {
      state = "awaiting_shipping";
    } else {
      state = "idle";
    }
  } else if (status.nextReservation) {
    state = "awaiting_consultation";
    ctx.next_reservation = status.nextReservation;
  } else {
    state = "idle";
  }

  return {
    current_state: state,
    state_confidence: confidence,
    state_source: "system",
    context: ctx,
    last_transition_at: new Date().toISOString(),
  };
}

/**
 * 状態遷移を記録
 */
export async function transitionPatientState(params: {
  tenantId: string | null;
  patientId: string;
  toState: PatientStateType;
  triggerType: "message" | "tool" | "manual" | "system";
  triggerPayload?: Record<string, unknown>;
  context?: Record<string, unknown>;
}): Promise<void> {
  const { tenantId, patientId, toState, triggerType, triggerPayload, context } = params;

  try {
    // 現在の状態を取得
    const { data: current } = await strictWithTenant(
      supabaseAdmin
        .from("ai_patient_state")
        .select("current_state")
        .eq("patient_id", patientId)
        .maybeSingle(),
      tenantId
    );

    const fromState = current?.current_state || null;

    // 状態を更新
    await supabaseAdmin
      .from("ai_patient_state")
      .upsert({
        ...tenantPayload(tenantId),
        patient_id: patientId,
        current_state: toState,
        state_confidence: 1.0,
        state_source: triggerType,
        context: context || {},
        last_transition_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "tenant_id,patient_id" });

    // 遷移履歴を記録
    await supabaseAdmin
      .from("ai_patient_state_history")
      .insert({
        ...tenantPayload(tenantId),
        patient_id: patientId,
        from_state: fromState,
        to_state: toState,
        trigger_type: triggerType,
        trigger_payload: triggerPayload || {},
      });
  } catch (err) {
    console.error("[PatientState] 遷移エラー:", err);
  }
}

/**
 * 状態をプロンプト用テキストに変換
 */
export function formatStateForPrompt(state: PatientState): string {
  const label = PATIENT_STATES[state.current_state] || state.current_state;
  let section = `## 患者の業務フロー状態\n- 状態: ${label}（信頼度: ${state.state_confidence}）`;

  if (state.context && Object.keys(state.context).length > 0) {
    const ctx = Object.entries(state.context)
      .filter(([, v]) => v != null)
      .map(([k, v]) => `  - ${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`)
      .join("\n");
    if (ctx) section += "\n" + ctx;
  }

  return section;
}
