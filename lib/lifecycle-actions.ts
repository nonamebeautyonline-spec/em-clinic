// lib/lifecycle-actions.ts — ライフサイクルイベント共通アクション実行

import { supabaseAdmin } from "@/lib/supabase";
import { pushMessage } from "@/lib/line-push";
import { linkRichMenuToUser } from "@/lib/line-richmenu";
import { withTenant, tenantPayload } from "@/lib/tenant";
import { sanitizeFlexContents } from "@/lib/flex-sanitize";

// 条件ルール型（ConditionBuilder UIと同一構造）
export interface ConditionRule {
  type: "tag" | "mark" | "name" | "registered_date" | "field"
    | "visit_count" | "purchase_amount" | "last_visit" | "reorder_count"
    | "intake_status" | "reservation_status";
  tag_ids?: number[];
  tag_match?: "any_include" | "all_include" | "any_exclude" | "all_exclude";
  mark_values?: string[];
  mark_match?: "any_match" | "all_match" | "any_exclude" | "all_exclude";
  name_operator?: "contains" | "not_contains" | "equals";
  name_value?: string;
}

export interface StepCondition {
  enabled: boolean;
  rules: ConditionRule[];
}

export interface ActionStep {
  type: "send_text" | "send_template" | "tag_add" | "tag_remove" | "mark_change" | "menu_change";
  content?: string;
  template_id?: number;
  tag_id?: number;
  tag_name?: string;
  mark?: string;
  menu_id?: string;
  menu_name?: string;
  condition?: StepCondition;
}

/** 患者のタグID・マーク・名前を取得（条件評価用） */
async function getPatientContext(patientId: string, tenantId: string | null) {
  const [{ data: ptTags }, { data: ptMark }, { data: ptInfo }] = await Promise.all([
    withTenant(supabaseAdmin.from("patient_tags").select("tag_id").eq("patient_id", patientId), tenantId),
    withTenant(supabaseAdmin.from("patient_marks").select("mark").eq("patient_id", patientId).maybeSingle(), tenantId),
    withTenant(supabaseAdmin.from("patients").select("name").eq("patient_id", patientId).maybeSingle(), tenantId),
  ]);
  return {
    tagIds: (ptTags || []).map((t: { tag_id: number }) => t.tag_id),
    mark: ptMark?.mark || "none",
    name: ptInfo?.name || "",
  };
}

/** 条件ルールを評価（全ルールAND） */
export function evaluateConditionRules(
  rules: ConditionRule[],
  ctx: { tagIds: number[]; mark: string; name: string }
): boolean {
  return rules.every(rule => {
    switch (rule.type) {
      case "tag": {
        if (!rule.tag_ids || rule.tag_ids.length === 0) return true;
        const hasAny = rule.tag_ids.some(id => ctx.tagIds.includes(id));
        const hasAll = rule.tag_ids.every(id => ctx.tagIds.includes(id));
        switch (rule.tag_match) {
          case "any_include": return hasAny;
          case "all_include": return hasAll;
          case "any_exclude": return !hasAny;
          case "all_exclude": return !hasAll;
          default: return hasAny;
        }
      }
      case "mark": {
        if (!rule.mark_values || rule.mark_values.length === 0) return true;
        const matchesAny = rule.mark_values.includes(ctx.mark);
        switch (rule.mark_match) {
          case "any_match": return matchesAny;
          case "any_exclude": return !matchesAny;
          default: return matchesAny;
        }
      }
      case "name": {
        if (!rule.name_value) return true;
        switch (rule.name_operator) {
          case "contains": return ctx.name.includes(rule.name_value);
          case "not_contains": return !ctx.name.includes(rule.name_value);
          case "equals": return ctx.name === rule.name_value;
          default: return true;
        }
      }
      default:
        // 未対応の条件タイプはスキップ（trueで通す）
        return true;
    }
  });
}

/** ステップの条件をチェック（条件なし or 無効 → true） */
function shouldExecuteStep(
  step: ActionStep,
  ctx: { tagIds: number[]; mark: string; name: string }
): boolean {
  if (!step.condition?.enabled || !step.condition.rules || step.condition.rules.length === 0) {
    return true;
  }
  return evaluateConditionRules(step.condition.rules, ctx);
}

interface LifecycleActionResult {
  executed: boolean;
  actionDetails: string[];
}

/**
 * friend_add_settings から指定キーの設定を取得し、ステップを実行する。
 * 設定がない or enabled=false → { executed: false, actionDetails: [] }
 */
export async function executeLifecycleActions(params: {
  settingKey: string;
  patientId: string;
  lineUserId: string;
  patientName?: string;
  tenantId: string | null;
  assignedBy: string;
}): Promise<LifecycleActionResult> {
  const { settingKey, patientId, lineUserId, patientName, tenantId, assignedBy } = params;

  // 設定を取得
  const { data: setting } = await withTenant(
    supabaseAdmin
      .from("friend_add_settings")
      .select("setting_value, enabled")
      .eq("setting_key", settingKey)
      .maybeSingle(),
    tenantId
  );

  if (!setting?.enabled) {
    return { executed: false, actionDetails: [] };
  }

  const val = setting.setting_value as {
    greeting_message?: string;
    assign_tags?: number[];
    assign_mark?: string;
    menu_change?: string;
    steps?: ActionStep[];
  };

  // steps が空なら旧フォーマットから変換
  const steps = val.steps && val.steps.length > 0
    ? val.steps
    : convertLegacyToSteps(val);

  if (steps.length === 0) {
    return { executed: false, actionDetails: [] };
  }

  // 条件評価に必要な患者コンテキストを取得
  const patientCtx = await getPatientContext(patientId, tenantId);
  const actionDetails: string[] = [];

  for (const step of steps) {
    if (!shouldExecuteStep(step, patientCtx)) continue;
    switch (step.type) {
      case "send_text": {
        if (!step.content) break;
        const text = step.content
          .replace(/\{name\}/g, patientName || "")
          .replace(/\{patient_id\}/g, patientId);
        await pushMessage(lineUserId, [{ type: "text", text }], tenantId ?? undefined);
        actionDetails.push(`テキスト送信`);
        break;
      }

      case "send_template": {
        if (!step.template_id) break;
        const { data: tmpl } = await withTenant(
          supabaseAdmin
            .from("message_templates")
            .select("content, message_type, flex_content")
            .eq("id", step.template_id)
            .maybeSingle(),
          tenantId
        );
        if (tmpl) {
          if (tmpl.message_type === "flex" && tmpl.flex_content) {
            await pushMessage(lineUserId, [{
              type: "flex",
              altText: tmpl.content || "メッセージ",
              contents: sanitizeFlexContents(tmpl.flex_content) as Record<string, unknown>,
            }], tenantId ?? undefined);
          } else {
            const text = (tmpl.content || "")
              .replace(/\{name\}/g, patientName || "")
              .replace(/\{patient_id\}/g, patientId);
            await pushMessage(lineUserId, [{ type: "text", text }], tenantId ?? undefined);
          }
          actionDetails.push(`テンプレート送信`);
        }
        break;
      }

      case "tag_add": {
        if (!step.tag_id) break;
        await supabaseAdmin
          .from("patient_tags")
          .upsert(
            { ...tenantPayload(tenantId), patient_id: patientId, tag_id: step.tag_id, assigned_by: assignedBy },
            { onConflict: "patient_id,tag_id" }
          );
        actionDetails.push(`タグ追加[${step.tag_name || step.tag_id}]`);
        break;
      }

      case "tag_remove": {
        if (!step.tag_id) break;
        const q = supabaseAdmin
          .from("patient_tags")
          .delete()
          .eq("patient_id", patientId)
          .eq("tag_id", step.tag_id);
        await withTenant(q, tenantId);
        actionDetails.push(`タグ削除[${step.tag_name || step.tag_id}]`);
        break;
      }

      case "mark_change": {
        if (!step.mark || step.mark === "none") break;
        await supabaseAdmin
          .from("patient_marks")
          .upsert(
            {
              ...tenantPayload(tenantId),
              patient_id: patientId,
              mark: step.mark,
              updated_by: assignedBy,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "patient_id" }
          );
        actionDetails.push(`対応マーク[${step.mark}]`);
        break;
      }

      case "menu_change": {
        if (!step.menu_id) break;
        const { data: menu } = await withTenant(
          supabaseAdmin
            .from("rich_menus")
            .select("line_rich_menu_id, name")
            .eq("id", Number(step.menu_id))
            .maybeSingle(),
          tenantId
        );
        if (menu?.line_rich_menu_id) {
          await linkRichMenuToUser(lineUserId, menu.line_rich_menu_id, tenantId ?? undefined);
          actionDetails.push(`メニュー変更[${menu.name || step.menu_id}]`);
        }
        break;
      }
    }
  }

  return { executed: true, actionDetails };
}

/**
 * 任意のステップ配列を直接実行する（流入経路アクション等で使用）
 * friend_add_settings に依存しない汎用版
 */
export async function executeActionSteps(params: {
  steps: ActionStep[];
  patientId: string;
  lineUserId: string;
  patientName?: string;
  tenantId: string | null;
  assignedBy: string;
}): Promise<{ actionDetails: string[] }> {
  const { steps, patientId, lineUserId, patientName, tenantId, assignedBy } = params;
  const actionDetails: string[] = [];

  // 条件付きステップがある場合のみ患者コンテキストを取得
  const hasConditions = steps.some(s => s.condition?.enabled);
  const patientCtx = hasConditions ? await getPatientContext(patientId, tenantId) : null;

  for (const step of steps) {
    if (patientCtx && !shouldExecuteStep(step, patientCtx)) continue;
    switch (step.type) {
      case "send_text": {
        if (!step.content) break;
        const text = step.content
          .replace(/\{name\}/g, patientName || "")
          .replace(/\{patient_id\}/g, patientId);
        await pushMessage(lineUserId, [{ type: "text", text }], tenantId ?? undefined);
        actionDetails.push(`テキスト送信`);
        break;
      }
      case "send_template": {
        if (!step.template_id) break;
        const { data: tmpl } = await withTenant(
          supabaseAdmin
            .from("message_templates")
            .select("content, message_type, flex_content")
            .eq("id", step.template_id)
            .maybeSingle(),
          tenantId
        );
        if (tmpl) {
          if (tmpl.message_type === "flex" && tmpl.flex_content) {
            await pushMessage(lineUserId, [{
              type: "flex",
              altText: tmpl.content || "メッセージ",
              contents: sanitizeFlexContents(tmpl.flex_content) as Record<string, unknown>,
            }], tenantId ?? undefined);
          } else {
            const text = (tmpl.content || "")
              .replace(/\{name\}/g, patientName || "")
              .replace(/\{patient_id\}/g, patientId);
            await pushMessage(lineUserId, [{ type: "text", text }], tenantId ?? undefined);
          }
          actionDetails.push(`テンプレート送信`);
        }
        break;
      }
      case "tag_add": {
        if (!step.tag_id) break;
        await supabaseAdmin
          .from("patient_tags")
          .upsert(
            { ...tenantPayload(tenantId), patient_id: patientId, tag_id: step.tag_id, assigned_by: assignedBy },
            { onConflict: "patient_id,tag_id" }
          );
        actionDetails.push(`タグ追加[${step.tag_name || step.tag_id}]`);
        break;
      }
      case "tag_remove": {
        if (!step.tag_id) break;
        const q = supabaseAdmin
          .from("patient_tags")
          .delete()
          .eq("patient_id", patientId)
          .eq("tag_id", step.tag_id);
        await withTenant(q, tenantId);
        actionDetails.push(`タグ削除[${step.tag_name || step.tag_id}]`);
        break;
      }
      case "mark_change": {
        if (!step.mark || step.mark === "none") break;
        await supabaseAdmin
          .from("patient_marks")
          .upsert(
            {
              ...tenantPayload(tenantId),
              patient_id: patientId,
              mark: step.mark,
              updated_by: assignedBy,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "patient_id" }
          );
        actionDetails.push(`対応マーク[${step.mark}]`);
        break;
      }
      case "menu_change": {
        if (!step.menu_id) break;
        const { data: menu } = await withTenant(
          supabaseAdmin
            .from("rich_menus")
            .select("line_rich_menu_id, name")
            .eq("id", Number(step.menu_id))
            .maybeSingle(),
          tenantId
        );
        if (menu?.line_rich_menu_id) {
          await linkRichMenuToUser(lineUserId, menu.line_rich_menu_id, tenantId ?? undefined);
          actionDetails.push(`メニュー変更[${menu.name || step.menu_id}]`);
        }
        break;
      }
    }
  }

  return { actionDetails };
}

/** 旧フォーマット（greeting_message等）→ steps に変換 */
function convertLegacyToSteps(val: {
  greeting_message?: string;
  assign_tags?: number[];
  assign_mark?: string;
  menu_change?: string;
}): ActionStep[] {
  const steps: ActionStep[] = [];
  if (val.greeting_message) {
    steps.push({ type: "send_text", content: val.greeting_message });
  }
  if (val.menu_change) {
    steps.push({ type: "menu_change", menu_id: val.menu_change });
  }
  if (val.assign_mark && val.assign_mark !== "none") {
    steps.push({ type: "mark_change", mark: val.assign_mark });
  }
  if (val.assign_tags && val.assign_tags.length > 0) {
    for (const tagId of val.assign_tags) {
      steps.push({ type: "tag_add", tag_id: tagId });
    }
  }
  return steps;
}
