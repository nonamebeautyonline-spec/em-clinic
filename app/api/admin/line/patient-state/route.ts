// 患者状態API（Phase 2-4）
// GET: 患者の現在の状態 / PATCH: 手動で状態を変更

import { NextRequest, NextResponse } from "next/server";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow } from "@/lib/tenant";
import { fetchPatientState, transitionPatientState, type PatientStateType } from "@/lib/ai-patient-state";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

// 状態取得
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const patientId = req.nextUrl.searchParams.get("patient_id");
  if (!patientId) return badRequest("patient_idが必要です");

  try {
    const state = await fetchPatientState(patientId, tenantId);
    return NextResponse.json({ state });
  } catch (err) {
    console.error("[PatientState API] 取得エラー:", err);
    return serverError("状態の取得に失敗しました");
  }
}

// 手動状態変更
export async function PATCH(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);

  try {
    const body = await req.json();
    const { patient_id, to_state, context } = body;
    if (!patient_id || !to_state) return badRequest("patient_idとto_stateが必要です");

    await transitionPatientState({
      tenantId,
      patientId: patient_id,
      toState: to_state as PatientStateType,
      triggerType: "manual",
      triggerPayload: { source: "admin_api" },
      context,
    });

    logAudit(req, "patient_state.transition", "ai_patient_state", patient_id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[PatientState API] 更新エラー:", err);
    return serverError("状態の更新に失敗しました");
  }
}
