// app/api/admin/dedup-patients/merge/route.ts — 患者名寄せ: 統合実行API
import { NextRequest, NextResponse } from "next/server";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow } from "@/lib/tenant";
import { mergePatients } from "@/lib/patient-dedup";
import { parseBody } from "@/lib/validations/helpers";
import { mergePatientSchema } from "@/lib/validations/dedup";
import { logAudit } from "@/lib/audit";

/**
 * POST /api/admin/dedup-patients/merge
 * 患者統合を実行
 * Body: { keep_id: string, remove_id: string }
 */
export async function POST(req: NextRequest) {
  const isAuth = await verifyAdminAuth(req);
  if (!isAuth) {
    return unauthorized();
  }

  const { data, error } = await parseBody(req, mergePatientSchema);
  if (error) return error;

  const { keep_id, remove_id } = data;

  // 同一IDチェック
  if (keep_id === remove_id) {
    return badRequest("同じ患者IDは統合できません");
  }

  const tenantId = resolveTenantIdOrThrow(req);

  try {
    const result = await mergePatients(keep_id, remove_id, tenantId);

    if (!result.ok) {
      return badRequest(result.error ?? "統合に失敗しました");
    }

    // 監査ログ記録（fire-and-forget）
    logAudit(req, "patient_merge", "patient", keep_id, {
      keep_id,
      remove_id,
      details: result.details,
    }).catch(() => {});

    return NextResponse.json({
      ok: true,
      message: `患者 ${remove_id} を ${keep_id} に統合しました`,
      details: result.details,
    });
  } catch (err) {
    console.error("[dedup-patients/merge] 統合エラー:", err);
    return serverError("患者統合に失敗しました");
  }
}
