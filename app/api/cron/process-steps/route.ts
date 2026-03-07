// app/api/cron/process-steps/route.ts — ステップ配信 Cron（5分間隔で実行）
import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { pushMessage } from "@/lib/line-push";
import { calculateNextSendAt, evaluateStepConditions, jumpToStep } from "@/lib/step-enrollment";
import { evaluateDisplayConditions, type DisplayConditions } from "@/lib/step-conditions";
import { withTenant, tenantPayload } from "@/lib/tenant";
import { acquireLock } from "@/lib/distributed-lock";

interface StepItem {
  step_type: string;
  content?: string | null;
  template_id?: number | null;
  tag_id?: number | null;
  mark?: string | null;
  menu_id?: number | null;
  condition_rules?: unknown[];
  branch_true_step?: number | null;
  branch_false_step?: number | null;
  exit_condition_rules?: unknown[];
  exit_action?: string | null;
  exit_jump_to?: number | null;
  display_conditions?: DisplayConditions | null;
  sort_order: number;
  delay_type?: string;
  delay_value?: number;
  send_time?: string | null;
}

interface StepEnrollment {
  id: string;
  tenant_id: string | null;
  scenario_id: string;
  patient_id: string;
  line_uid: string | null;
  current_step_order: number;
  status: string;
  step_scenarios?: { name: string; is_enabled: boolean } | null;
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  // Vercel Cron認証
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return unauthorized();
  }

  // 排他制御: 同時実行を防止
  const lock = await acquireLock("cron:process-steps", 55);
  if (!lock.acquired) {
    return NextResponse.json({ ok: true, skipped: "別のプロセスが実行中" });
  }

  try {
    const now = new Date().toISOString();

    // 送信予定時刻が過ぎたアクティブな enrollment を全テナント横断で取得（最大50件）
    const { data: enrollments, error } = await supabaseAdmin
      .from("step_enrollments")
      .select("*, step_scenarios!inner(name, is_enabled)")
      .eq("status", "active")
      .not("next_send_at", "is", null)
      .lte("next_send_at", now)
      .limit(50);

    if (error) {
      console.error("[process-steps] query error:", error.message);
      return serverError(error.message);
    }

    if (!enrollments || enrollments.length === 0) {
      return NextResponse.json({ ok: true, processed: 0 });
    }

    let processed = 0;
    let errors = 0;

    for (const enrollment of enrollments) {
      // 各enrollmentが持つ tenant_id を使用
      const tenantId: string | null = enrollment.tenant_id || null;

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

        // 離脱条件チェック（ステップ実行前）
        const exitRules = step.exit_condition_rules;
        if (exitRules && Array.isArray(exitRules) && exitRules.length > 0) {
          const exitMatch = await evaluateStepConditions(exitRules, enrollment.patient_id, tenantId);
          if (exitMatch) {
            const exitAction = step.exit_action || "exit";
            if (exitAction === "exit") {
              await withTenant(
                supabaseAdmin
                  .from("step_enrollments")
                  .update({ status: "exited", exited_at: now, exit_reason: "condition_failed", next_send_at: null })
                  .eq("id", enrollment.id),
                tenantId
              );
              processed++;
              continue;
            } else if (exitAction === "skip") {
              await advanceToNextStep(enrollment, tenantId);
              processed++;
              continue;
            } else if (exitAction === "jump" && step.exit_jump_to != null) {
              await jumpToStep(enrollment.id, step.exit_jump_to, enrollment.scenario_id, tenantId);
              processed++;
              continue;
            }
          }
        }

        // 表示条件（display_conditions）の評価
        if (step.display_conditions) {
          const dcContext = await buildDisplayConditionContext(enrollment, tenantId);
          const shouldDisplay = evaluateDisplayConditions(step.display_conditions, dcContext);
          if (!shouldDisplay) {
            // 条件を満たさない → スキップして次のステップへ
            await advanceToNextStep(enrollment, tenantId);
            processed++;
            continue;
          }
        }

        // 条件分岐ステップの処理
        if (step.step_type === "condition") {
          const condRules = step.condition_rules;
          if (condRules && Array.isArray(condRules) && condRules.length > 0) {
            const match = await evaluateStepConditions(condRules, enrollment.patient_id, tenantId);
            if (match && step.branch_true_step != null) {
              await jumpToStep(enrollment.id, step.branch_true_step, enrollment.scenario_id, tenantId);
            } else if (!match && step.branch_false_step != null) {
              await jumpToStep(enrollment.id, step.branch_false_step, enrollment.scenario_id, tenantId);
            } else {
              await advanceToNextStep(enrollment, tenantId);
            }
          } else {
            await advanceToNextStep(enrollment, tenantId);
          }
          processed++;
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
      } catch (e) {
        console.error(`[process-steps] error for enrollment=${enrollment.id}:`, (e as Error).message);
        errors++;
      }
    }

    console.log(`[process-steps] processed=${processed}, errors=${errors}`);
    return NextResponse.json({ ok: true, processed, errors });
  } catch (e) {
    console.error("[process-steps] cron error:", e);
    return serverError((e as Error).message);
  } finally {
    await lock.release();
  }
}

/** ステップを実行 */
async function executeStep(step: StepItem, enrollment: StepEnrollment, lineUid: string | null, tenantId: string | null) {
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
async function advanceToNextStep(enrollment: StepEnrollment, tenantId: string | null) {
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
async function markCompleted(enrollment: StepEnrollment, tenantId: string | null) {
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

/** display_conditions 用のコンテキストを構築 */
async function buildDisplayConditionContext(
  enrollment: StepEnrollment,
  tenantId: string | null
): Promise<import("@/lib/step-conditions").DisplayConditionContext> {
  // タグ名一覧を取得
  const { data: tagRows } = await withTenant(
    supabaseAdmin
      .from("patient_tags")
      .select("tag_definitions!inner(name)")
      .eq("patient_id", enrollment.patient_id),
    tenantId
  );
  const tags = (tagRows || []).map((r: Record<string, unknown>) => {
    const td = r.tag_definitions as Record<string, unknown> | null;
    return String(td?.name ?? "");
  }).filter(Boolean);

  // 経過日数を計算（enrolled_at から）
  const { data: enrollData } = await withTenant(
    supabaseAdmin
      .from("step_enrollments")
      .select("enrolled_at")
      .eq("id", enrollment.id)
      .maybeSingle(),
    tenantId
  );
  const enrolledAt = enrollData?.enrolled_at ? new Date(enrollData.enrolled_at) : new Date();
  const daysSinceStart = Math.floor((Date.now() - enrolledAt.getTime()) / (1000 * 60 * 60 * 24));

  // 完了済みステップ（現在のstep_orderより前のステップ）
  const { data: completedStepRows } = await withTenant(
    supabaseAdmin
      .from("step_items")
      .select("id")
      .eq("scenario_id", enrollment.scenario_id)
      .lt("sort_order", enrollment.current_step_order),
    tenantId
  );
  const completedSteps = (completedStepRows || []).map((s: Record<string, unknown>) => String(s.id));

  // カスタムフィールド（patients テーブルの custom_fields JSONB）
  const { data: patient } = await withTenant(
    supabaseAdmin
      .from("patients")
      .select("custom_fields")
      .eq("patient_id", enrollment.patient_id)
      .maybeSingle(),
    tenantId
  );
  const customFields = (patient?.custom_fields as Record<string, unknown>) || {};

  return { tags, customFields, daysSinceStart, completedSteps };
}
