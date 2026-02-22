// 管理者用: 患者データ削除（予約キャンセル + 問診削除）
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { invalidateDashboardCache } from "@/lib/redis";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant } from "@/lib/tenant";
import { logAudit } from "@/lib/audit";
import { parseBody } from "@/lib/validations/helpers";
import { deletePatientDataSchema } from "@/lib/validations/admin-operations";

export async function POST(req: NextRequest) {
  try {
    // 認証チェック（クッキーまたはBearerトークン）
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = resolveTenantId(req);

    const parsed = await parseBody(req, deletePatientDataSchema);
    if ("error" in parsed) return parsed.error;
    const { patient_id, delete_intake, delete_reservation } = parsed.data;

    const results: {
      reservation_canceled?: boolean;
      intake_deleted?: boolean;
      errors: string[];
    } = { errors: [] };

    // 1. 予約をキャンセル（status = "canceled"）
    if (delete_reservation !== false) {
      const { data: reservations, error: fetchError } = await withTenant(
        supabaseAdmin
          .from("reservations")
          .select("id, reserve_id, reserved_date, reserved_time, status")
          .eq("patient_id", patient_id)
          .neq("status", "canceled"),
        tenantId
      );

      if (fetchError) {
        results.errors.push(`予約取得エラー: ${fetchError.message}`);
      } else if (reservations && reservations.length > 0) {
        const { error: cancelError } = await withTenant(
          supabaseAdmin
            .from("reservations")
            .update({ status: "canceled" })
            .eq("patient_id", patient_id)
            .neq("status", "canceled"),
          tenantId
        );

        if (cancelError) {
          results.errors.push(`予約キャンセルエラー: ${cancelError.message}`);
        } else {
          results.reservation_canceled = true;
          console.log(`[admin/delete-patient-data] Canceled ${reservations.length} reservations for patient_id=${patient_id}`);
        }
      } else {
        console.log(`[admin/delete-patient-data] No active reservations for patient_id=${patient_id}`);
      }
    }

    // 2. 問診データを削除
    if (delete_intake) {
      const { error: intakeError } = await withTenant(
        supabaseAdmin
          .from("intake")
          .delete()
          .eq("patient_id", patient_id),
        tenantId
      );

      if (intakeError) {
        results.errors.push(`問診削除エラー: ${intakeError.message}`);
      } else {
        results.intake_deleted = true;
        console.log(`[admin/delete-patient-data] Deleted intake for patient_id=${patient_id}`);
      }
    }

    // 3. キャッシュ削除
    await invalidateDashboardCache(patient_id);

    logAudit(req, "patient.delete_data", "patient", patient_id, { delete_intake, delete_reservation, results });

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

    const tenantId = resolveTenantId(req);

    const { searchParams } = new URL(req.url);
    const patient_id = searchParams.get("patient_id");

    if (!patient_id) {
      return NextResponse.json({ error: "patient_id required" }, { status: 400 });
    }

    // 予約情報・患者名・問診情報を並列取得
    const [{ data: reservations }, { data: patient }, { data: intakeData }] = await Promise.all([
      withTenant(
        supabaseAdmin
          .from("reservations")
          .select("id, reserve_id, reserved_date, reserved_time, status, patient_name")
          .eq("patient_id", patient_id)
          .order("reserved_date", { ascending: false }),
        tenantId
      ),
      withTenant(
        supabaseAdmin
          .from("patients")
          .select("name")
          .eq("patient_id", patient_id),
        tenantId
      ).maybeSingle(),
      withTenant(
        supabaseAdmin
          .from("intake")
          .select("id, reserve_id, created_at")
          .eq("patient_id", patient_id)
          .order("created_at", { ascending: false })
          .limit(1),
        tenantId
      ).maybeSingle(),
    ]);

    return NextResponse.json({
      ok: true,
      patient_id,
      patient_name: patient?.name || "",
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
