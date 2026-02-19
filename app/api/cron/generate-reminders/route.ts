// app/api/cron/generate-reminders/route.ts — 予約リマインド生成Cron（15分間隔）
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveTenantId, withTenant, tenantPayload } from "@/lib/tenant";
import { buildReminderFlex } from "@/lib/reservation-flex";
import {
  isInSendWindow,
  getJSTToday,
  addOneDay,
  formatReservationTime,
  buildReminderMessage,
} from "@/lib/auto-reminder";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  try {
    const tenantId = resolveTenantId(req);
    const now = new Date();

    // 有効なリマインドルールを取得
    const { data: rules, error: rulesError } = await withTenant(
      supabaseAdmin
        .from("reminder_rules")
        .select("*")
        .eq("is_enabled", true),
      tenantId
    );

    if (rulesError) {
      console.error("[generate-reminders] rules query error:", rulesError.message);
      return NextResponse.json({ error: rulesError.message }, { status: 500 });
    }

    if (!rules || rules.length === 0) {
      return NextResponse.json({ ok: true, generated: 0 });
    }

    let totalGenerated = 0;

    for (const rule of rules) {
      try {
        // ★ 固定時刻ルール（fixed_time）
        if (rule.timing_type === "fixed_time") {
          totalGenerated += await handleFixedTimeRule(rule, tenantId);
          continue;
        }

        // ★ 既存ロジック（before_hours / before_days）— 変更なし
        const reminderMs = rule.timing_type === "before_days"
          ? rule.timing_value * 24 * 60 * 60 * 1000
          : rule.timing_value * 60 * 60 * 1000;

        const windowStart = new Date(now.getTime() + reminderMs);
        const windowEnd = new Date(now.getTime() + reminderMs + 15 * 60 * 1000);

        const startDate = windowStart.toISOString().split("T")[0];
        const endDate = windowEnd.toISOString().split("T")[0];

        let query = withTenant(
          supabaseAdmin
            .from("reservations")
            .select("id, patient_id, patient_name, reserved_date, reserved_time, status")
            .neq("status", "canceled")
            .gte("reserved_date", startDate)
            .lte("reserved_date", endDate),
          tenantId
        );

        const { data: reservations } = await query;

        if (!reservations || reservations.length === 0) continue;

        const targetReservations = reservations.filter((r) => {
          const resDateTime = new Date(`${r.reserved_date}T${r.reserved_time}`);
          return resDateTime >= windowStart && resDateTime < windowEnd;
        });

        if (targetReservations.length === 0) continue;

        const reservationIds = targetReservations.map((r) => r.id);
        const { data: sentLogs } = await withTenant(
          supabaseAdmin
            .from("reminder_sent_log")
            .select("reservation_id")
            .eq("rule_id", rule.id)
            .in("reservation_id", reservationIds),
          tenantId
        );

        const sentSet = new Set((sentLogs || []).map((l: any) => l.reservation_id));
        const newReservations = targetReservations.filter((r) => !sentSet.has(r.id));

        if (newReservations.length === 0) continue;

        const patientIds = [...new Set(newReservations.map((r) => r.patient_id))];
        const { data: patients } = await withTenant(
          supabaseAdmin
            .from("patients")
            .select("patient_id, name, line_id")
            .in("patient_id", patientIds),
          tenantId
        );

        const patientMap = new Map<string, { name: string; line_id: string | null }>();
        for (const p of patients || []) {
          patientMap.set(p.patient_id, { name: p.name || "", line_id: p.line_id || null });
        }

        for (const reservation of newReservations) {
          const patient = patientMap.get(reservation.patient_id);
          if (!patient?.line_id) continue;

          const dateStr = formatDateJP(reservation.reserved_date);
          const timeStr = reservation.reserved_time?.substring(0, 5) || "";

          const messageContent = rule.message_template
            .replace(/\{name\}/g, patient.name || reservation.patient_name || "")
            .replace(/\{date\}/g, dateStr)
            .replace(/\{time\}/g, timeStr)
            .replace(/\{patient_id\}/g, reservation.patient_id);

          const reservationTime = new Date(`${reservation.reserved_date}T${reservation.reserved_time}`);
          const sendAt = new Date(reservationTime.getTime() - reminderMs);

          const { data: scheduledMsg } = await supabaseAdmin
            .from("scheduled_messages")
            .insert({
              ...tenantPayload(tenantId),
              patient_id: reservation.patient_id,
              line_uid: patient.line_id,
              message_content: messageContent,
              message_type: "reminder",
              scheduled_at: sendAt.toISOString(),
              status: "scheduled",
              created_by: `reminder_rule_${rule.id}`,
            })
            .select("id")
            .single();

          await supabaseAdmin
            .from("reminder_sent_log")
            .insert({
              ...tenantPayload(tenantId),
              rule_id: rule.id,
              reservation_id: reservation.id,
              scheduled_message_id: scheduledMsg?.id || null,
            });

          totalGenerated++;
        }
      } catch (e: any) {
        console.error(`[generate-reminders] error for rule=${rule.id}:`, e.message);
      }
    }

    console.log(`[generate-reminders] generated=${totalGenerated}`);
    return NextResponse.json({ ok: true, generated: totalGenerated });
  } catch (e: any) {
    console.error("[generate-reminders] cron error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// ★ 固定時刻ルール処理
async function handleFixedTimeRule(
  rule: any,
  tenantId: string | null,
): Promise<number> {
  // 送信時刻ウィンドウ判定（JST基準）
  if (rule.send_hour == null) return 0;
  if (!isInSendWindow(rule.send_hour, rule.send_minute ?? 0)) return 0;

  // 対象日の算出（JST基準）
  const jstToday = getJSTToday();
  const targetDate = rule.target_day_offset === 0
    ? jstToday
    : addOneDay(jstToday);

  // 対象予約を取得
  const { data: reservations } = await withTenant(
    supabaseAdmin
      .from("reservations")
      .select("id, patient_id, patient_name, reserved_date, reserved_time")
      .eq("reserved_date", targetDate)
      .neq("status", "canceled"),
    tenantId
  );

  if (!reservations || reservations.length === 0) return 0;

  // 送信済みチェック
  const reservationIds = reservations.map((r: any) => r.id);
  const { data: sentLogs } = await withTenant(
    supabaseAdmin
      .from("reminder_sent_log")
      .select("reservation_id")
      .eq("rule_id", rule.id)
      .in("reservation_id", reservationIds),
    tenantId
  );

  const sentSet = new Set((sentLogs || []).map((l: any) => l.reservation_id));
  const newReservations = reservations.filter((r: any) => !sentSet.has(r.id));

  if (newReservations.length === 0) return 0;

  // 患者のLINE UIDを取得
  const patientIds = [...new Set(newReservations.map((r: any) => r.patient_id))];
  const { data: patients } = await withTenant(
    supabaseAdmin
      .from("patients")
      .select("patient_id, name, line_id")
      .in("patient_id", patientIds),
    tenantId
  );

  const patientMap = new Map<string, { name: string; line_id: string | null }>();
  for (const p of patients || []) {
    patientMap.set(p.patient_id, { name: p.name || "", line_id: p.line_id || null });
  }

  // scheduled_at は現在時刻（即時送信）
  const scheduledAt = new Date().toISOString();
  let generated = 0;

  for (const reservation of newReservations) {
    const patient = patientMap.get(reservation.patient_id);
    if (!patient?.line_id) continue;

    let messageContent: string;
    let flexJson: any = null;

    if (rule.message_format === "flex") {
      // FLEXメッセージ生成
      const flex = await buildReminderFlex(reservation.reserved_date, reservation.reserved_time, tenantId ?? undefined);
      flexJson = flex.contents;
      messageContent = flex.altText;
    } else {
      // テキストメッセージ: テンプレート変数を置換
      const dateStr = formatDateJP(reservation.reserved_date);
      const timeStr = reservation.reserved_time?.substring(0, 5) || "";
      const formattedTime = formatReservationTime(reservation.reserved_date, reservation.reserved_time);

      messageContent = (rule.message_template || buildReminderMessage(formattedTime))
        .replace(/\{name\}/g, patient.name || reservation.patient_name || "")
        .replace(/\{date\}/g, dateStr)
        .replace(/\{time\}/g, timeStr)
        .replace(/\{patient_id\}/g, reservation.patient_id);
    }

    // scheduled_messages にINSERT
    const { data: scheduledMsg } = await supabaseAdmin
      .from("scheduled_messages")
      .insert({
        ...tenantPayload(tenantId),
        patient_id: reservation.patient_id,
        line_uid: patient.line_id,
        message_content: messageContent,
        message_type: "reminder",
        scheduled_at: scheduledAt,
        status: "scheduled",
        created_by: `reminder_rule_${rule.id}`,
        flex_json: flexJson,
      })
      .select("id")
      .single();

    // 送信ログに記録（二重送信防止）
    await supabaseAdmin
      .from("reminder_sent_log")
      .insert({
        ...tenantPayload(tenantId),
        rule_id: rule.id,
        reservation_id: reservation.id,
        scheduled_message_id: scheduledMsg?.id || null,
      });

    generated++;
  }

  if (generated > 0) {
    console.log(`[generate-reminders] fixed_time rule=${rule.id} (${rule.send_hour}:${String(rule.send_minute ?? 0).padStart(2, "0")}): generated=${generated}`);
  }

  return generated;
}

/** 日本語日付フォーマット */
function formatDateJP(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00+09:00");
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const dow = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];
  return `${y}年${m}月${day}日(${dow})`;
}
