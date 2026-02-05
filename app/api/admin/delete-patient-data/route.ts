// 管理者用: 患者データ削除（予約キャンセル + 問診削除 + GAS同期）
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { invalidateDashboardCache } from "@/lib/redis";
import { verifyAdminAuth } from "@/lib/admin-auth";

const GAS_RESERVATIONS_URL = process.env.GAS_RESERVATIONS_URL;

export async function POST(req: NextRequest) {
  try {
    // 認証チェック（クッキーまたはBearerトークン）
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { patient_id, delete_intake, delete_reservation, sync_gas } = body;

    if (!patient_id) {
      return NextResponse.json({ error: "patient_id required" }, { status: 400 });
    }

    const results: {
      reservation_canceled?: boolean;
      intake_deleted?: boolean;
      gas_synced?: boolean;
      errors: string[];
    } = { errors: [] };

    // 1. 予約をキャンセル（status = "canceled"）
    if (delete_reservation !== false) {
      const { data: reservations, error: fetchError } = await supabaseAdmin
        .from("reservations")
        .select("id, reserve_id, reserved_date, reserved_time, status")
        .eq("patient_id", patient_id)
        .neq("status", "canceled");

      if (fetchError) {
        results.errors.push(`予約取得エラー: ${fetchError.message}`);
      } else if (reservations && reservations.length > 0) {
        const { error: cancelError } = await supabaseAdmin
          .from("reservations")
          .update({ status: "canceled" })
          .eq("patient_id", patient_id)
          .neq("status", "canceled");

        if (cancelError) {
          results.errors.push(`予約キャンセルエラー: ${cancelError.message}`);
        } else {
          results.reservation_canceled = true;
          console.log(`[admin/delete-patient-data] Canceled ${reservations.length} reservations for patient_id=${patient_id}`);

          // GAS同期（予約削除）
          if (sync_gas && GAS_RESERVATIONS_URL) {
            for (const reservation of reservations) {
              try {
                await fetch(GAS_RESERVATIONS_URL, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    type: "deleteReservation",
                    reserveId: reservation.reserve_id,
                    patient_id: patient_id,
                  }),
                  cache: "no-store",
                });
                console.log(`[admin/delete-patient-data] GAS sync: deleted reservation ${reservation.reserve_id}`);
              } catch (e) {
                console.error(`[admin/delete-patient-data] GAS sync error:`, e);
                results.errors.push(`GAS同期エラー: ${reservation.reserve_id}`);
              }
            }
            results.gas_synced = true;
          }
        }
      } else {
        console.log(`[admin/delete-patient-data] No active reservations for patient_id=${patient_id}`);
      }
    }

    // 2. 問診データを削除
    if (delete_intake) {
      const { error: intakeError } = await supabaseAdmin
        .from("intake")
        .delete()
        .eq("patient_id", patient_id);

      if (intakeError) {
        results.errors.push(`問診削除エラー: ${intakeError.message}`);
      } else {
        results.intake_deleted = true;
        console.log(`[admin/delete-patient-data] Deleted intake for patient_id=${patient_id}`);
      }
    }

    // 3. キャッシュ削除
    await invalidateDashboardCache(patient_id);

    return NextResponse.json({
      ok: results.errors.length === 0,
      patient_id,
      ...results,
    });
  } catch (error) {
    console.error("[admin/delete-patient-data] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}

// GET: 患者の予約・問診情報を取得
export async function GET(req: NextRequest) {
  try {
    // 認証チェック（クッキーまたはBearerトークン）
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const patient_id = searchParams.get("patient_id");

    if (!patient_id) {
      return NextResponse.json({ error: "patient_id required" }, { status: 400 });
    }

    // 予約情報を取得
    const { data: reservations } = await supabaseAdmin
      .from("reservations")
      .select("id, reserve_id, reserved_date, reserved_time, status, patient_name")
      .eq("patient_id", patient_id)
      .order("reserved_date", { ascending: false });

    // 問診情報を取得
    const { data: intakeData } = await supabaseAdmin
      .from("intake")
      .select("id, patient_name, reserved_date, reserved_time, reserve_id, created_at")
      .eq("patient_id", patient_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return NextResponse.json({
      ok: true,
      patient_id,
      reservations: reservations || [],
      intake: intakeData,
    });
  } catch (error) {
    console.error("[admin/delete-patient-data] GET Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}
