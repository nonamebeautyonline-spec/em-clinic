// app/api/cron/generate-reminders/route.ts — 予約リマインド生成Cron（15分間隔）
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveTenantId, withTenant, tenantPayload } from "@/lib/tenant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  try {
    const tenantId = resolveTenantId();
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
        // リマインド対象の予約時刻ウィンドウを計算
        // 例: 24時間前リマインド → 予約が「now + 24h」〜「now + 24h + 15min」の範囲
        const reminderMs = rule.timing_type === "before_days"
          ? rule.timing_value * 24 * 60 * 60 * 1000
          : rule.timing_value * 60 * 60 * 1000;

        const windowStart = new Date(now.getTime() + reminderMs);
        const windowEnd = new Date(now.getTime() + reminderMs + 15 * 60 * 1000); // 15分のウィンドウ

        const startDate = windowStart.toISOString().split("T")[0];
        const endDate = windowEnd.toISOString().split("T")[0];
        const startTime = windowStart.toTimeString().substring(0, 5);
        const endTime = windowEnd.toTimeString().substring(0, 5);

        // 対象予約を取得（日付で絞り込み）
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

        // 時刻でさらに絞り込み（日付をまたぐ場合も考慮）
        const targetReservations = reservations.filter((r) => {
          const resDateTime = new Date(`${r.reserved_date}T${r.reserved_time}`);
          return resDateTime >= windowStart && resDateTime < windowEnd;
        });

        if (targetReservations.length === 0) continue;

        // 送信済みチェック
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

        // 患者のLINE UIDを取得
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

        // リマインドメッセージ生成 → scheduled_messagesに挿入
        for (const reservation of newReservations) {
          const patient = patientMap.get(reservation.patient_id);
          if (!patient?.line_id) continue; // LINE IDがなければスキップ

          // テンプレート変数を置換
          const dateStr = formatDateJP(reservation.reserved_date);
          const timeStr = reservation.reserved_time?.substring(0, 5) || "";

          const messageContent = rule.message_template
            .replace(/\{name\}/g, patient.name || reservation.patient_name || "")
            .replace(/\{date\}/g, dateStr)
            .replace(/\{time\}/g, timeStr)
            .replace(/\{patient_id\}/g, reservation.patient_id);

          // リマインド送信タイミング = 予約時刻 - timing_value
          const reservationTime = new Date(`${reservation.reserved_date}T${reservation.reserved_time}`);
          const sendAt = new Date(reservationTime.getTime() - reminderMs);

          // scheduled_messagesに挿入
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

          // 送信ログに記録（二重送信防止）
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

/** 日本語日付フォーマット */
function formatDateJP(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00+09:00");
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const dow = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];
  return `${y}年${m}月${day}日(${dow})`;
}
