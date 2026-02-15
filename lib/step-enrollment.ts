// lib/step-enrollment.ts — ステップ配信のトリガー・エンロール・離脱共通関数
import { supabaseAdmin } from "@/lib/supabase";
import { withTenant, tenantPayload } from "@/lib/tenant";

/**
 * follow トリガーのシナリオを検索してエンロール
 */
export async function checkFollowTriggerScenarios(patientId: string, lineUid: string, tenantId?: string) {
  const tid = tenantId ?? null;
  const { data: scenarios } = await withTenant(
    supabaseAdmin
      .from("step_scenarios")
      .select("id")
      .eq("trigger_type", "follow")
      .eq("is_enabled", true),
    tid,
  );

  for (const s of scenarios || []) {
    await enrollPatient(s.id, patientId, lineUid, tenantId);
  }
}

/**
 * keyword トリガーのシナリオを検索してエンロール
 */
export async function checkKeywordTriggerScenarios(keyword: string, patientId: string, lineUid?: string, tenantId?: string) {
  const tid = tenantId ?? null;
  const { data: scenarios } = await withTenant(
    supabaseAdmin
      .from("step_scenarios")
      .select("id, trigger_keyword, trigger_keyword_match")
      .eq("trigger_type", "keyword")
      .eq("is_enabled", true),
    tid,
  );

  for (const s of scenarios || []) {
    if (!s.trigger_keyword) continue;
    let matched = false;
    switch (s.trigger_keyword_match) {
      case "exact":
        matched = keyword.trim() === s.trigger_keyword;
        break;
      case "partial":
        matched = keyword.includes(s.trigger_keyword);
        break;
      case "regex":
        try { matched = new RegExp(s.trigger_keyword).test(keyword); } catch { /* skip */ }
        break;
    }
    if (matched) {
      await enrollPatient(s.id, patientId, lineUid, tenantId);
    }
  }
}

/**
 * tag_add トリガーのシナリオを検索してエンロール
 */
export async function checkTagTriggerScenarios(patientId: string, tagId: number, lineUid?: string, tenantId?: string) {
  const tid = tenantId ?? null;
  const { data: scenarios } = await withTenant(
    supabaseAdmin
      .from("step_scenarios")
      .select("id")
      .eq("trigger_type", "tag_add")
      .eq("trigger_tag_id", tagId)
      .eq("is_enabled", true),
    tid,
  );

  for (const s of scenarios || []) {
    await enrollPatient(s.id, patientId, lineUid, tenantId);
  }
}

/**
 * 患者をシナリオにエンロール
 */
export async function enrollPatient(scenarioId: number, patientId: string, lineUid?: string, tenantId?: string) {
  const tid = tenantId ?? null;

  // 最初のステップの遅延を計算（テナントフィルター付き）
  const { data: firstStep } = await withTenant(
    supabaseAdmin
      .from("step_items")
      .select("sort_order, delay_type, delay_value, send_time")
      .eq("scenario_id", scenarioId)
      .order("sort_order", { ascending: true })
      .limit(1),
    tid,
  ).maybeSingle();

  if (!firstStep) return; // ステップなしシナリオはスキップ

  const nextSendAt = calculateNextSendAt(firstStep.delay_type, firstStep.delay_value, firstStep.send_time);

  // UNIQUE制約で二重登録を防止（既に登録済みなら無視）
  const { error } = await supabaseAdmin
    .from("step_enrollments")
    .insert({
      ...tenantPayload(tid),
      scenario_id: scenarioId,
      patient_id: patientId,
      line_uid: lineUid || null,
      current_step_order: firstStep.sort_order,
      status: "active",
      next_send_at: nextSendAt,
    })
    .select()
    .single();

  if (error) {
    // 重複エラー（23505）は正常（既に登録済み）
    if (error.code === "23505") return;
    console.error("[step-enrollment] enroll error:", error.message);
    return;
  }

  // 統計更新（直接インクリメント、テナントフィルター付き）
  try {
    const { data: current } = await withTenant(
      supabaseAdmin
        .from("step_scenarios")
        .select("total_enrolled")
        .eq("id", scenarioId),
      tid,
    ).single();
    if (current) {
      await withTenant(
        supabaseAdmin
          .from("step_scenarios")
          .update({ total_enrolled: (current.total_enrolled || 0) + 1 })
          .eq("id", scenarioId),
        tid,
      );
    }
  } catch {
    // 統計更新失敗は無視
  }

  console.log(`[step-enrollment] enrolled patient=${patientId} scenario=${scenarioId}`);
}

/**
 * 全アクティブなenrollmentを離脱させる
 */
export async function exitAllStepEnrollments(patientId: string, reason: string, tenantId?: string) {
  const { error } = await withTenant(
    supabaseAdmin
      .from("step_enrollments")
      .update({
        status: "exited",
        exited_at: new Date().toISOString(),
        exit_reason: reason,
      })
      .eq("patient_id", patientId)
      .eq("status", "active"),
    tenantId ?? null,
  );

  if (error) {
    console.error("[step-enrollment] exit error:", error.message);
  }
}

/**
 * 次回送信時刻を計算
 */
export function calculateNextSendAt(
  delayType: string,
  delayValue: number,
  sendTime?: string | null,
  baseTime?: Date
): string {
  const base = baseTime || new Date();
  const result = new Date(base);

  switch (delayType) {
    case "minutes":
      result.setMinutes(result.getMinutes() + delayValue);
      break;
    case "hours":
      result.setHours(result.getHours() + delayValue);
      break;
    case "days":
      result.setDate(result.getDate() + delayValue);
      // 時刻指定がある場合はJSTで設定
      if (sendTime) {
        const [h, m] = sendTime.split(":").map(Number);
        // JST (UTC+9) で指定時刻に設定
        result.setUTCHours(h - 9, m, 0, 0);
      }
      break;
  }

  return result.toISOString();
}
