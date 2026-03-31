// lib/reminder-templates.ts — リマインダーテンプレートシステム
//
// 予約以外のリマインドにも対応するオフセットベースのテンプレート。
// テンプレート定義（1回）→ 任意の患者にtarget_dateで登録 → Cronで配信。
//
// 例: セミナーリマインド
//   ステップ1: offset_minutes = -4320（3日前）→「3日後にセミナーです」
//   ステップ2: offset_minutes = -1440（1日前）→「明日はセミナーです」
//   ステップ3: offset_minutes = 0（当日）→「本日のセミナーURLはこちら」

import { supabaseAdmin } from "@/lib/supabase";
import { strictWithTenant, tenantPayload } from "@/lib/tenant";
import { pushMessage } from "@/lib/line-push";
import { expandTemplate } from "@/lib/template-variables";

// ---------------------------------------------------------------------------
// 型定義
// ---------------------------------------------------------------------------

export interface ReminderTemplate {
  id: string;
  name: string;
  is_active: boolean;
  tenant_id: string;
  created_at: string;
}

export interface ReminderStep {
  id: string;
  template_id: string;
  offset_minutes: number;
  message_type: string;
  message_content: string;
  sort_order: number;
}

export interface PatientReminder {
  id: string;
  patient_id: string;
  template_id: string;
  target_date: string;
  status: string; // active, completed, cancelled
  tenant_id: string;
}

// ---------------------------------------------------------------------------
// テンプレート CRUD
// ---------------------------------------------------------------------------

export async function getReminderTemplates(tenantId: string): Promise<ReminderTemplate[]> {
  const { data } = await strictWithTenant(
    supabaseAdmin.from("reminder_templates").select("*").order("created_at", { ascending: false }),
    tenantId,
  );
  return (data ?? []) as ReminderTemplate[];
}

export async function createReminderTemplate(
  input: { name: string },
  tenantId: string,
): Promise<ReminderTemplate> {
  const { data, error } = await supabaseAdmin
    .from("reminder_templates")
    .insert({ ...tenantPayload(tenantId), name: input.name })
    .select()
    .single();
  if (error) throw new Error(`テンプレート作成失敗: ${error.message}`);
  return data as ReminderTemplate;
}

// ---------------------------------------------------------------------------
// ステップ CRUD
// ---------------------------------------------------------------------------

export async function getReminderSteps(templateId: string): Promise<ReminderStep[]> {
  const { data } = await supabaseAdmin
    .from("reminder_steps")
    .select("*")
    .eq("template_id", templateId)
    .order("sort_order", { ascending: true });
  return (data ?? []) as ReminderStep[];
}

export async function addReminderStep(
  input: { templateId: string; offsetMinutes: number; messageType: string; messageContent: string; sortOrder: number },
): Promise<ReminderStep> {
  const { data, error } = await supabaseAdmin
    .from("reminder_steps")
    .insert({
      template_id: input.templateId,
      offset_minutes: input.offsetMinutes,
      message_type: input.messageType,
      message_content: input.messageContent,
      sort_order: input.sortOrder,
    })
    .select()
    .single();
  if (error) throw new Error(`ステップ追加失敗: ${error.message}`);
  return data as ReminderStep;
}

export async function deleteReminderStep(stepId: string): Promise<void> {
  await supabaseAdmin.from("reminder_steps").delete().eq("id", stepId);
}

// ---------------------------------------------------------------------------
// 患者リマインダー登録
// ---------------------------------------------------------------------------

export async function enrollPatientReminder(
  input: { patientId: string; templateId: string; targetDate: string },
  tenantId: string,
): Promise<PatientReminder> {
  const { data, error } = await supabaseAdmin
    .from("patient_reminders")
    .insert({
      ...tenantPayload(tenantId),
      patient_id: input.patientId,
      template_id: input.templateId,
      target_date: input.targetDate,
    })
    .select()
    .single();
  if (error) throw new Error(`リマインダー登録失敗: ${error.message}`);
  return data as PatientReminder;
}

// ---------------------------------------------------------------------------
// Cron処理: 配信時刻到来したステップを処理
// ---------------------------------------------------------------------------

/**
 * アクティブなリマインダーの配信処理。
 * target_date + offset_minutes が現在時刻以前で、未配信のステップを送信する。
 */
export async function processReminderDeliveries(tenantId: string): Promise<number> {
  const now = new Date();
  let deliveredCount = 0;

  // アクティブなリマインダーを取得
  const { data: reminders } = await strictWithTenant(
    supabaseAdmin
      .from("patient_reminders")
      .select("*, reminder_templates!inner(is_active)")
      .eq("status", "active"),
    tenantId,
  );
  if (!reminders || reminders.length === 0) return 0;

  for (const reminder of reminders) {
    const r = reminder as PatientReminder & { reminder_templates: { is_active: boolean } };
    if (!r.reminder_templates.is_active) continue;

    // このリマインダーのステップを取得
    const steps = await getReminderSteps(r.template_id);

    // 配信済みステップを取得
    const { data: delivered } = await supabaseAdmin
      .from("patient_reminder_deliveries")
      .select("step_id")
      .eq("patient_reminder_id", r.id);
    const deliveredIds = new Set((delivered ?? []).map((d) => (d as { step_id: string }).step_id));

    // 未配信で配信時刻が到来しているステップを処理
    for (const step of steps) {
      if (deliveredIds.has(step.id)) continue;

      const targetTime = new Date(r.target_date).getTime() + step.offset_minutes * 60_000;
      if (targetTime > now.getTime()) continue;

      // 患者のLINE UIDを取得
      const { data: patient } = await strictWithTenant(
        supabaseAdmin.from("patients").select("line_id").eq("patient_id", r.patient_id).maybeSingle(),
        tenantId,
      );
      if (!patient?.line_id) continue;

      // テンプレート変数展開
      const text = await expandTemplate(step.message_content, {
        patientId: r.patient_id,
        tenantId,
      });

      // メッセージ送信
      try {
        if (step.message_type === "text") {
          await pushMessage(patient.line_id as string, [{ type: "text", text }], tenantId);
        }
        // flex等のサポートは必要に応じて追加

        // 配信済み記録（重複防止: UNIQUE制約）
        await supabaseAdmin.from("patient_reminder_deliveries").insert({
          patient_reminder_id: r.id,
          step_id: step.id,
        });

        deliveredCount++;
      } catch (e) {
        console.error(`[reminder] 配信失敗 patient=${r.patient_id} step=${step.id}:`, e);
      }
    }

    // 全ステップ配信済みか確認 → completed に更新
    const { data: allDelivered } = await supabaseAdmin
      .from("patient_reminder_deliveries")
      .select("step_id")
      .eq("patient_reminder_id", r.id);
    if ((allDelivered?.length ?? 0) >= steps.length) {
      await supabaseAdmin
        .from("patient_reminders")
        .update({ status: "completed" })
        .eq("id", r.id);
    }
  }

  return deliveredCount;
}
