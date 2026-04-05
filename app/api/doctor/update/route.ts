import { NextRequest, NextResponse } from "next/server";
import { unauthorized, apiError } from "@/lib/api-error";
import { invalidateDashboardCache } from "@/lib/redis";
import { createClient } from "@supabase/supabase-js";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant } from "@/lib/tenant";
import { sendPaymentNotification } from "@/lib/payment-flex";
import { scheduleReservationFollowups } from "@/lib/followup";
import { parseBody } from "@/lib/validations/helpers";
import { doctorUpdateSchema } from "@/lib/validations/doctor";

// ★ SERVICE_ROLE_KEYを使用してRLSをバイパス
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function fail(code: string, message: string = "", status: number = 500) {
  return apiError(status, code, message || code);
}

export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantId(req);

  try {
    const parsed = await parseBody(req, doctorUpdateSchema);
    if ("error" in parsed) return parsed.error;
    const { reserveId, status, note, prescriptionMenu } = parsed.data;

    console.log(`[doctor/update] Processing: reserveId=${reserveId}, status=${status}`);

    // ★ Step 1: intakeテーブルからpatient_idを取得
    // intake_completionモード: reserveIdが "intake_XXXXX" 形式の場合はintake.idで検索
    const isIntakeId = reserveId.startsWith("intake_");
    const intakeIdNum = isIntakeId ? reserveId.replace("intake_", "") : null;

    const intakeQuery = isIntakeId
      ? withTenant(
          supabaseAdmin.from("intake").select("id, patient_id").eq("id", intakeIdNum!).single(),
          tenantId
        )
      : withTenant(
          supabaseAdmin.from("intake").select("id, patient_id").eq("reserve_id", reserveId).single(),
          tenantId
        );

    const { data: intakeData, error: intakeQueryError } = await intakeQuery;

    if (intakeQueryError || !intakeData) {
      console.error("[doctor/update] Intake not found:", { reserveId, error: intakeQueryError });
      return fail("INTAKE_NOT_FOUND", "問診記録が見つかりません", 404);
    }

    const patientId = intakeData.patient_id;
    const intakeId = intakeData.id;

    // ★ Step 2: DB先行書き込み（intakeテーブルとreservationsテーブル）
    const [intakeResult, reservationResult] = await Promise.allSettled([
      // 2a. intakeテーブルを更新（status, note, call_statusクリア）
      // intake_completionモード: idで更新、通常モード: reserve_idで更新
      withTenant(
        supabaseAdmin
          .from("intake")
          .update({
            status: status || null,
            note: note || null,
            call_status: null,
          })
          .eq("id", intakeId),
        tenantId
      ),

      // 2b. reservationsテーブルのstatus, note, prescription_menuも更新（intake_completionモードではスキップ）
      isIntakeId
        ? Promise.resolve({ error: null })
        : withTenant(
            supabaseAdmin
              .from("reservations")
              .update({
                status: status || "pending",
                note: note || null,
                prescription_menu: prescriptionMenu || null,
              })
              .eq("reserve_id", reserveId),
            tenantId
          ),
    ]);

    // intakeの更新が失敗したらエラー
    if (intakeResult.status === "rejected" ||
        (intakeResult.status === "fulfilled" && intakeResult.value.error)) {
      const error = intakeResult.status === "rejected"
        ? intakeResult.reason
        : intakeResult.value.error;
      console.error("[doctor/update] Intake update failed:", error);
      return fail("DB_ERROR", "データベース更新に失敗しました", 500);
    }

    // reservationsの更新エラーはログのみ（intakeが優先）
    if (reservationResult.status === "rejected" ||
        (reservationResult.status === "fulfilled" && reservationResult.value.error)) {
      const error = reservationResult.status === "rejected"
        ? reservationResult.reason
        : reservationResult.value.error;
      console.error("[doctor/update] Reservation update failed (non-critical):", error);
    }

    console.log(`[doctor/update] ✅ DB updated: reserveId=${reserveId}, patient_id=${patientId}`);

    // ★ Step 3: キャッシュ無効化
    if (patientId) {
      try {
        await invalidateDashboardCache(patientId);
        console.log(`[doctor/update] Cache invalidated for patient_id=${patientId}`);
      } catch (cacheError) {
        console.error("[doctor/update] Failed to invalidate cache:", cacheError);
      }
    }

    // ★ Step 4: ステータスOK時に決済案内LINE通知 + 来院フォロー（fire-and-forget）
    if (status === "OK" && patientId) {
      const tid = tenantId;
      (async () => {
        try {
          const { data: patient } = await withTenant(
            supabaseAdmin
              .from("patients")
              .select("line_id")
              .eq("patient_id", patientId)
              .maybeSingle(),
            tid
          );
          if (patient?.line_id) {
            await sendPaymentNotification({
              patientId,
              lineUid: patient.line_id,
              tenantId: tid ?? undefined,
            });
            console.log(`[doctor/update] 決済案内通知送信: patient_id=${patientId}`);
          } else {
            console.warn(`[doctor/update] LINE UID未取得のため決済案内送信スキップ: patient_id=${patientId}`);
          }
        } catch (err) {
          console.error("[doctor/update] 決済案内通知エラー（ステータス更新は成功）:", err);
        }
      })();

      // 来院完了フォローアップをスケジュール（fire-and-forget）
      scheduleReservationFollowups(reserveId, patientId, tenantId).catch((err) => {
        console.error("[doctor/update] 来院フォロースケジュールエラー:", err);
      });
    }

    return NextResponse.json({ ok: true, patientId }, { status: 200 });
  } catch (err) {
    console.error("[doctor/update] error:", err);
    return fail("INTERNAL_ERROR", "予期しないエラーが発生しました", 500);
  }
}
