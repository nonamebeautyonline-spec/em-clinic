// 患者バンドルAPI（Supabase直接取得）
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { formatProductCode, formatPaymentMethod, formatReorderStatus, formatDateJST } from "@/lib/patient-utils";
import { normalizeJPPhone } from "@/lib/phone";
import { resolveTenantId, withTenant } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = resolveTenantId(req);
    const patientId = (req.nextUrl.searchParams.get("patientId") || "").trim();
    if (!patientId) {
      return NextResponse.json({ ok: false, message: "missing_patientId" }, { status: 400 });
    }

    // 5テーブル並列取得（intake正規化: patient_name/line_id→patients、reserved_date/time/prescription_menu→reservations）
    const [answererRes, intakeRes, reservationsRes, ordersRes, reordersRes] = await Promise.all([
      withTenant(
        supabaseAdmin
          .from("patients")
          .select("patient_id, name, name_kana, tel, sex, birthday, line_id")
          .eq("patient_id", patientId)
          .limit(1)
          .maybeSingle(),
        tenantId
      ),
      withTenant(
        supabaseAdmin
          .from("intake")
          .select("id, patient_id, reserve_id, status, note, answers, created_at")
          .eq("patient_id", patientId)
          .order("id", { ascending: false })
          .limit(50),
        tenantId
      ),
      withTenant(
        supabaseAdmin
          .from("reservations")
          .select("reserve_id, reserved_date, reserved_time, prescription_menu, status")
          .eq("patient_id", patientId)
          .order("reserved_date", { ascending: false })
          .limit(50),
        tenantId
      ),
      withTenant(
        supabaseAdmin
          .from("orders")
          .select("id, product_code, product_name, amount, paid_at, payment_method, tracking_number, shipping_date, shipping_status, refund_status, created_at")
          .eq("patient_id", patientId)
          .order("created_at", { ascending: false })
          .limit(30),
        tenantId
      ),
      withTenant(
        supabaseAdmin
          .from("reorders")
          .select("id, reorder_number, product_code, status, note, karte_note, created_at, approved_at, paid_at")
          .eq("patient_id", patientId)
          .order("created_at", { ascending: false })
          .limit(10),
        tenantId
      ),
    ]);

    const answerer = answererRes.data;
    const intakes = intakeRes.data || [];
    const reservations = reservationsRes.data || [];
    const orders = ordersRes.data || [];
    const reorders = reordersRes.data || [];

    // reserve_id → reservation のマップ
    const resMap = new Map(reservations.map((r: any) => [r.reserve_id, r]));

    // 患者基本情報（patients テーブルが正、intake は answers のみ参照）
    const latestIntake = intakes[0];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const answers = (latestIntake?.answers as Record<string, any>) || {};
    const patient = {
      id: patientId,
      name: answerer?.name || "",
      kana: answerer?.name_kana || answers?.カナ || answers?.name_kana || "",
      phone: normalizeJPPhone(answerer?.tel || answers?.tel || ""),
      sex: answerer?.sex || answers?.性別 || answers?.sex || "",
      birth: answerer?.birthday || answers?.生年月日 || answers?.birth || "",
      lineId: answerer?.line_id || answers?.line_id || null,
    };

    // 来院履歴: intake（問診本体）+ reorders（再処方カルテ）を統合
    // カルテ重複レコード（note が "再処方" 始まり & reserve_id なし）は除外
    const realIntakes = intakes.filter(i => {
      if (!(i.note || "").startsWith("再処方")) return true;
      // reserve_id があり、reservations にも存在する場合のみ残す
      return i.reserve_id && resMap.has(i.reserve_id);
    });
    const formattedIntakes = [
      ...realIntakes.map(i => {
        const res = i.reserve_id ? resMap.get(i.reserve_id) : null;
        return {
          id: i.id,
          submittedAt: i.created_at || "",
          reservedDate: res?.reserved_date || "",
          reservedTime: res?.reserved_time || "",
          status: i.status || null,
          prescriptionMenu: res?.prescription_menu || "",
          note: i.note || "",
          answers: i.answers || {},
        };
      }),
      // 再処方カルテ（karte_note あり）を来院履歴に追加
      ...reorders
        .filter(r => r.karte_note)
        .map(r => ({
          id: `reorder-${r.id}`,
          submittedAt: r.approved_at || r.paid_at || r.created_at || "",
          reservedDate: "",
          reservedTime: "",
          status: null,
          prescriptionMenu: "",
          note: r.karte_note,
          answers: {},
        })),
    ].sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

    // 購入履歴
    const history = orders.map(o => ({
      id: o.id,
      paidAt: o.paid_at || o.created_at || "",
      productName: formatProductCode(o.product_code),
      productCode: o.product_code || "",
      amount: o.amount || 0,
      paymentMethod: formatPaymentMethod(o.payment_method),
      trackingNumber: o.tracking_number || "",
      shippingDate: o.shipping_date || "",
      refundStatus: o.refund_status || null,
    }));

    // 再処方
    const formattedReorders = reorders.map(r => ({
      id: r.reorder_number || r.id,
      productName: formatProductCode(r.product_code),
      productCode: r.product_code || "",
      status: formatReorderStatus(r.status),
      rawStatus: r.status || "",
      note: r.note || "",
      karteNote: r.karte_note || "",
      createdAt: formatDateJST(r.created_at),
      approvedAt: r.approved_at ? formatDateJST(r.approved_at) : null,
      paidAt: r.paid_at ? formatDateJST(r.paid_at) : null,
    }));

    return NextResponse.json({
      ok: true,
      patient,
      intakes: formattedIntakes,
      history,
      reorders: formattedReorders,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, message: "server_error", detail: msg }, { status: 500 });
  }
}
