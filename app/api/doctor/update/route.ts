import { NextResponse } from "next/server";
import { invalidateDashboardCache } from "@/lib/redis";
import { createClient } from "@supabase/supabase-js";

const GAS_INTAKE_URL = process.env.GAS_INTAKE_URL as string;

// ★ SERVICE_ROLE_KEYを使用してRLSをバイパス
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function fail(code: string, status: number = 500) {
  return NextResponse.json({ ok: false, code }, { status });
}

// ★ GASへのバックグラウンド同期（fire-and-forget）
function syncToGASBackground(payload: any) {
  if (!GAS_INTAKE_URL) return;

  fetch(GAS_INTAKE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
    .then(async (res) => {
      const text = await res.text().catch(() => "");
      if (!res.ok) {
        console.error("[doctor/update] GAS Background Sync Failed:", res.status, text?.slice(0, 200));
      } else {
        console.log("[doctor/update] GAS Background Sync OK");
      }
    })
    .catch((err) => {
      console.error("[doctor/update] GAS Background Sync Error:", err.message);
    });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const { reserveId, status, note, prescriptionMenu } = body;

    if (!reserveId) {
      return fail("MISSING_RESERVE_ID", 400);
    }

    console.log(`[doctor/update] Processing: reserveId=${reserveId}, status=${status}`);

    // ★ Step 1: intakeテーブルからpatient_idを取得
    const { data: intakeData, error: intakeQueryError } = await supabaseAdmin
      .from("intake")
      .select("patient_id")
      .eq("reserve_id", reserveId)
      .single();

    if (intakeQueryError || !intakeData) {
      console.error("[doctor/update] Intake not found:", { reserveId, error: intakeQueryError });
      return fail("INTAKE_NOT_FOUND", 404);
    }

    const patientId = intakeData.patient_id;

    // ★ Step 2: DB先行書き込み（intakeテーブルとreservationsテーブル）
    const [intakeResult, reservationResult] = await Promise.allSettled([
      // 2a. intakeテーブルを更新（status, note, prescription_menu）
      supabaseAdmin
        .from("intake")
        .update({
          status: status || null,
          note: note || null,
          prescription_menu: prescriptionMenu || null,
        })
        .eq("reserve_id", reserveId),

      // 2b. reservationsテーブルのnote, prescription_menuも更新
      supabaseAdmin
        .from("reservations")
        .update({
          note: note || null,
          prescription_menu: prescriptionMenu || null,
        })
        .eq("reserve_id", reserveId),
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

    // ★ Step 4: GASはバックグラウンドで同期（ユーザーを待たせない）
    syncToGASBackground({ type: "doctor_update", ...body });

    return NextResponse.json({ ok: true, patientId }, { status: 200 });
  } catch (err) {
    console.error("[doctor/update] error:", err);
    return fail("INTERNAL_ERROR", 500);
  }
}
