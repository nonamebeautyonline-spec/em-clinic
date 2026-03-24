// app/api/cron/generate-reminders/route.ts
// vercel.jsonで送信時刻にcron設定 → 呼ばれたら即送信
import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { withTenant, tenantPayload } from "@/lib/tenant";
import { pushMessage } from "@/lib/line-push";
import { buildReminderFlex } from "@/lib/reservation-flex";
import { notifyCronFailure } from "@/lib/notifications/cron-failure";
import {
  getJSTToday,
  addOneDay,
  addDays,
  formatReservationTime,
  buildReminderMessage,
  isInSendWindow,
  isReservationInHoursWindow,
} from "@/lib/auto-reminder";
import { acquireLock } from "@/lib/distributed-lock";

// リマインダールールの型定義
interface ReminderRule {
  id: number;
  tenant_id: string | null;
  timing_type: "before_hours" | "before_days" | "fixed_time";
  timing_value: number;
  target_day_offset: number;
  send_hour: number | null;
  send_minute: number | null;
  is_enabled: boolean;
  message_format: string;
  message_template: string | null;
}

// 予約レコードの型定義
interface ReservationRow {
  id: string;
  patient_id: string;
  patient_name: string;
  reserved_date: string;
  reserved_time: string;
}

// 送信済みログの型定義
interface SentLogRow {
  reservation_id: string;
}

// 患者レコードの型定義
interface PatientRow {
  patient_id: string;
  name: string;
  line_id: string | null;
}

// pushMessage の引数型を抽出
type LineMessage = Parameters<typeof pushMessage>[1][number];

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BATCH_SIZE = 10;

export async function GET(req: NextRequest) {
  // Vercel Cron認証
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return unauthorized();
  }

  // 排他制御: 同時実行を防止
  const lock = await acquireLock("cron:generate-reminders", 55);
  if (!lock.acquired) {
    return NextResponse.json({ ok: true, skipped: "別のプロセスが実行中" });
  }

  try {
    // ?type=relative → before_hours/before_days ルールを処理
    // ?offset=0/1 → fixed_time ルールを処理（後方互換）
    const typeParam = req.nextUrl.searchParams.get("type");
    const offsetParam = req.nextUrl.searchParams.get("offset");

    let query = supabaseAdmin
      .from("reminder_rules")
      .select("*")
      .eq("is_enabled", true);

    if (typeParam === "relative") {
      // before_hours / before_days のみ取得
      query = query.in("timing_type", ["before_hours", "before_days"]);
    } else if (offsetParam != null) {
      // 従来の fixed_time ルール（後方互換）
      query = query.eq("target_day_offset", Number(offsetParam));
    }

    const { data: rules, error: rulesError } = await query;

    if (rulesError) {
      console.error("[reminders] rules query error:", rulesError.message);
      return serverError(rulesError.message);
    }

    if (!rules || rules.length === 0) {
      return NextResponse.json({ ok: true, sent: 0 });
    }

    let totalSent = 0;

    for (const rule of rules as ReminderRule[]) {
      const tenantId: string | null = rule.tenant_id || null;
      try {
        if (rule.timing_type === "before_hours") {
          // N時間前: 予約日時ベースでフィルタ
          totalSent += await sendRelativeReminders(rule, tenantId);
        } else if (rule.timing_type === "before_days") {
          // N日前: 対象日を計算して送信（send_hour/send_minuteで時刻制御）
          if (rule.send_hour != null && rule.send_minute != null) {
            if (!isInSendWindow(rule.send_hour, rule.send_minute)) continue;
          }
          const targetDate = addDays(getJSTToday(), rule.timing_value);
          totalSent += await sendReminders(rule, tenantId, targetDate);
        } else {
          // fixed_time: 従来通り offset ベース
          const targetDate = getTargetDate(rule);
          totalSent += await sendReminders(rule, tenantId, targetDate);
        }
      } catch (e) {
        console.error(`[reminders] error rule=${rule.id}:`, (e as Error).message);
      }
    }

    if (totalSent > 0) console.log(`[reminders] sent=${totalSent}`);
    return NextResponse.json({ ok: true, sent: totalSent });
  } catch (e) {
    console.error("[reminders] cron error:", e);
    notifyCronFailure("generate-reminders", e).catch(() => {});
    return serverError((e as Error).message);
  } finally {
    await lock.release();
  }
}

/** ルールの target_day_offset から対象日を算出 */
function getTargetDate(rule: ReminderRule): string {
  const today = getJSTToday();
  return rule.target_day_offset === 0 ? today : addOneDay(today);
}

/** 対象日の予約を取得 → 未送信分を送信 */
async function sendReminders(rule: ReminderRule, tenantId: string | null, targetDate: string): Promise<number> {
  const { data: reservations } = await withTenant(
    supabaseAdmin
      .from("reservations")
      .select("id, patient_id, patient_name, reserved_date, reserved_time")
      .eq("reserved_date", targetDate)
      .neq("status", "canceled"),
    tenantId
  );

  if (!reservations?.length) return 0;

  // 送信済みチェック（予約日も一致するもののみ送信済みとみなす）
  const reservationIds = reservations.map((r: ReservationRow) => r.id);
  const { data: sentLogs } = await withTenant(
    supabaseAdmin
      .from("reminder_sent_log")
      .select("reservation_id")
      .eq("rule_id", rule.id)
      .eq("reserved_date", targetDate)
      .in("reservation_id", reservationIds),
    tenantId
  );
  const sentSet = new Set((sentLogs || []).map((l: SentLogRow) => l.reservation_id));
  const unsent = reservations.filter((r: ReservationRow) => !sentSet.has(r.id));
  if (!unsent.length) return 0;

  return await sendReminderMessages(rule, tenantId, unsent);
}

/** 未送信予約リストに対してメッセージを作成・送信する共通関数 */
async function sendReminderMessages(rule: ReminderRule, tenantId: string | null, unsent: ReservationRow[]): Promise<number> {
  // 患者のLINE UID取得
  const patientIds = [...new Set(unsent.map((r) => r.patient_id))];
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

  // 送信対象を事前にメッセージ付きで準備
  const tasks: { reservation: ReservationRow; patient: { name: string; line_id: string | null }; messages: LineMessage[] }[] = [];
  for (const reservation of unsent) {
    const patient = patientMap.get(reservation.patient_id);
    if (!patient?.line_id) continue;

    let messages: LineMessage[];
    if (rule.message_format === "flex") {
      const flex = await buildReminderFlex(reservation.reserved_date, reservation.reserved_time, tenantId ?? undefined);
      messages = [{ type: "flex", altText: flex.altText, contents: flex.contents }];
    } else {
      const dateStr = formatDateJP(reservation.reserved_date);
      const hhmm = reservation.reserved_time?.substring(0, 5) || "";
      // 開始〜終了（15分枠）: "12:15〜12:30"
      const timeStr = hhmm ? (() => {
        const [hh, mm] = hhmm.split(":").map(Number);
        const endTotal = hh * 60 + mm + 15;
        return `${hhmm}〜${Math.floor(endTotal / 60)}:${String(endTotal % 60).padStart(2, "0")}`;
      })() : "";
      const formattedTime = formatReservationTime(reservation.reserved_date, reservation.reserved_time);
      const text = (rule.message_template || buildReminderMessage(formattedTime))
        .replace(/\{name\}/g, patient.name || reservation.patient_name || "")
        .replace(/\{date\}/g, dateStr)
        .replace(/\{time\}/g, timeStr)
        .replace(/\{patient_id\}/g, reservation.patient_id);
      messages = [{ type: "text", text }];
    }
    tasks.push({ reservation, patient, messages });
  }

  // BATCH_SIZE件ずつ並列送信
  let sent = 0;
  for (let i = 0; i < tasks.length; i += BATCH_SIZE) {
    const batch = tasks.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async ({ reservation, patient, messages }) => {
        try {
          const res = await pushMessage(patient.line_id!, messages, tenantId ?? undefined);
          const ok = res?.ok ?? false;

          // sent_log（二重送信防止）とmessage_log を並列insert
          const inserts: PromiseLike<unknown>[] = [
            supabaseAdmin.from("reminder_sent_log").insert({
              ...tenantPayload(tenantId),
              rule_id: rule.id,
              reservation_id: reservation.id,
              reserved_date: reservation.reserved_date,
            }),
          ];
          if (ok) {
            inserts.push(
              supabaseAdmin.from("message_log").insert({
                ...tenantPayload(tenantId),
                patient_id: reservation.patient_id,
                line_uid: patient.line_id,
                message_type: "reminder",
                content: messages[0].type === "text" ? (messages[0] as { type: "text"; text: string }).text : (messages[0] as { altText?: string }).altText,
                flex_json: messages[0].type === "flex" ? (messages[0] as { type: "flex"; contents: Record<string, unknown> }).contents : null,
                status: "sent",
                direction: "outgoing",
              }),
            );
          }
          await Promise.all(inserts);

          if (!ok) {
            console.error(`[reminders] LINE送信失敗 rule=${rule.id} reservation=${reservation.id}`);
          }
          return ok ? 1 : 0;
        } catch (e) {
          console.error(`[reminders] error reservation=${reservation.id}:`, (e as Error).message);
          return 0;
        }
      }),
    );
    sent += results.reduce<number>((a, b) => a + b, 0);
  }

  return sent;
}

/** before_hours用: 予約日時からN時間前がウィンドウ内の予約に送信 */
async function sendRelativeReminders(rule: ReminderRule, tenantId: string | null): Promise<number> {
  // 今後1時間以内にN時間前になる予約 = 予約時刻が (now+N時間) 〜 (now+N時間+1時間) の範囲
  // まず今日と明日の予約をまとめて取得し、時間でフィルタ
  const today = getJSTToday();
  const tomorrow = addOneDay(today);

  const { data: reservations } = await withTenant(
    supabaseAdmin
      .from("reservations")
      .select("id, patient_id, patient_name, reserved_date, reserved_time")
      .in("reserved_date", [today, tomorrow])
      .neq("status", "canceled"),
    tenantId
  );

  if (!reservations?.length) return 0;

  // N時間前ウィンドウでフィルタ
  const inWindow = reservations.filter((r: ReservationRow) =>
    isReservationInHoursWindow(r.reserved_date, r.reserved_time, rule.timing_value)
  );

  if (!inWindow.length) return 0;

  // 送信済みチェック
  const reservationIds = inWindow.map((r: ReservationRow) => r.id);
  const { data: sentLogs } = await withTenant(
    supabaseAdmin
      .from("reminder_sent_log")
      .select("reservation_id")
      .eq("rule_id", rule.id)
      .in("reservation_id", reservationIds),
    tenantId
  );
  const sentSet = new Set((sentLogs || []).map((l: SentLogRow) => l.reservation_id));
  const unsent = inWindow.filter((r: ReservationRow) => !sentSet.has(r.id));
  if (!unsent.length) return 0;

  // 既存のsendReminders内のメッセージ作成・送信ロジックと同じ
  return await sendReminderMessages(rule, tenantId, unsent);
}

function formatDateJP(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const dow = ["日", "月", "火", "水", "木", "金", "土"][dt.getUTCDay()];
  return `${y}年${m}月${d}日(${dow})`;
}
