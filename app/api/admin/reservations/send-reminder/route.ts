// 診療リマインドLINE一括送信API
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { pushMessage } from "@/lib/line-push";

// 予約時間を "2026/2/8 13:00-13:15" 形式にフォーマット
function formatReservationTime(dateStr: string, timeStr: string): string {
  // dateStr: "2026-02-08", timeStr: "13:00:00"
  const [y, m, d] = dateStr.split("-");
  const hhmm = timeStr.slice(0, 5); // "13:00"
  const [hh, mm] = hhmm.split(":").map(Number);
  // 15分後の終了時間
  const endMin = mm + 15;
  const endHH = endMin >= 60 ? hh + 1 : hh;
  const endMM = endMin >= 60 ? endMin - 60 : endMin;
  const endTime = `${endHH}:${String(endMM).padStart(2, "0")}`;
  return `${y}/${Number(m)}/${Number(d)} ${hhmm}-${endTime}`;
}

function buildReminderMessage(reservationTime: string): string {
  return `本日、診療のご予約がございます。

予約日時：${reservationTime}

詳細につきましてはマイページよりご確認ください。

診療は、予約時間枠の間に「090-」から始まる番号よりお電話いたします。
知らない番号からの着信を受け取れない設定になっている場合は、
事前にご連絡いただけますと幸いです。

なお、診療時間にご連絡なくご対応いただけなかった場合、
次回以降のご予約が取りづらくなる可能性がございます。

キャンセルや予約内容の変更をご希望の場合は、
必ず事前にマイページよりお手続きをお願いいたします。

本日もどうぞよろしくお願いいたします。`;
}

// 対象患者を取得（共通）
async function getTargetPatients(date: string) {
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

  if (intakeError) throw new Error("DB error");

  // キャンセル済み除外
  return (intakeData || []).filter((row: any) => {
    if (!row.reserve_id) return true;
    return validReserveIds.has(row.reserve_id);
  });
}

// GET: プレビュー（送信対象者リスト＋メッセージサンプル）
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  if (!date) return NextResponse.json({ error: "date required" }, { status: 400 });

  try {
    const targets = await getTargetPatients(date);

    const patients = targets.map((p: any) => ({
      patient_id: p.patient_id,
      patient_name: p.patient_name || "",
      line_id: p.line_id || null,
      reserved_time: p.reserved_time || "",
      formatted_time: p.reserved_time ? formatReservationTime(date, p.reserved_time) : "",
    }));

    const sendable = patients.filter((p: any) => p.line_id);
    const noUid = patients.filter((p: any) => !p.line_id);

    // サンプルメッセージ（最初の患者の時間で生成）
    const sampleTime = sendable.length > 0 ? sendable[0].formatted_time : formatReservationTime(date, "13:00:00");
    const sampleMessage = buildReminderMessage(sampleTime);

    return NextResponse.json({
      patients,
      summary: {
        total: patients.length,
        sendable: sendable.length,
        no_uid: noUid.length,
      },
      sampleMessage,
    });
  } catch (e) {
    console.error("[send-reminder] preview error:", e);
    return NextResponse.json({ error: "取得エラー" }, { status: 500 });
  }
}

// POST: 一斉送信実行
export async function POST(req: NextRequest) {
  try {
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { date, testOnly } = await req.json();
    if (!date) {
      return NextResponse.json({ error: "date required" }, { status: 400 });
    }

    const targets = await getTargetPatients(date);

    // テストモード: 管理者（PID: 20251200128）にサンプルメッセージを送信
    // 当日の予約がなくても送信可能
    const TEST_PID = "20251200128";
    let sendTargets;
    if (testOnly) {
      const testInTargets = targets.find((p: any) => p.patient_id === TEST_PID);
      if (testInTargets) {
        sendTargets = [testInTargets];
      } else {
        // 予約に含まれていなくても intake から LINE ID を取得して送信
        const { data: testIntake } = await supabaseAdmin
          .from("intake")
          .select("patient_id, patient_name, line_id")
          .eq("patient_id", TEST_PID)
          .limit(1)
          .maybeSingle();
        if (!testIntake?.line_id) {
          return NextResponse.json({
            error: `テスト対象 (PID: ${TEST_PID}) のLINE IDが見つかりません`,
          }, { status: 400 });
        }
        sendTargets = [{
          patient_id: testIntake.patient_id,
          patient_name: testIntake.patient_name || "",
          line_id: testIntake.line_id,
          reserved_time: "13:00:00", // サンプル時間
        }];
      }
    } else {
      sendTargets = targets;
    }

    const results: { patient_id: string; patient_name: string; status: "sent" | "no_uid" | "failed" }[] = [];

    for (const patient of sendTargets) {
      if (!patient.line_id) {
        results.push({
          patient_id: patient.patient_id,
          patient_name: patient.patient_name || "",
          status: "no_uid",
        });
        continue;
      }

      // 予約時間を差し込んだメッセージを生成
      const formattedTime = patient.reserved_time
        ? formatReservationTime(date, patient.reserved_time)
        : "";
      const message = buildReminderMessage(formattedTime);

      try {
        const pushRes = await pushMessage(patient.line_id, [{
          type: "text",
          text: message,
        }]);

        const status = pushRes?.ok ? "sent" : "failed";
        results.push({
          patient_id: patient.patient_id,
          patient_name: patient.patient_name || "",
          status,
        });

        // メッセージログ記録
        await supabaseAdmin.from("message_log").insert({
          patient_id: patient.patient_id,
          line_uid: patient.line_id,
          direction: "outgoing",
          event_type: "message",
          message_type: "reminder",
          content: message,
          status,
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

    console.log(`[send-reminder] ${date}${testOnly ? " (TEST)" : ""}: sent=${sent}, no_uid=${noUid}, failed=${failed}`);

    return NextResponse.json({
      ok: true,
      date,
      testOnly: !!testOnly,
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
