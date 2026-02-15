// app/api/cron/process-steps/route.ts — ステップ配信 Cron（5分間隔で実行）
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { pushMessage } from "@/lib/line-push";
import { calculateNextSendAt } from "@/lib/step-enrollment";
import { resolveTenantId, withTenant, tenantPayload } from "@/lib/tenant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  try {
    const tenantId = resolveTenantId();
    const now = new Date().toISOString();

    // 送信予定時刻が過ぎたアクティブな enrollment を取得（最大50件）
    const { data: enrollments, error } = await withTenant(
      supabaseAdmin
        .from("step_enrollments")
        .select("*, step_scenarios!inner(name, is_enabled)")
        .eq("status", "active")
        .not("next_send_at", "is", null)
        .lte("next_send_at", now)
        .limit(50),
      tenantId
    );

    if (error) {
      console.error("[process-steps] query error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!enrollments || enrollments.length === 0) {
      return NextResponse.json({ ok: true, processed: 0 });
    }

    let processed = 0;
    let errors = 0;

    for (const enrollment of enrollments) {
      try {
        // シナリオが無効化されていたらスキップ
        if (!enrollment.step_scenarios?.is_enabled) {
          await withTenant(
            supabaseAdmin
              .from("step_enrollments")
              .update({ status: "paused", exited_at: now, exit_reason: "scenario_disabled" })
              .eq("id", enrollment.id),
            tenantId
          );
          continue;
        }

        // 現在のステップを取得
        const { data: step } = await withTenant(
          supabaseAdmin
            .from("step_items")
            .select("*")
            .eq("scenario_id", enrollment.scenario_id)
            .eq("sort_order", enrollment.current_step_order)
            .maybeSingle(),
          tenantId
        );

        if (!step) {
          // ステップが見つからない → 完了扱い
          await markCompleted(enrollment, tenantId);
          continue;
        }

        // LINE UID の確認
        const lineUid = enrollment.line_uid;
        if (!lineUid && (step.step_type === "send_text" || step.step_type === "send_template")) {
          // LINE UID がない場合はスキップして次のステップへ
          console.warn(`[process-steps] no line_uid for patient=${enrollment.patient_id}`);
          await advanceToNextStep(enrollment, tenantId);
          processed++;
          continue;
        }

        // ステップ実行
        await executeStep(step, enrollment, lineUid, tenantId);
        processed++;

        // 次のステップへ進む
        await advanceToNextStep(enrollment, tenantId);
      } catch (e: any) {
        console.error(`[process-steps] error for enrollment=${enrollment.id}:`, e.message);
        errors++;
      }
    }

    console.log(`[process-steps] processed=${processed}, errors=${errors}`);
    return NextResponse.json({ ok: true, processed, errors });
  } catch (e: any) {
    console.error("[process-steps] cron error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/** ステップを実行 */
async function executeStep(step: any, enrollment: any, lineUid: string | null, tenantId: string | null) {
  switch (step.step_type) {
    case "send_text": {
      if (!lineUid || !step.content) break;
      // 変数置換
      let text = step.content;
      // 患者名の取得（patientsテーブルから）
      const { data: patient } = await withTenant(
        supabaseAdmin
          .from("patients")
          .select("name")
          .eq("patient_id", enrollment.patient_id)
          .maybeSingle(),
        tenantId
      );

      text = text.replace(/\{name\}/g, patient?.name || "");
      text = text.replace(/\{patient_id\}/g, enrollment.patient_id || "");
      text = text.replace(/\{send_date\}/g, new Date().toLocaleDateString("ja-JP"));

      await pushMessage(lineUid, [{ type: "text", text }], tenantId ?? undefined);

      // ログ記録
      await supabaseAdmin.from("message_log").insert({
        ...tenantPayload(tenantId),
        patient_id: enrollment.patient_id,
        line_uid: lineUid,
        direction: "outgoing",
        event_type: "step_delivery",
        message_type: "step",
        content: text,
        status: "sent",
        campaign_id: String(enrollment.scenario_id),
      });
      break;
    }

    case "send_template": {
      if (!lineUid || !step.template_id) break;
      const { data: tpl } = await withTenant(
        supabaseAdmin
          .from("message_templates")
          .select("content, message_type")
          .eq("id", step.template_id)
          .maybeSingle(),
        tenantId
      );

      if (tpl?.content) {
        const { data: patient } = await withTenant(
          supabaseAdmin
            .from("patients")
            .select("name")
            .eq("patient_id", enrollment.patient_id)
            .maybeSingle(),
          tenantId
        );

        let text = tpl.content;
        text = text.replace(/\{name\}/g, patient?.name || "");
        text = text.replace(/\{patient_id\}/g, enrollment.patient_id || "");

        await pushMessage(lineUid, [{ type: "text", text }], tenantId ?? undefined);

        await supabaseAdmin.from("message_log").insert({
          ...tenantPayload(tenantId),
          patient_id: enrollment.patient_id,
          line_uid: lineUid,
          direction: "outgoing",
          event_type: "step_delivery",
          message_type: "step",
          content: text,
          status: "sent",
          campaign_id: String(enrollment.scenario_id),
        });
      }
      break;
    }

    case "tag_add": {
      if (!step.tag_id) break;
      await supabaseAdmin
        .from("patient_tags")
        .upsert({
          ...tenantPayload(tenantId),
          patient_id: enrollment.patient_id,
          tag_id: step.tag_id,
          assigned_at: new Date().toISOString(),
          assigned_by: "step_delivery",
        }, { onConflict: "patient_id,tag_id" });
      break;
    }

    case "tag_remove": {
      if (!step.tag_id) break;
      await withTenant(
        supabaseAdmin
          .from("patient_tags")
          .delete()
          .eq("patient_id", enrollment.patient_id)
          .eq("tag_id", step.tag_id),
        tenantId
      );
      break;
    }

    case "mark_change": {
      if (!step.mark) break;
      await supabaseAdmin
        .from("patient_marks")
        .upsert({
          ...tenantPayload(tenantId),
          patient_id: enrollment.patient_id,
          mark: step.mark,
          updated_by: "step_delivery",
        }, { onConflict: "patient_id" });
      break;
    }
  }
}

/** 次のステップへ進む */
async function advanceToNextStep(enrollment: any, tenantId: string | null) {
  const { data: nextStep } = await withTenant(
    supabaseAdmin
      .from("step_items")
      .select("sort_order, delay_type, delay_value, send_time")
      .eq("scenario_id", enrollment.scenario_id)
      .gt("sort_order", enrollment.current_step_order)
      .order("sort_order", { ascending: true })
      .limit(1)
      .maybeSingle(),
    tenantId
  );

  if (!nextStep) {
    // 最終ステップ → 完了
    await markCompleted(enrollment, tenantId);
    return;
  }

  const nextSendAt = calculateNextSendAt(nextStep.delay_type, nextStep.delay_value, nextStep.send_time);

  await withTenant(
    supabaseAdmin
      .from("step_enrollments")
      .update({
        current_step_order: nextStep.sort_order,
        next_send_at: nextSendAt,
      })
      .eq("id", enrollment.id),
    tenantId
  );
}

/** enrollment を完了にする */
async function markCompleted(enrollment: any, tenantId: string | null) {
  await withTenant(
    supabaseAdmin
      .from("step_enrollments")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        next_send_at: null,
      })
      .eq("id", enrollment.id),
    tenantId
  );

  // 統計更新
  const { data: scenario } = await withTenant(
    supabaseAdmin
      .from("step_scenarios")
      .select("total_completed")
      .eq("id", enrollment.scenario_id)
      .maybeSingle(),
    tenantId
  );

  if (scenario) {
    await withTenant(
      supabaseAdmin
        .from("step_scenarios")
        .update({ total_completed: (scenario.total_completed || 0) + 1 })
        .eq("id", enrollment.scenario_id),
      tenantId
    );
  }
}
