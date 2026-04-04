// 管理者用: 患者データ削除（予約キャンセル + 問診削除）
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { invalidateDashboardCache } from "@/lib/redis";
import { verifyAdminAuth, getAdminUserId } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow, strictWithTenant } from "@/lib/tenant";
import { logAudit } from "@/lib/audit";
import { parseBody } from "@/lib/validations/helpers";
import { deletePatientDataSchema } from "@/lib/validations/admin-operations";

export async function POST(req: NextRequest) {
  try {
    // 認証チェック（クッキーまたはBearerトークン）
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) {
      return unauthorized();
    }

    const tenantId = resolveTenantIdOrThrow(req);

    const parsed = await parseBody(req, deletePatientDataSchema);
    if ("error" in parsed) return parsed.error;
    const { patient_id, password, reason, delete_intake, delete_reservation } = parsed.data;

    // パスワード再確認（指定された場合のみ）
    if (password) {
      const adminUserId = await getAdminUserId(req);
      if (!adminUserId) {
        return unauthorized();
      }

      const { data: adminUser, error: adminFetchError } = await supabaseAdmin
        .from("admin_users")
        .select("password_hash")
        .eq("id", adminUserId)
        .single();

      if (adminFetchError || !adminUser?.password_hash) {
        return unauthorized();
      }

      const passwordMatch = await bcrypt.compare(password, adminUser.password_hash);
      if (!passwordMatch) {
        return NextResponse.json({ ok: false, error: "パスワードが一致しません" }, { status: 403 });
      }
    }

    const results: {
      reservation_canceled?: boolean;
      intake_deleted?: boolean;
      errors: string[];
    } = { errors: [] };

    // 1. 予約をキャンセル（status = "canceled"）
    if (delete_reservation !== false) {
      const { data: reservations, error: fetchError } = await strictWithTenant(
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
        const { error: cancelError } = await strictWithTenant(
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
          console.log(`[admin/delete-patient-data] Canceled ${reservations.length} reservations`);
        }
      } else {
        console.log("[admin/delete-patient-data] No active reservations found");
      }
    }

    // 2. 問診データを削除
    if (delete_intake) {
      const { error: intakeError } = await strictWithTenant(
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
        console.log("[admin/delete-patient-data] Deleted intake data");
      }
    }

    // 3. キャッシュ削除
    await invalidateDashboardCache(patient_id);

    logAudit(req, "patient.delete_data", "patient", String(patient_id), { delete_intake, delete_reservation, reason, results });

    return NextResponse.json({
      ok: results.errors.length === 0,
      patient_id,
      ...results,
    });
  } catch (error) {
    console.error("[admin/delete-patient-data] Error:", error);
    return serverError(error instanceof Error ? error.message : "Server error");
  }
}

// GET: 患者の予約・問診情報を取得
export async function GET(req: NextRequest) {
  try {
    // 認証チェック（クッキーまたはBearerトークン）
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) {
      return unauthorized();
    }

    const tenantId = resolveTenantIdOrThrow(req);

    const { searchParams } = new URL(req.url);
    const patient_id = searchParams.get("patient_id");

    if (!patient_id) {
      return badRequest("patient_id required");
    }

    // 予約情報・患者名・問診情報を並列取得
    const [{ data: reservations }, { data: patient }, { data: intakeData }] = await Promise.all([
      strictWithTenant(
        supabaseAdmin
          .from("reservations")
          .select("id, reserve_id, reserved_date, reserved_time, status, patient_name")
          .eq("patient_id", patient_id)
          .order("reserved_date", { ascending: false }),
        tenantId
      ),
      strictWithTenant(
        supabaseAdmin
          .from("patients")
          .select("name")
          .eq("patient_id", patient_id),
        tenantId
      ).maybeSingle(),
      strictWithTenant(
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
    return serverError(error instanceof Error ? error.message : "Server error");
  }
}
