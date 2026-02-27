// app/api/admin/reservations/calendar/route.ts
// カレンダービュー用の予約一覧API
// 指定期間（start〜end）の予約を医師名・患者名付きで返す

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant } from "@/lib/tenant";

export async function GET(req: NextRequest) {
  try {
    // 認証チェック
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = resolveTenantId(req);

    // クエリパラメータ取得
    const searchParams = req.nextUrl.searchParams;
    const start = searchParams.get("start"); // ISO日付 YYYY-MM-DD
    const end = searchParams.get("end"); // ISO日付 YYYY-MM-DD

    if (!start || !end) {
      return NextResponse.json(
        { error: "start と end パラメータは必須です" },
        { status: 400 }
      );
    }

    // 日付フォーマットバリデーション
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(start) || !dateRegex.test(end)) {
      return NextResponse.json(
        { error: "日付はYYYY-MM-DD形式で指定してください" },
        { status: 400 }
      );
    }

    // 予約データ取得（指定期間）
    const { data: reservations, error: resvError } = await withTenant(
      supabaseAdmin
        .from("reservations")
        .select("*")
        .gte("reserved_date", start)
        .lte("reserved_date", end)
        .order("reserved_date", { ascending: true })
        .order("reserved_time", { ascending: true })
        .limit(10000),
      tenantId
    );

    if (resvError) {
      console.error("[Calendar API] reservations取得エラー:", resvError);
      return NextResponse.json(
        { error: "Database error", details: resvError.message },
        { status: 500 }
      );
    }

    // 患者情報を一括取得
    const patientIds = [
      ...new Set(
        (reservations || []).map((r: any) => r.patient_id).filter(Boolean)
      ),
    ];
    const patientMap = new Map<string, { name: string; tel: string }>();
    if (patientIds.length > 0) {
      const { data: patients } = await withTenant(
        supabaseAdmin
          .from("patients")
          .select("patient_id, name, tel")
          .in("patient_id", patientIds),
        tenantId
      );
      for (const p of patients || []) {
        patientMap.set(p.patient_id, {
          name: p.name || "",
          tel: p.tel || "",
        });
      }
    }

    // 医師情報を一括取得
    const doctorIds = [
      ...new Set(
        (reservations || []).map((r: any) => r.doctor_id).filter(Boolean)
      ),
    ];
    const doctorMap = new Map<string, string>();
    if (doctorIds.length > 0) {
      const { data: doctors } = await withTenant(
        supabaseAdmin
          .from("doctors")
          .select("doctor_id, doctor_name")
          .in("doctor_id", doctorIds),
        tenantId
      );
      for (const d of doctors || []) {
        doctorMap.set(d.doctor_id, d.doctor_name || "");
      }
    }

    // レスポンス整形
    const calendarEvents = (reservations || []).map((r: any) => {
      const patient = patientMap.get(r.patient_id);
      return {
        id: r.id || r.reserve_id,
        reserve_id: r.reserve_id,
        patient_id: r.patient_id,
        patient_name: r.patient_name || patient?.name || "",
        patient_tel: patient?.tel || "",
        doctor_id: r.doctor_id || "",
        doctor_name: doctorMap.get(r.doctor_id) || "",
        reserved_date: r.reserved_date,
        reserved_time: formatTime(r.reserved_time),
        status: r.status || "pending",
        prescription_menu: r.prescription_menu || "",
      };
    });

    return NextResponse.json({
      ok: true,
      start,
      end,
      events: calendarEvents,
    });
  } catch (error) {
    console.error("[Calendar API] エラー:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}

// TIME型（"HH:MM:SS"）を "HH:MM" に変換
function formatTime(time: string | null): string {
  if (!time) return "";
  const match = time.match(/^(\d{2}):(\d{2})/);
  if (match) return `${match[1]}:${match[2]}`;
  return time;
}
