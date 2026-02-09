// 患者バンドルAPI（Supabase直接取得）
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { formatProductCode, formatPaymentMethod, formatReorderStatus, formatDateJST } from "@/lib/patient-utils";
import { normalizeJPPhone } from "@/lib/phone";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const patientId = (req.nextUrl.searchParams.get("patientId") || "").trim();
    if (!patientId) {
      return NextResponse.json({ ok: false, message: "missing_patientId" }, { status: 400 });
    }

    // 4テーブル並列取得
    const [answererRes, intakeRes, ordersRes, reordersRes] = await Promise.all([
      supabaseAdmin
        .from("answerers")
        .select("patient_id, name, name_kana, tel, sex, birthday, line_id")
        .eq("patient_id", patientId)
        .limit(1)
        .maybeSingle(),
      supabaseAdmin
        .from("intake")
        .select("id, patient_id, patient_name, status, note, prescription_menu, answers, reserved_date, reserved_time, created_at, line_id")
        .eq("patient_id", patientId)
        .order("id", { ascending: false })
        .limit(50),
      supabaseAdmin
        .from("orders")
        .select("id, product_code, product_name, amount, paid_at, payment_method, tracking_number, shipping_date, shipping_status, refund_status, created_at")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false })
        .limit(30),
      supabaseAdmin
        .from("reorders")
        .select("id, gas_row_number, product_code, status, note, karte_note, created_at, approved_at, paid_at")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    const answerer = answererRes.data;
    const intakes = intakeRes.data || [];
    const orders = ordersRes.data || [];
    const reorders = reordersRes.data || [];

    // 患者基本情報
    const latestIntake = intakes[0];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const answers = (latestIntake?.answers as Record<string, any>) || {};
    const patient = {
      id: patientId,
      name: answerer?.name || latestIntake?.patient_name || "",
      kana: answerer?.name_kana || answers?.カナ || answers?.name_kana || "",
      phone: normalizeJPPhone(answerer?.tel || answers?.tel || ""),
      sex: answerer?.sex || answers?.性別 || answers?.sex || "",
      birth: answerer?.birthday || answers?.生年月日 || answers?.birth || "",
      lineId: answerer?.line_id || latestIntake?.line_id || answers?.line_id || null,
    };

    // 来院履歴: intake（問診本体）+ reorders（再処方カルテ）を統合
    // カルテ重複レコード（note が "再処方" 始まり & reserve_id なし）は除外
    const realIntakes = intakes.filter(i => !(i.note || "").startsWith("再処方") || i.reserved_date);
    const formattedIntakes = [
      ...realIntakes.map(i => ({
        id: i.id,
        submittedAt: i.created_at || "",
        reservedDate: i.reserved_date || "",
        reservedTime: i.reserved_time || "",
        status: i.status || null,
        prescriptionMenu: i.prescription_menu || "",
        note: i.note || "",
        answers: i.answers || {},
      })),
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
      id: r.gas_row_number || r.id,
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
