// lib/followup.ts — フォローアップ自動送信コアロジック
//
// テーブル定義（Supabase上に作成想定）:
//
// -- followup_rules: フォローアップルール設定
// CREATE TABLE followup_rules (
//   id serial PRIMARY KEY,
//   tenant_id text,
//   name text NOT NULL,
//   trigger_event text NOT NULL DEFAULT 'payment_completed',
//   delay_days integer NOT NULL,
//   message_template text NOT NULL,
//   flex_json jsonb,
//   is_enabled boolean DEFAULT true,
//   created_at timestamptz DEFAULT now(),
//   updated_at timestamptz DEFAULT now()
// );
//
// -- followup_logs: フォローアップ送信ログ
// CREATE TABLE followup_logs (
//   id serial PRIMARY KEY,
//   tenant_id text,
//   rule_id integer REFERENCES followup_rules(id),
//   patient_id text NOT NULL,
//   order_id integer,
//   scheduled_at timestamptz NOT NULL,
//   sent_at timestamptz,
//   status text DEFAULT 'pending',
//   error_message text,
//   created_at timestamptz DEFAULT now()
// );

import { supabaseAdmin } from "@/lib/supabase";
import { pushMessage } from "@/lib/line-push";
import { withTenant, tenantPayload } from "@/lib/tenant";
import { sanitizeFlexContents } from "@/lib/flex-sanitize";

/**
 * 決済完了時にフォローアップログをスケジュール
 * 有効なルールを全取得し、followup_logs に pending レコードを作成
 */
export async function scheduleFollowups(
  orderId: number,
  patientId: string,
  tenantId: string | null,
) {
  // 有効なルールを取得
  let query = supabaseAdmin
    .from("followup_rules")
    .select("*")
    .eq("is_enabled", true)
    .eq("trigger_event", "payment_completed");
  query = withTenant(query, tenantId);

  const { data: rules, error } = await query;
  if (error) {
    console.error("[Followup] ルール取得エラー:", error.message);
    return;
  }
  if (!rules?.length) return;

  const now = new Date();

  const logs = rules.map((rule) => {
    const scheduledAt = new Date(now);
    scheduledAt.setDate(scheduledAt.getDate() + rule.delay_days);
    // 送信時刻は10:00 JST（UTC 01:00）に固定
    scheduledAt.setUTCHours(1, 0, 0, 0);

    return {
      ...tenantPayload(tenantId),
      rule_id: rule.id,
      patient_id: patientId,
      order_id: orderId,
      scheduled_at: scheduledAt.toISOString(),
      status: "pending",
    };
  });

  const { error: insertError } = await supabaseAdmin
    .from("followup_logs")
    .insert(logs);

  if (insertError) {
    console.error("[Followup] ログ作成エラー:", insertError.message);
  } else {
    console.log(`[Followup] ${logs.length}件のフォローアップをスケジュール（patient: ${patientId}）`);
  }
}

/**
 * テンプレート変数を置換
 * {name} → 患者名、{patient_id} → 患者ID、{send_date} → 送信日
 */
function resolveTemplate(
  template: string,
  patientName: string | null,
  patientId: string,
): string {
  const now = new Date();
  const sendDate = `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()}`;

  return template
    .replace(/\{name\}/g, patientName || "")
    .replace(/\{patient_id\}/g, patientId)
    .replace(/\{send_date\}/g, sendDate);
}

/**
 * Cron用: 送信予定時刻を過ぎた pending ログを処理してLINE送信
 * tenantId を指定しない場合は全テナント横断
 */
export async function processFollowups(tenantId?: string) {
  const now = new Date().toISOString();

  // 送信予定時刻を過ぎた pending ログを取得
  let query = supabaseAdmin
    .from("followup_logs")
    .select("*, followup_rules(*)")
    .eq("status", "pending")
    .lte("scheduled_at", now)
    .order("scheduled_at", { ascending: true })
    .limit(50);

  if (tenantId) {
    query = query.eq("tenant_id", tenantId);
  }

  const { data: logs, error } = await query;
  if (error) {
    console.error("[Followup] ログ取得エラー:", error.message);
    return { sent: 0, failed: 0, skipped: 0 };
  }

  if (!logs?.length) {
    return { sent: 0, failed: 0, skipped: 0 };
  }

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const log of logs) {
    const rule = log.followup_rules;
    const logTenantId: string | null = log.tenant_id || null;

    // ルールが無効化されている場合はスキップ
    if (!rule || !rule.is_enabled) {
      await supabaseAdmin
        .from("followup_logs")
        .update({ status: "skipped", sent_at: now, error_message: "ルール無効" })
        .eq("id", log.id);
      skipped++;
      continue;
    }

    // 患者情報を取得（LINE UID取得のため）
    const { data: patient } = await supabaseAdmin
      .from("patients")
      .select("name, line_id")
      .eq("patient_id", log.patient_id)
      .maybeSingle();

    if (!patient?.line_id) {
      await supabaseAdmin
        .from("followup_logs")
        .update({ status: "skipped", sent_at: now, error_message: "LINE UIDなし" })
        .eq("id", log.id);
      skipped++;
      continue;
    }

    try {
      const resolvedMsg = resolveTemplate(
        rule.message_template,
        patient.name,
        log.patient_id,
      );

      // flex_json がある場合はFlexメッセージ、なければテキスト
      let res;
      if (rule.flex_json) {
        res = await pushMessage(
          patient.line_id,
          [{ type: "flex", altText: resolvedMsg, contents: sanitizeFlexContents(rule.flex_json) }],
          logTenantId ?? undefined,
        );
      } else {
        res = await pushMessage(
          patient.line_id,
          [{ type: "text", text: resolvedMsg }],
          logTenantId ?? undefined,
        );
      }

      if (res?.ok) {
        await supabaseAdmin
          .from("followup_logs")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("id", log.id);

        // メッセージログに記録
        await supabaseAdmin.from("message_log").insert({
          ...tenantPayload(logTenantId),
          patient_id: log.patient_id,
          line_uid: patient.line_id,
          message_type: "followup",
          content: resolvedMsg,
          flex_json: rule.flex_json || null,
          status: "sent",
          direction: "outgoing",
        });
        sent++;
      } else {
        await supabaseAdmin
          .from("followup_logs")
          .update({
            status: "failed",
            sent_at: new Date().toISOString(),
            error_message: "LINE API error",
          })
          .eq("id", log.id);
        failed++;
      }
    } catch (err) {
      await supabaseAdmin
        .from("followup_logs")
        .update({
          status: "failed",
          sent_at: new Date().toISOString(),
          error_message: err instanceof Error ? err.message : "Unknown error",
        })
        .eq("id", log.id);
      failed++;
    }
  }

  console.log(`[Followup] 処理完了: sent=${sent}, failed=${failed}, skipped=${skipped}`);
  return { sent, failed, skipped };
}
