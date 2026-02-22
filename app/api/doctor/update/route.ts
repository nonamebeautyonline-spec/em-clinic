import { NextRequest, NextResponse } from "next/server";
import { invalidateDashboardCache } from "@/lib/redis";
import { createClient } from "@supabase/supabase-js";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { doctorUpdateSchema } from "@/lib/validations/doctor";

// ★ SERVICE_ROLE_KEYを使用してRLSをバイパス
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function fail(code: string, status: number = 500) {
  return NextResponse.json({ ok: false, code }, { status });
}

export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);

  try {
    const parsed = await parseBody(req, doctorUpdateSchema);
    if ("error" in parsed) return parsed.error;
    const { reserveId, status, note, prescriptionMenu } = parsed.data;

    console.log(`[doctor/update] Processing: reserveId=${reserveId}, status=${status}`);

    // ★ Step 1: intakeテーブルからpatient_idを取得
    const { data: intakeData, error: intakeQueryError } = await withTenant(
      supabaseAdmin
        .from("intake")
        .select("patient_id")
        .eq("reserve_id", reserveId)
        .single(),
      tenantId
    );

    if (intakeQueryError || !intakeData) {
      console.error("[doctor/update] Intake not found:", { reserveId, error: intakeQueryError });
      return fail("INTAKE_NOT_FOUND", 404);
    }

    const patientId = intakeData.patient_id;

    // ★ Step 2: DB先行書き込み（intakeテーブルとreservationsテーブル）
    const [intakeResult, reservationResult] = await Promise.allSettled([
      // 2a. intakeテーブルを更新（status, note）※ prescription_menu は reservations が正
      withTenant(
        supabaseAdmin
          .from("intake")
          .update({
            status: status || null,
            note: note || null,
          })
          .eq("reserve_id", reserveId),
        tenantId
      ),

      // 2b. reservationsテーブルのstatus, note, prescription_menuも更新
      withTenant(
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
      return fail("DB_ERROR", 500);
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

    return NextResponse.json({ ok: true, patientId }, { status: 200 });
  } catch (err) {
    console.error("[doctor/update] error:", err);
    return fail("INTERNAL_ERROR", 500);
  }
}
