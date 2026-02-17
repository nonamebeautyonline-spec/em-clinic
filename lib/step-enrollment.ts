// lib/step-enrollment.ts — ステップ配信のトリガー・エンロール・離脱共通関数
import { supabaseAdmin } from "@/lib/supabase";
import { withTenant, tenantPayload } from "@/lib/tenant";
import {
  getVisitCounts, getPurchaseAmounts, getLastVisitDates, getReorderCounts,
  matchBehaviorCondition
} from "@/lib/behavior-filters";

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

/**
 * ステップの条件ルールを評価（条件分岐・離脱条件用）
 * ConditionRule形式のJSONBを受け取り、全条件(AND)を満たすか判定
 */
export async function evaluateStepConditions(
  rules: any[],
  patientId: string,
  tenantId: string | null
): Promise<boolean> {
  if (!rules || rules.length === 0) return false;

  for (const rule of rules) {
    const type = rule.type;
    let matched = false;

    switch (type) {
      case "tag": {
        const tagIds: number[] = rule.tag_ids || (rule.tag_id ? [rule.tag_id] : []);
        if (tagIds.length === 0) { matched = true; break; }
        const { data: patientTags } = await withTenant(
          supabaseAdmin
            .from("patient_tags")
            .select("tag_id")
            .eq("patient_id", patientId)
            .in("tag_id", tagIds),
          tenantId
        );
        const foundIds = new Set((patientTags || []).map(t => t.tag_id));
        const tagMatch = rule.tag_match || "any_include";
        if (tagMatch === "any_include") matched = tagIds.some(id => foundIds.has(id));
        else if (tagMatch === "all_include") matched = tagIds.every(id => foundIds.has(id));
        else if (tagMatch === "any_exclude") matched = !tagIds.some(id => foundIds.has(id));
        else if (tagMatch === "all_exclude") matched = !tagIds.every(id => foundIds.has(id));
        break;
      }
      case "mark": {
        const markValues: string[] = rule.mark_values || rule.values || [];
        if (markValues.length === 0) { matched = true; break; }
        const { data: mark } = await withTenant(
          supabaseAdmin
            .from("patient_marks")
            .select("mark")
            .eq("patient_id", patientId)
            .maybeSingle(),
          tenantId
        );
        const currentMark = mark?.mark || "none";
        matched = markValues.includes(currentMark);
        break;
      }
      case "visit_count": {
        const counts = await getVisitCounts([patientId], rule.behavior_date_range || rule.date_range, tenantId);
        const count = counts.get(patientId) || 0;
        matched = matchBehaviorCondition(count, rule.behavior_operator || rule.operator || ">=", rule.behavior_value || rule.value || "0", rule.behavior_value_end || rule.value_end);
        break;
      }
      case "purchase_amount": {
        const amounts = await getPurchaseAmounts([patientId], rule.behavior_date_range || rule.date_range, tenantId);
        const amount = amounts.get(patientId) || 0;
        matched = matchBehaviorCondition(amount, rule.behavior_operator || rule.operator || ">=", rule.behavior_value || rule.value || "0", rule.behavior_value_end || rule.value_end);
        break;
      }
      case "last_visit": {
        const dates = await getLastVisitDates([patientId], tenantId);
        const date = dates.get(patientId) || null;
        if (!date) { matched = false; break; }
        matched = matchBehaviorCondition(date, rule.behavior_operator || rule.operator || "within_days", rule.behavior_value || rule.value || "30");
        break;
      }
      case "reorder_count": {
        const counts = await getReorderCounts([patientId], tenantId);
        const count = counts.get(patientId) || 0;
        matched = matchBehaviorCondition(count, rule.behavior_operator || rule.operator || ">=", rule.behavior_value || rule.value || "0", rule.behavior_value_end || rule.value_end);
        break;
      }
      default:
        matched = true; // 未知の条件タイプはスキップ
    }

    if (!matched) return false; // AND条件: 1つでも不一致なら false
  }

  return true;
}

/**
 * 指定ステップにジャンプ
 */
export async function jumpToStep(
  enrollmentId: number,
  targetStepOrder: number,
  scenarioId: number,
  tenantId: string | null
): Promise<void> {
  // ジャンプ先ステップの遅延を計算
  const { data: targetStep } = await withTenant(
    supabaseAdmin
      .from("step_items")
      .select("sort_order, delay_type, delay_value, send_time, step_type")
      .eq("scenario_id", scenarioId)
      .eq("sort_order", targetStepOrder)
      .maybeSingle(),
    tenantId
  );

  if (!targetStep) {
    // ジャンプ先が無い → 完了扱い
    await withTenant(
      supabaseAdmin
        .from("step_enrollments")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", enrollmentId),
      tenantId
    );
    return;
  }

  // condition ステップの場合は即時実行（遅延なし）
  const nextSendAt = targetStep.step_type === "condition"
    ? new Date().toISOString()
    : calculateNextSendAt(targetStep.delay_type, targetStep.delay_value, targetStep.send_time);

  await withTenant(
    supabaseAdmin
      .from("step_enrollments")
      .update({
        current_step_order: targetStepOrder,
        next_send_at: nextSendAt,
      })
      .eq("id", enrollmentId),
    tenantId
  );
}
