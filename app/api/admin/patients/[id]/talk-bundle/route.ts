// 患者トーク画面用バンドルAPI（5つのAPIを1リクエストに統合）
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { formatProductCode, formatPaymentMethod, formatReorderStatus, formatDateJST } from "@/lib/patient-utils";
import { resolveTenantId, withTenant } from "@/lib/tenant";

export const dynamic = "force-dynamic";

const MSG_BATCH = 25;

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);
  const { id: patientId } = await params;

  // 全クエリを並列実行（サーバー側で統合）
  const [messagesRes, tagsRes, markRes, fieldsRes, answererRes, allOrdersRes, reordersRes, pendingResvRes, latestResvRes, bankRes, intakeRecordRes] = await Promise.all([
    // メッセージログ（最新25件）
    withTenant(supabaseAdmin
      .from("message_log")
      .select("*")
      .eq("patient_id", patientId)
      .order("sent_at", { ascending: false })
      .limit(MSG_BATCH), tenantId),
    // タグ
    withTenant(supabaseAdmin
      .from("patient_tags")
      .select("*, tag_definitions(*)")
      .eq("patient_id", patientId), tenantId),
    // マーク
    withTenant(supabaseAdmin
      .from("patient_marks")
      .select("*")
      .eq("patient_id", patientId)
      .maybeSingle(), tenantId),
    // 友だち情報欄
    withTenant(supabaseAdmin
      .from("friend_field_values")
      .select("*, friend_field_definitions(*)")
      .eq("patient_id", patientId), tenantId),
    // 患者基本情報
    withTenant(supabaseAdmin
      .from("patients")
      .select("name, name_kana, sex, birthday, line_id, tel")
      .eq("patient_id", patientId)
      .maybeSingle(), tenantId),
    // 決済履歴
    withTenant(supabaseAdmin
      .from("orders")
      .select("id, product_code, amount, payment_method, shipping_date, tracking_number, created_at, postal_code, address, phone, email, refund_status")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false })
      .limit(10), tenantId),
    // 再処方
    withTenant(supabaseAdmin
      .from("reorders")
      .select("id, reorder_number, product_code, status, created_at, approved_at")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false })
      .limit(5), tenantId),
    // 次回予約（未診察）
    withTenant(supabaseAdmin
      .from("reservations")
      .select("reserved_date, reserved_time, status")
      .eq("patient_id", patientId)
      .not("reserved_date", "is", null)
      .not("reserved_time", "is", null)
      .or("status.is.null,status.eq.")
      .order("reserved_date", { ascending: true })
      .order("reserved_time", { ascending: true })
      .limit(1)
      .maybeSingle(), tenantId),
    // 最新予約（キャンセル除外）
    withTenant(supabaseAdmin
      .from("reservations")
      .select("reserved_date, reserved_time, status")
      .eq("patient_id", patientId)
      .not("reserved_date", "is", null)
      .not("reserved_time", "is", null)
      .neq("status", "canceled")
      .order("reserved_date", { ascending: false })
      .order("reserved_time", { ascending: false })
      .limit(1)
      .maybeSingle(), tenantId),
    // 銀行振込待ち
    withTenant(supabaseAdmin
      .from("orders")
      .select("id, product_code, created_at")
      .eq("patient_id", patientId)
      .eq("payment_method", "bank_transfer")
      .eq("status", "pending_confirmation")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(), tenantId),
    // 問診
    withTenant(supabaseAdmin
      .from("intake")
      .select("answers, created_at")
      .eq("patient_id", patientId)
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle(), tenantId),
  ]);

  // メッセージログ: direction補正
  const messages = (messagesRes.data || []).map((m: Record<string, unknown>) => ({
    ...m,
    direction: m.status === "received" ? "incoming" : (["sent", "failed", "no_uid"].includes(m.status as string) ? "outgoing" : (m.direction || "outgoing")),
  }));

  // マーク
  const mark = markRes.data || { patient_id: patientId, mark: "none", note: null };

  // 患者詳細（patient-lookup相当）
  const answerer = answererRes.data;
  const allOrders = allOrdersRes.data;
  const reorders = reordersRes.data;
  const nextReservation = pendingResvRes.data ?? latestResvRes.data;
  const pendingBankTransfer = bankRes.data;
  const intakeRecord = intakeRecordRes.data;

  // answerer_id取得
  const { data: ansIdRow } = await withTenant(
    supabaseAdmin.from("intake").select("answerer_id")
      .eq("patient_id", patientId)
      .not("answerer_id", "is", null)
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle(),
    tenantId
  );
  const intakeAnswererId = ansIdRow?.answerer_id || "";

  // prescription_menu取得
  const { data: latestResvForMenu } = await withTenant(
    supabaseAdmin.from("reservations").select("prescription_menu")
      .eq("patient_id", patientId)
      .not("prescription_menu", "is", null)
      .order("reserved_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    tenantId
  );

  const latestOrder = allOrders?.[0] || null;
  const formattedLatestOrder = latestOrder ? {
    date: latestOrder.shipping_date || latestOrder.created_at?.slice(0, 10) || "-",
    product: formatProductCode(latestOrder.product_code),
    amount: latestOrder.amount ? `¥${latestOrder.amount.toLocaleString()}` : "-",
    payment: formatPaymentMethod(latestOrder.payment_method),
    tracking: latestOrder.tracking_number || "-",
    postal_code: latestOrder.postal_code || "",
    address: latestOrder.address || "",
    phone: latestOrder.phone || "",
    email: latestOrder.email || "",
    refund_status: latestOrder.refund_status || null,
  } : null;

  const formattedReorders = (reorders || []).map((r: { reorder_number: string; product_code: string; status: string; created_at: string }) => ({
    id: r.reorder_number,
    date: formatDateJST(r.created_at),
    product: formatProductCode(r.product_code),
    status: formatReorderStatus(r.status),
  }));

  const orderHistory = (allOrders || []).map((o: { shipping_date?: string; created_at?: string; product_code: string; refund_status?: string }) => ({
    date: o.shipping_date || o.created_at?.slice(0, 10) || "-",
    product: formatProductCode(o.product_code),
    refund_status: o.refund_status || null,
  }));

  let formattedReservation: string | null = null;
  if (nextReservation) {
    const base = `${nextReservation.reserved_date} ${nextReservation.reserved_time}`;
    const st = (nextReservation as { status?: string | null }).status;
    if (st === "OK") formattedReservation = `${base}（診察済み）`;
    else if (st === "NG") formattedReservation = `${base}（NG）`;
    else formattedReservation = base;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const answers = (intakeRecord?.answers as Record<string, any>) || {};
  const hasIntakeAnswers = answers && Object.keys(answers).length > 0
    && (answers.current_disease_yesno || answers.glp_history || answers.med_yesno || answers.allergy_yesno);
  const hasAnswererInfo = answerer && (answerer.name_kana || answerer.sex || answerer.birthday);

  const medicalInfo = hasIntakeAnswers ? {
    hasIntake: true,
    kana: answers?.カナ || answers?.name_kana || answerer?.name_kana || "",
    gender: answers?.性別 || answers?.sex || answerer?.sex || "",
    birthday: answers?.生年月日 || answers?.birth || answerer?.birthday || "",
    medicalHistory: answers?.current_disease_yesno === "yes" ? (answers?.current_disease_detail || "") : "特記事項なし",
    glp1History: answers?.glp_history || "使用歴なし",
    medicationHistory: answers?.med_yesno === "yes" ? (answers?.med_detail || "") : "なし",
    allergies: answers?.allergy_yesno === "yes" ? (answers?.allergy_detail || "") : "アレルギーなし",
    prescriptionMenu: latestResvForMenu?.prescription_menu || "",
  } : hasAnswererInfo ? {
    hasIntake: false,
    kana: answerer?.name_kana || "",
    gender: answerer?.sex || "",
    birthday: answerer?.birthday || "",
    medicalHistory: "",
    glp1History: "",
    medicationHistory: "",
    allergies: "",
    prescriptionMenu: "",
  } : null;

  const pendingBankInfo = pendingBankTransfer ? {
    product: formatProductCode(pendingBankTransfer.product_code),
    date: formatDateJST(pendingBankTransfer.created_at),
  } : null;

  return NextResponse.json({
    // メッセージ
    messages,
    hasMore: messages.length === MSG_BATCH,
    // タグ
    tags: tagsRes.data || [],
    // マーク
    mark,
    // 友だち情報欄
    fields: fieldsRes.data || [],
    // 患者詳細（patient-lookup互換）
    detail: {
      found: true,
      patient: {
        id: patientId,
        name: answerer?.name || "",
        lstep_uid: intakeAnswererId,
      },
      latestOrder: formattedLatestOrder,
      orderHistory,
      reorders: formattedReorders,
      pendingBankTransfer: pendingBankInfo,
      nextReservation: formattedReservation,
      medicalInfo,
      verifiedPhone: answerer?.tel || null,
      registeredAt: intakeRecord?.created_at || null,
    },
  });
}
