// app/api/cron/generate-reminders/route.ts — リマインド送信Cron（15分間隔）
// ルールの送信時刻が到来していたら直接LINE送信 → 履歴記録
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { withTenant, tenantPayload } from "@/lib/tenant";
import { pushMessage } from "@/lib/line-push";
import { buildReminderFlex } from "@/lib/reservation-flex";
import {
  getJSTToday,
  addOneDay,
  formatReservationTime,
  buildReminderMessage,
} from "@/lib/auto-reminder";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(_req: NextRequest) {
  try {
    const { data: rules, error: rulesError } = await supabaseAdmin
      .from("reminder_rules")
      .select("*")
      .eq("is_enabled", true);

    if (rulesError) {
      console.error("[reminders] rules query error:", rulesError.message);
      return NextResponse.json({ error: rulesError.message }, { status: 500 });
    }

    if (!rules || rules.length === 0) {
      return NextResponse.json({ ok: true, sent: 0 });
    }

    let totalSent = 0;

    for (const rule of rules) {
      const tenantId: string | null = rule.tenant_id || null;
      try {
        if (rule.timing_type === "fixed_time") {
          totalSent += await processFixedTimeRule(rule, tenantId);
        } else {
          totalSent += await processRelativeRule(rule, tenantId);
        }
      } catch (e: any) {
        console.error(`[reminders] error rule=${rule.id}:`, e.message);
      }
    }

    if (totalSent > 0) console.log(`[reminders] sent=${totalSent}`);
    return NextResponse.json({ ok: true, sent: totalSent });
  } catch (e: any) {
    console.error("[reminders] cron error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// ── 固定時刻ルール ──────────────────────────
async function processFixedTimeRule(rule: any, tenantId: string | null): Promise<number> {
  if (rule.send_hour == null) return 0;

  // 送信時刻から15分以内のみ実行（cron間隔=15分、送信後の新規予約に誤送信しない）
  const jstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const nowMinutes = jstNow.getUTCHours() * 60 + jstNow.getUTCMinutes();
  const sendMinutes = rule.send_hour * 60 + (rule.send_minute ?? 0);
  if (nowMinutes < sendMinutes || nowMinutes >= sendMinutes + 15) return 0;

  const jstToday = getJSTToday();
  const targetDate = rule.target_day_offset === 0 ? jstToday : addOneDay(jstToday);

  return await sendReminders(rule, tenantId, targetDate);
}

// ── 相対時間ルール（before_hours / before_days）──────
async function processRelativeRule(rule: any, tenantId: string | null): Promise<number> {
  const now = Date.now();
  const reminderMs = rule.timing_type === "before_days"
    ? rule.timing_value * 24 * 60 * 60 * 1000
    : rule.timing_value * 60 * 60 * 1000;

  // reminderMs 先〜+24h の予約を対象
  const windowStart = new Date(now + reminderMs);
  const windowEnd = new Date(now + reminderMs + 24 * 60 * 60 * 1000);
  const startDate = windowStart.toISOString().split("T")[0];
  const endDate = windowEnd.toISOString().split("T")[0];

  const { data: reservations } = await withTenant(
    supabaseAdmin
      .from("reservations")
      .select("id, patient_id, patient_name, reserved_date, reserved_time")
      .neq("status", "canceled")
      .gte("reserved_date", startDate)
      .lte("reserved_date", endDate),
    tenantId
  );

  if (!reservations?.length) return 0;

  // 送信時刻が到来済みの予約だけフィルタ
  const nowDate = new Date(now);
  const targetReservations = reservations.filter((r) => {
    const resTime = new Date(`${r.reserved_date}T${r.reserved_time}+09:00`);
    const sendAt = new Date(resTime.getTime() - reminderMs);
    return sendAt <= nowDate;
  });

  if (!targetReservations.length) return 0;

  return await sendForReservations(rule, tenantId, targetReservations);
}

// ── 共通: 対象日の予約を取得 → 未送信分を送信 ──────
async function sendReminders(rule: any, tenantId: string | null, targetDate: string): Promise<number> {
  const { data: reservations } = await withTenant(
    supabaseAdmin
      .from("reservations")
      .select("id, patient_id, patient_name, reserved_date, reserved_time")
      .eq("reserved_date", targetDate)
      .neq("status", "canceled"),
    tenantId
  );

  if (!reservations?.length) return 0;

  return await sendForReservations(rule, tenantId, reservations);
}

// ── 共通: 予約リストに対してLINE送信 ──────────────
async function sendForReservations(rule: any, tenantId: string | null, reservations: any[]): Promise<number> {
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
  const unsent = reservations.filter((r: any) => !sentSet.has(r.id));
  if (!unsent.length) return 0;

  // 患者のLINE UID取得
  const patientIds = [...new Set(unsent.map((r: any) => r.patient_id))];
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

  let sent = 0;

  for (const reservation of unsent) {
    const patient = patientMap.get(reservation.patient_id);
    if (!patient?.line_id) continue;

    // メッセージ生成
    let messages: any[];
    if (rule.message_format === "flex") {
      const flex = await buildReminderFlex(reservation.reserved_date, reservation.reserved_time, tenantId ?? undefined);
      messages = [{ type: "flex", altText: flex.altText, contents: flex.contents }];
    } else {
      const dateStr = formatDateJP(reservation.reserved_date);
      const timeStr = reservation.reserved_time?.substring(0, 5) || "";
      const formattedTime = formatReservationTime(reservation.reserved_date, reservation.reserved_time);
      const text = (rule.message_template || buildReminderMessage(formattedTime))
        .replace(/\{name\}/g, patient.name || reservation.patient_name || "")
        .replace(/\{date\}/g, dateStr)
        .replace(/\{time\}/g, timeStr)
        .replace(/\{patient_id\}/g, reservation.patient_id);
      messages = [{ type: "text", text }];
    }

    // LINE送信
    const res = await pushMessage(patient.line_id, messages, tenantId ?? undefined);
    const ok = res?.ok ?? false;

    // 履歴記録（成功・失敗問わず sent_log に入れて二重送信を防止）
    await supabaseAdmin
      .from("reminder_sent_log")
      .insert({
        ...tenantPayload(tenantId),
        rule_id: rule.id,
        reservation_id: reservation.id,
      });

    if (ok) {
      // メッセージログ
      await supabaseAdmin.from("message_log").insert({
        ...tenantPayload(tenantId),
        patient_id: reservation.patient_id,
        line_uid: patient.line_id,
        message_type: "reminder",
        content: messages[0].type === "text" ? messages[0].text : messages[0].altText,
        flex_json: messages[0].type === "flex" ? messages[0].contents : null,
        status: "sent",
        direction: "outgoing",
      });
      sent++;
    } else {
      console.error(`[reminders] LINE送信失敗 rule=${rule.id} reservation=${reservation.id}`);
    }
  }

  return sent;
}

function formatDateJP(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00+09:00");
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const dow = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];
  return `${y}年${m}月${day}日(${dow})`;
}
