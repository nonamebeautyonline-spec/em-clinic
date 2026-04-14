// app/api/mypage/export/route.ts — 患者データエクスポートAPI
import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized, tooManyRequests } from "@/lib/api-error";
import { verifyPatientSession } from "@/lib/patient-session";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveTenantIdOrThrow, strictWithTenant } from "@/lib/tenant";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    // 患者セッション検証（JWT + 旧Cookieフォールバック）
    const session = await verifyPatientSession(req);
    if (!session) {
      return unauthorized("patient_id cookie not found");
    }
    const patientId = session.patientId;

    // レート制限: 1時間に1回
    const rl = await checkRateLimit(`export:${patientId}`, 1, 3600);
    if (rl.limited) {
      return tooManyRequests(
        "データエクスポートは1時間に1回までです。しばらく時間を置いてお試しください。"
      );
    }

    const tenantId = resolveTenantIdOrThrow(req);

    // 患者情報・intake・予約・注文・再処方・ポイント台帳を並列取得
    const [
      patientRes,
      intakeRes,
      reservationsRes,
      ordersRes,
      reordersRes,
      pointLedgerRes,
    ] = await Promise.all([
      strictWithTenant(
        supabaseAdmin.from("patients").select("*").eq("patient_id", patientId),
        tenantId
      ),
      strictWithTenant(
        supabaseAdmin.from("intake").select("*").eq("patient_id", patientId),
        tenantId
      ),
      strictWithTenant(
        supabaseAdmin
          .from("reservations")
          .select("*")
          .eq("patient_id", patientId)
          .order("reserved_date", { ascending: false }),
        tenantId
      ),
      strictWithTenant(
        supabaseAdmin
          .from("orders")
          .select("*")
          .eq("patient_id", patientId)
          .order("created_at", { ascending: false }),
        tenantId
      ),
      strictWithTenant(
        supabaseAdmin
          .from("reorders")
          .select("*")
          .eq("patient_id", patientId)
          .order("created_at", { ascending: false }),
        tenantId
      ),
      strictWithTenant(
        supabaseAdmin
          .from("point_ledger")
          .select("*")
          .eq("patient_id", patientId)
          .order("created_at", { ascending: false }),
        tenantId
      ),
    ]);

    const exportData = {
      exported_at: new Date().toISOString(),
      patient_id: patientId,
      patient: patientRes.data ?? [],
      intake: intakeRes.data ?? [],
      reservations: reservationsRes.data ?? [],
      orders: ordersRes.data ?? [],
      reorders: reordersRes.data ?? [],
      point_ledger: pointLedgerRes.data ?? [],
    };

    return NextResponse.json({ ok: true, data: exportData });
  } catch (err) {
    console.error("[mypage/export] エラー:", err);
    return serverError("データエクスポートに失敗しました");
  }
}
