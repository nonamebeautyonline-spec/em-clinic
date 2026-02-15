import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant } from "@/lib/tenant";

interface ReminderData {
  lstep_id: string;
  line_uid: string;
  patient_id: string;
  patient_name: string;
  reserved_time: string;
  phone: string;
  message: string;
  doctor_status: string; // 前回診察：OK/NG
  call_status: string; // 電話状態：不通など
  prescription_menu: string; // 処方メニュー
}

export async function POST(req: NextRequest) {
  try {
    // 認証チェック（クッキーまたはBearerトークン）
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = resolveTenantId(req);

    const body = await req.json();
    const { date } = body;

    if (!date) {
      return NextResponse.json({ error: "日付が必要です" }, { status: 400 });
    }

    console.log(`[ReminderPreview] Fetching reservations for date: ${date}`);

    // reservationsテーブルから予約データを直接取得（キャンセル除外）
    const { data: resvData, error: resvError } = await withTenant(
      supabaseAdmin
        .from("reservations")
        .select("reserve_id, patient_id, reserved_time, prescription_menu, status")
        .eq("reserved_date", date)
        .neq("status", "canceled")
        .order("reserved_time", { ascending: true }),
      tenantId
    );

    if (resvError) {
      console.error("Supabase reservations error:", resvError);
      return NextResponse.json(
        { error: "Database error", details: resvError.message },
        { status: 500 }
      );
    }

    console.log(`[ReminderPreview] Reservations (non-canceled): ${(resvData || []).length}`);

    // patientsテーブルからpatient_name, line_idを取得
    const patientIds = [...new Set((resvData || []).map((r: any) => r.patient_id).filter(Boolean))];
    const pMap = new Map<string, { name: string; line_id: string }>();
    if (patientIds.length > 0) {
      const { data: pData } = await withTenant(
        supabaseAdmin
          .from("patients")
          .select("patient_id, name, line_id")
          .in("patient_id", patientIds),
        tenantId
      );
      for (const p of pData || []) {
        pMap.set(p.patient_id, { name: p.name || "", line_id: p.line_id || "" });
      }
    }

    // intakeからcall_status, phone, answerer_idを取得（reserve_id で紐付け）
    const reserveIds = (resvData || []).map((r: any) => r.reserve_id).filter(Boolean);
    const intakeMap = new Map<string, { call_status: string; phone: string; answerer_id: string }>();
    if (reserveIds.length > 0) {
      const { data: intakeData } = await withTenant(
        supabaseAdmin
          .from("intake")
          .select("reserve_id, call_status, phone, answerer_id")
          .in("reserve_id", reserveIds),
        tenantId
      );
      for (const row of intakeData || []) {
        if (row.reserve_id && !intakeMap.has(row.reserve_id)) {
          intakeMap.set(row.reserve_id, {
            call_status: row.call_status || "",
            phone: row.phone || "",
            answerer_id: row.answerer_id || "",
          });
        }
      }
    }

    const reminderList: ReminderData[] = [];
    const errors: string[] = [];

    for (const row of resvData || []) {
      const patient = pMap.get(row.patient_id);
      const intake = intakeMap.get(row.reserve_id);

      const lstepId = intake?.answerer_id || "";
      const lineUid = patient?.line_id || "";
      const patientName = patient?.name || "";
      const reservedTime = row.reserved_time || "";
      const phone = intake?.phone || "";
      const doctorStatus = row.status || ""; // 前回診察ステータス（OK/NG）
      const callStatus = intake?.call_status || ""; // 電話ステータス（不通など）
      const prescriptionMenu = row.prescription_menu || ""; // 処方メニュー

      // リマインドメッセージを生成
      const timeStr = reservedTime ? reservedTime.slice(0, 5) : ""; // HH:MM
      const message = `本日${timeStr}にご予約いただいている${patientName}様へ。診療のお時間が近づいてまいりました。お待ちしております。`;

      reminderList.push({
        lstep_id: lstepId,
        line_uid: lineUid,
        patient_id: row.patient_id,
        patient_name: patientName,
        reserved_time: reservedTime,
        phone: phone,
        message: message,
        doctor_status: doctorStatus,
        call_status: callStatus,
        prescription_menu: prescriptionMenu,
      });
    }

    return NextResponse.json({
      date: date,
      reminders: reminderList,
      total: reminderList.length,
      errors: errors,
    });
  } catch (error) {
    console.error("[ReminderPreview] API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}
