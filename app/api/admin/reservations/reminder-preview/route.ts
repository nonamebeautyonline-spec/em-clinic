import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyAdminAuth } from "@/lib/admin-auth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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

    const body = await req.json();
    const { date } = body;

    if (!date) {
      return NextResponse.json({ error: "日付が必要です" }, { status: 400 });
    }

    console.log(`[ReminderPreview] Fetching reservations for date: ${date}`);

    // キャンセル除外のため、reservationsテーブルから有効なreserve_idを取得
    const { data: reservationsData } = await supabase
      .from("reservations")
      .select("reserve_id")
      .eq("reserved_date", date)
      .neq("status", "canceled");

    const validReserveIds = reservationsData
      ? new Set(reservationsData.map((r: any) => r.reserve_id))
      : new Set();

    console.log(`[ReminderPreview] Valid (non-canceled) reservations: ${validReserveIds.size}`);

    // intakeテーブルから予約データを取得
    const { data: intakeData, error: intakeError } = await supabase
      .from("intake")
      .select("*")
      .eq("reserved_date", date)
      .not("reserved_date", "is", null)
      .order("reserved_time", { ascending: true });

    if (intakeError) {
      console.error("Supabase intake error:", intakeError);
      return NextResponse.json(
        { error: "Database error", details: intakeError.message },
        { status: 500 }
      );
    }

    // キャンセル済み予約を除外
    const filteredData = intakeData.filter((row: any) => {
      if (!row.reserve_id) return true; // 予約なし問診は含める
      return validReserveIds.has(row.reserve_id);
    });

    console.log(`[ReminderPreview] Filtered ${intakeData.length} -> ${filteredData.length} (excluded canceled)`);

    const reminderList: ReminderData[] = [];
    const errors: string[] = [];

    for (const row of filteredData) {
      const lstepId = row.answerer_id || "";
      const lineUid = row.line_id || "";
      const patientName = row.patient_name || "";
      const reservedTime = row.reserved_time || "";
      const phone = row.phone || "";
      const doctorStatus = row.status || ""; // 前回診察ステータス（OK/NG）
      const callStatus = row.call_status || ""; // 電話ステータス（不通など）
      const prescriptionMenu = row.prescription_menu || ""; // 処方メニュー

      if (!lstepId) {
        errors.push(`患者ID ${row.patient_id}: LステップIDがありません`);
      }

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
