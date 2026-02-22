// app/api/admin/dedup-patients/merge/route.ts — 患者名寄せ: 統合実行API
import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId } from "@/lib/tenant";
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
    return NextResponse.json({ ok: false, error: "認証エラー" }, { status: 401 });
  }

  const { data, error } = await parseBody(req, mergePatientSchema);
  if (error) return error;

  const { keep_id, remove_id } = data;

  // 同一IDチェック
  if (keep_id === remove_id) {
    return NextResponse.json(
      { ok: false, error: "同じ患者IDは統合できません" },
      { status: 400 },
    );
  }

  const tenantId = resolveTenantId(req);

  try {
    const result = await mergePatients(keep_id, remove_id, tenantId);

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
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
    return NextResponse.json(
      { ok: false, error: "患者統合に失敗しました" },
      { status: 500 },
    );
  }
}
