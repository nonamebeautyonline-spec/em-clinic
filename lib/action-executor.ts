// lib/action-executor.ts — タグ付与/シナリオ登録の共通実行関数
import { supabaseAdmin } from "@/lib/supabase";
import { withTenant, tenantPayload } from "@/lib/tenant";
import { checkTagTriggerScenarios, enrollPatient } from "@/lib/step-enrollment";

export interface ActionStep {
  type: "tag_add" | "tag_remove" | "scenario_enroll";
  tag_id?: number;
  scenario_id?: number;
}

export interface ActionSettings {
  enabled: boolean;
  steps: ActionStep[];
}

/** アクションステップを順次実行 */
export async function executeActions(
  settings: ActionSettings,
  patientId: string,
  lineUid?: string,
  tenantId?: string,
): Promise<void> {
  if (!settings.enabled || !settings.steps?.length) return;

  const tid = tenantId ?? null;

  for (const step of settings.steps) {
    try {
      switch (step.type) {
        case "tag_add": {
          if (!step.tag_id) break;
          // UPSERT: patient_tags テーブルには UNIQUE(patient_id, tag_id) 制約あり
          await supabaseAdmin.from("patient_tags").upsert(
            { ...tenantPayload(tid), patient_id: patientId, tag_id: step.tag_id },
            { onConflict: "patient_id,tag_id" },
          );
          // タグ追加トリガーのシナリオをチェック
          await checkTagTriggerScenarios(patientId, step.tag_id, lineUid, tenantId).catch(() => {});
          break;
        }
        case "tag_remove": {
          if (!step.tag_id) break;
          await withTenant(
            supabaseAdmin
              .from("patient_tags")
              .delete()
              .eq("patient_id", patientId)
              .eq("tag_id", step.tag_id),
            tid,
          );
          break;
        }
        case "scenario_enroll": {
          if (!step.scenario_id) break;
          // enrollPatient(scenarioId, patientId, lineUid, tenantId)
          await enrollPatient(step.scenario_id, patientId, lineUid, tenantId).catch(() => {});
          break;
        }
      }
    } catch (e) {
      console.error(`[action-executor] step=${step.type} error:`, (e as Error).message);
    }
  }
}
