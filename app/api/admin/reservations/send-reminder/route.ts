// 診療リマインドLINE一括送信API
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { pushMessage } from "@/lib/line-push";
import { resolveTenantId, withTenant, tenantPayload } from "@/lib/tenant";
import { formatReservationTime, buildReminderMessage } from "@/lib/auto-reminder";
import { parseBody } from "@/lib/validations/helpers";
import { sendReminderSchema } from "@/lib/validations/admin-operations";

// 対象患者を取得（共通）
async function getTargetPatients(date: string, tenantId: string | null) {
  // reservationsテーブルから有効な予約を直接取得（キャンセル除外）
  const { data: reservationsData, error: resvError } = await withTenant(
    supabaseAdmin
      .from("reservations")
      .select("reserve_id, patient_id, reserved_time")
      .eq("reserved_date", date)
      .neq("status", "canceled")
      .order("reserved_time", { ascending: true }),
    tenantId
  );

  if (resvError) throw new Error("DB error");

  // patientsテーブルからpatient_name, line_idを取得
  const patientIds = [...new Set((reservationsData || []).map((r: any) => r.patient_id).filter(Boolean))];
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

  return (reservationsData || []).map((r: any) => {
    const patient = pMap.get(r.patient_id);
    return {
      patient_id: r.patient_id,
      patient_name: patient?.name || "",
      line_id: patient?.line_id || "",
      reserve_id: r.reserve_id,
      reserved_time: r.reserved_time,
    };
  });
}

// GET: プレビュー（送信対象者リスト＋メッセージサンプル）
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  if (!date) return NextResponse.json({ error: "date required" }, { status: 400 });

  try {
    const targets = await getTargetPatients(date, tenantId);

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

    const tenantId = resolveTenantId(req);

    const parsed = await parseBody(req, sendReminderSchema);
    if ("error" in parsed) return parsed.error;
    const { date, testOnly, patient_ids } = parsed.data;

    const targets = await getTargetPatients(date, tenantId);

    // テストモード: 管理者（PID: 20251200128）にサンプルメッセージを送信
    // 当日の予約がなくても送信可能
    const TEST_PID = "20251200128";
    let sendTargets;
    if (testOnly) {
      const testInTargets = targets.find((p: any) => p.patient_id === TEST_PID);
      if (testInTargets) {
        sendTargets = [testInTargets];
      } else {
        // 予約に含まれていなくても patients から LINE ID を取得して送信
        const { data: testPatient } = await withTenant(
          supabaseAdmin
            .from("patients")
            .select("patient_id, name, line_id")
            .eq("patient_id", TEST_PID),
          tenantId
        ).maybeSingle();
        if (!testPatient?.line_id) {
          return NextResponse.json({
            error: `テスト対象 (PID: ${TEST_PID}) のLINE IDが見つかりません`,
          }, { status: 400 });
        }
        sendTargets = [{
          patient_id: testPatient.patient_id,
          patient_name: testPatient.name || "",
          line_id: testPatient.line_id,
          reserved_time: "13:00:00", // サンプル時間
        }];
      }
    } else if (patient_ids && Array.isArray(patient_ids) && patient_ids.length > 0) {
      // チェックされた患者のみ送信
      const pidSet = new Set(patient_ids);
      sendTargets = targets.filter((p: any) => pidSet.has(p.patient_id));
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
        }], tenantId ?? undefined);

        const status = pushRes?.ok ? "sent" : "failed";
        results.push({
          patient_id: patient.patient_id,
          patient_name: patient.patient_name || "",
          status,
        });

        // メッセージログ記録
        await supabaseAdmin.from("message_log").insert({
          ...tenantPayload(tenantId),
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
