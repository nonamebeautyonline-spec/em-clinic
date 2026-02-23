// lib/lifecycle-actions.ts — ライフサイクルイベント共通アクション実行

import { supabaseAdmin } from "@/lib/supabase";
import { pushMessage } from "@/lib/line-push";
import { linkRichMenuToUser } from "@/lib/line-richmenu";
import { withTenant, tenantPayload } from "@/lib/tenant";

interface ActionStep {
  type: "send_text" | "send_template" | "tag_add" | "tag_remove" | "mark_change" | "menu_change";
  content?: string;
  template_id?: number;
  tag_id?: number;
  tag_name?: string;
  mark?: string;
  menu_id?: string;
  menu_name?: string;
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

  const actionDetails: string[] = [];

  for (const step of steps) {
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
              contents: tmpl.flex_content,
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
