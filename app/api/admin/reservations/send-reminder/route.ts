// 診療リマインドLINE一括送信API
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { pushMessage } from "@/lib/line-push";

const REMINDER_MESSAGE = `本日、診療のご予約がございます。

診療時間の詳細につきましては、
マイページよりご確認ください。

診療は、予約時間枠の間に「090-」から始まる番号よりお電話いたします。
知らない番号からの着信を受け取れない設定になっている場合は、
事前にご連絡いただけますと幸いです。

なお、診療時間にご連絡なくご対応いただけなかった場合、
次回以降のご予約が取りづらくなる可能性がございます。

キャンセルや予約内容の変更をご希望の場合は、
必ず事前にマイページよりお手続きをお願いいたします。

本日もどうぞよろしくお願いいたします。`;

export async function POST(req: NextRequest) {
  try {
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { date } = await req.json();
    if (!date) {
      return NextResponse.json({ error: "date required" }, { status: 400 });
    }

    // キャンセル除外のため、reservationsテーブルから有効なreserve_idを取得
    const { data: reservationsData } = await supabaseAdmin
      .from("reservations")
      .select("reserve_id")
      .eq("reserved_date", date)
      .neq("status", "canceled");

    const validReserveIds = new Set(
      (reservationsData || []).map((r: any) => r.reserve_id)
    );

    // intakeテーブルから予約データを取得
    const { data: intakeData, error: intakeError } = await supabaseAdmin
      .from("intake")
      .select("patient_id, patient_name, line_id, reserve_id, reserved_time")
      .eq("reserved_date", date)
      .not("reserved_date", "is", null)
      .order("reserved_time", { ascending: true });

    if (intakeError) {
      return NextResponse.json({ error: "DB error" }, { status: 500 });
    }

    // キャンセル済み除外
    const targets = (intakeData || []).filter((row: any) => {
      if (!row.reserve_id) return true;
      return validReserveIds.has(row.reserve_id);
    });

    // LINE UIDがある患者にのみ送信
    const results: { patient_id: string; patient_name: string; status: "sent" | "no_uid" | "failed" }[] = [];

    for (const patient of targets) {
      if (!patient.line_id) {
        results.push({
          patient_id: patient.patient_id,
          patient_name: patient.patient_name || "",
          status: "no_uid",
        });
        continue;
      }

      try {
        const pushRes = await pushMessage(patient.line_id, [{
          type: "text",
          text: REMINDER_MESSAGE,
        }]);

        results.push({
          patient_id: patient.patient_id,
          patient_name: patient.patient_name || "",
          status: pushRes?.ok ? "sent" : "failed",
        });
      } catch {
        results.push({
          patient_id: patient.patient_id,
          patient_name: patient.patient_name || "",
          status: "failed",
        });
      }
    }

    const sent = results.filter(r => r.status === "sent").length;
    const noUid = results.filter(r => r.status === "no_uid").length;
    const failed = results.filter(r => r.status === "failed").length;

    console.log(`[send-reminder] ${date}: sent=${sent}, no_uid=${noUid}, failed=${failed}`);

    return NextResponse.json({
      ok: true,
      date,
      total: results.length,
      sent,
      noUid,
      failed,
      results,
    });
  } catch (error) {
    console.error("Send reminder error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}
