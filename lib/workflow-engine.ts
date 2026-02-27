// lib/workflow-engine.ts — ワークフロー自動化エンジン
// トリガーに応じてワークフローを実行し、各ステップを順に処理する

import { supabaseAdmin } from "@/lib/supabase";
import { pushMessage } from "@/lib/line-push";
import { linkRichMenuToUser } from "@/lib/line-richmenu";
import { withTenant, tenantPayload } from "@/lib/tenant";
import { sanitizeFlexContents } from "@/lib/flex-sanitize";

/* ---------- 型定義 ---------- */

/** ワークフローステップの種別 */
export type StepType =
  | "send_message"
  | "add_tag"
  | "remove_tag"
  | "switch_richmenu"
  | "wait"
  | "condition"
  | "webhook";

/** ワークフローのトリガー種別 */
export type TriggerType =
  | "reservation_completed"
  | "payment_completed"
  | "tag_added"
  | "form_submitted"
  | "scheduled"
  | "manual";

/** ワークフローのステータス */
export type WorkflowStatus = "draft" | "active" | "paused" | "archived";

/** 実行ステータス */
export type ExecutionStatus = "running" | "completed" | "failed" | "skipped" | "waiting";

/** ステップ設定: メッセージ送信 */
interface SendMessageConfig {
  message_type: "text" | "template";
  text?: string;
  template_id?: number;
}

/** ステップ設定: タグ操作 */
interface TagConfig {
  tag_id: number;
  tag_name?: string;
}

/** ステップ設定: リッチメニュー切替 */
interface SwitchRichmenuConfig {
  menu_id: number;
}

/** ステップ設定: 待機 */
interface WaitConfig {
  duration_minutes: number;
}

/** ステップ設定: 条件分岐 */
interface ConditionConfig {
  condition_type: "has_tag" | "in_segment" | "custom_field";
  tag_id?: number;
  segment_id?: number;
  field_name?: string;
  field_value?: string;
  operator?: "eq" | "neq" | "contains" | "gt" | "lt";
}

/** ステップ設定: Webhook */
interface WebhookConfig {
  url: string;
  headers?: Record<string, string>;
}

/** 汎用ステップ設定 */
export type StepConfig =
  | SendMessageConfig
  | TagConfig
  | SwitchRichmenuConfig
  | WaitConfig
  | ConditionConfig
  | WebhookConfig;

/** DBから取得するワークフローステップ行 */
interface WorkflowStepRow {
  id: string;
  workflow_id: string;
  sort_order: number;
  step_type: StepType;
  config: Record<string, any>;
}

/** トリガーデータ（実行時のコンテキスト） */
export interface TriggerData {
  patient_id?: string;
  line_user_id?: string;
  patient_name?: string;
  tag_id?: number;
  form_id?: number;
  reservation_id?: string;
  [key: string]: unknown;
}

/** ステップ実行結果 */
interface StepResult {
  success: boolean;
  skipped?: boolean;
  waiting?: boolean;
  detail?: string;
  error?: string;
}

/** ワークフロー実行結果 */
export interface WorkflowExecutionResult {
  execution_id: string;
  status: ExecutionStatus;
  steps_executed: number;
  steps_total: number;
  error?: string;
}

/* ---------- メイン実行関数 ---------- */

/**
 * ワークフローを実行する
 * @param workflowId ワークフローID
 * @param triggerData トリガー時のコンテキストデータ
 * @param tenantId テナントID
 */
export async function executeWorkflow(
  workflowId: string,
  triggerData: TriggerData,
  tenantId: string | null,
): Promise<WorkflowExecutionResult> {
  // ワークフロー取得
  const { data: workflow, error: wfError } = await withTenant(
    supabaseAdmin
      .from("workflows")
      .select("*")
      .eq("id", workflowId)
      .eq("status", "active"),
    tenantId,
  ).single();

  if (wfError || !workflow) {
    return {
      execution_id: "",
      status: "failed",
      steps_executed: 0,
      steps_total: 0,
      error: "ワークフローが見つからないか無効です",
    };
  }

  // ステップ取得（sort_order昇順）
  const { data: steps, error: stepsError } = await supabaseAdmin
    .from("workflow_steps")
    .select("*")
    .eq("workflow_id", workflowId)
    .order("sort_order", { ascending: true });

  if (stepsError || !steps || steps.length === 0) {
    return {
      execution_id: "",
      status: "skipped",
      steps_executed: 0,
      steps_total: 0,
      error: "ステップが設定されていません",
    };
  }

  // 実行ログ作成
  const { data: execution, error: execError } = await supabaseAdmin
    .from("workflow_executions")
    .insert({
      workflow_id: workflowId,
      patient_id: triggerData.patient_id || null,
      status: "running",
      trigger_data: triggerData,
      current_step: 0,
    })
    .select()
    .single();

  if (execError || !execution) {
    return {
      execution_id: "",
      status: "failed",
      steps_executed: 0,
      steps_total: steps.length,
      error: `実行ログの作成に失敗: ${execError?.message}`,
    };
  }

  // ステップを順番に実行
  let stepsExecuted = 0;
  let lastError: string | undefined;
  let finalStatus: ExecutionStatus = "completed";

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i] as WorkflowStepRow;

    // 実行ログの現在ステップを更新
    await supabaseAdmin
      .from("workflow_executions")
      .update({ current_step: i })
      .eq("id", execution.id);

    try {
      const result = await executeStep(step, triggerData, tenantId);

      if (result.waiting) {
        // waitステップ: 実行を中断し、後続Cronで再開
        finalStatus = "waiting";
        await supabaseAdmin
          .from("workflow_executions")
          .update({
            status: "waiting",
            current_step: i,
          })
          .eq("id", execution.id);
        return {
          execution_id: execution.id,
          status: "waiting",
          steps_executed: stepsExecuted,
          steps_total: steps.length,
        };
      }

      if (result.skipped) {
        // 条件分岐でスキップされた場合
        continue;
      }

      if (!result.success) {
        lastError = result.error;
        console.error(
          `[workflow-engine] ステップ実行エラー: workflow=${workflowId}, step=${step.id}, error=${result.error}`,
        );
        // エラー時は次のステップへ（停止しない）
      }

      stepsExecuted++;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      lastError = errorMsg;
      console.error(
        `[workflow-engine] ステップ例外: workflow=${workflowId}, step=${step.id}, error=${errorMsg}`,
      );
      stepsExecuted++;
    }
  }

  // 全ステップ完了
  if (lastError) {
    finalStatus = "failed";
  }

  await supabaseAdmin
    .from("workflow_executions")
    .update({
      status: finalStatus,
      current_step: steps.length,
      completed_at: new Date().toISOString(),
      error: lastError || null,
    })
    .eq("id", execution.id);

  return {
    execution_id: execution.id,
    status: finalStatus,
    steps_executed: stepsExecuted,
    steps_total: steps.length,
    error: lastError,
  };
}

/* ---------- ステップ実行 ---------- */

/**
 * 個別のステップを実行
 */
export async function executeStep(
  step: WorkflowStepRow,
  triggerData: TriggerData,
  tenantId: string | null,
): Promise<StepResult> {
  switch (step.step_type) {
    case "send_message":
      return executeSendMessage(step.config as SendMessageConfig, triggerData, tenantId);
    case "add_tag":
      return executeAddTag(step.config as TagConfig, triggerData, tenantId);
    case "remove_tag":
      return executeRemoveTag(step.config as TagConfig, triggerData, tenantId);
    case "switch_richmenu":
      return executeSwitchRichmenu(step.config as SwitchRichmenuConfig, triggerData, tenantId);
    case "wait":
      return executeWait(step.config as WaitConfig);
    case "condition":
      return executeCondition(step.config as ConditionConfig, triggerData, tenantId);
    case "webhook":
      return executeWebhook(step.config as WebhookConfig, triggerData);
    default:
      return { success: false, error: `不明なステップタイプ: ${step.step_type}` };
  }
}

/* ---------- 各ステップの実装 ---------- */

/** メッセージ送信 */
async function executeSendMessage(
  config: SendMessageConfig,
  triggerData: TriggerData,
  tenantId: string | null,
): Promise<StepResult> {
  const lineUserId = triggerData.line_user_id;
  if (!lineUserId) {
    return { success: false, error: "LINE IDが不明です" };
  }

  try {
    if (config.message_type === "template" && config.template_id) {
      // テンプレートからメッセージを取得して送信
      const { data: tmpl } = await withTenant(
        supabaseAdmin
          .from("message_templates")
          .select("content, message_type, flex_content")
          .eq("id", config.template_id)
          .maybeSingle(),
        tenantId,
      );
      if (!tmpl) {
        return { success: false, error: `テンプレートID=${config.template_id} が見つかりません` };
      }
      if (tmpl.message_type === "flex" && tmpl.flex_content) {
        await pushMessage(
          lineUserId,
          [
            {
              type: "flex",
              altText: tmpl.content || "メッセージ",
              contents: sanitizeFlexContents(tmpl.flex_content),
            },
          ],
          tenantId ?? undefined,
        );
      } else {
        const text = replaceVariables(tmpl.content || "", triggerData);
        await pushMessage(lineUserId, [{ type: "text", text }], tenantId ?? undefined);
      }
    } else if (config.text) {
      // 直接テキスト送信
      const text = replaceVariables(config.text, triggerData);
      await pushMessage(lineUserId, [{ type: "text", text }], tenantId ?? undefined);
    } else {
      return { success: false, error: "メッセージの内容が設定されていません" };
    }
    return { success: true, detail: "メッセージ送信完了" };
  } catch (err) {
    return { success: false, error: `メッセージ送信失敗: ${err instanceof Error ? err.message : String(err)}` };
  }
}

/** タグ追加 */
async function executeAddTag(
  config: TagConfig,
  triggerData: TriggerData,
  tenantId: string | null,
): Promise<StepResult> {
  const patientId = triggerData.patient_id;
  if (!patientId) {
    return { success: false, error: "患者IDが不明です" };
  }
  if (!config.tag_id) {
    return { success: false, error: "タグIDが設定されていません" };
  }

  try {
    await supabaseAdmin.from("patient_tags").upsert(
      {
        ...tenantPayload(tenantId),
        patient_id: patientId,
        tag_id: config.tag_id,
        assigned_by: "workflow",
      },
      { onConflict: "patient_id,tag_id" },
    );
    return { success: true, detail: `タグ追加: ${config.tag_name || config.tag_id}` };
  } catch (err) {
    return { success: false, error: `タグ追加失敗: ${err instanceof Error ? err.message : String(err)}` };
  }
}

/** タグ削除 */
async function executeRemoveTag(
  config: TagConfig,
  triggerData: TriggerData,
  tenantId: string | null,
): Promise<StepResult> {
  const patientId = triggerData.patient_id;
  if (!patientId) {
    return { success: false, error: "患者IDが不明です" };
  }
  if (!config.tag_id) {
    return { success: false, error: "タグIDが設定されていません" };
  }

  try {
    const q = supabaseAdmin
      .from("patient_tags")
      .delete()
      .eq("patient_id", patientId)
      .eq("tag_id", config.tag_id);
    await withTenant(q, tenantId);
    return { success: true, detail: `タグ削除: ${config.tag_name || config.tag_id}` };
  } catch (err) {
    return { success: false, error: `タグ削除失敗: ${err instanceof Error ? err.message : String(err)}` };
  }
}

/** リッチメニュー切替 */
async function executeSwitchRichmenu(
  config: SwitchRichmenuConfig,
  triggerData: TriggerData,
  tenantId: string | null,
): Promise<StepResult> {
  const lineUserId = triggerData.line_user_id;
  if (!lineUserId) {
    return { success: false, error: "LINE IDが不明です" };
  }
  if (!config.menu_id) {
    return { success: false, error: "メニューIDが設定されていません" };
  }

  try {
    const { data: menu } = await withTenant(
      supabaseAdmin
        .from("rich_menus")
        .select("line_rich_menu_id, name")
        .eq("id", config.menu_id)
        .maybeSingle(),
      tenantId,
    );
    if (!menu?.line_rich_menu_id) {
      return { success: false, error: `リッチメニューID=${config.menu_id} が見つかりません` };
    }
    await linkRichMenuToUser(lineUserId, menu.line_rich_menu_id, tenantId ?? undefined);
    return { success: true, detail: `リッチメニュー切替: ${menu.name || config.menu_id}` };
  } catch (err) {
    return { success: false, error: `リッチメニュー切替失敗: ${err instanceof Error ? err.message : String(err)}` };
  }
}

/** 待機（実行を中断してCronで再開するためのマーカー） */
async function executeWait(config: WaitConfig): Promise<StepResult> {
  // waitステップは実行ログに記録して中断
  // 実際の再開はCronジョブで行う（後日実装）
  return {
    success: true,
    waiting: true,
    detail: `${config.duration_minutes || 0}分待機`,
  };
}

/** 条件分岐 */
async function executeCondition(
  config: ConditionConfig,
  triggerData: TriggerData,
  tenantId: string | null,
): Promise<StepResult> {
  const patientId = triggerData.patient_id;
  if (!patientId) {
    return { success: false, error: "患者IDが不明です" };
  }

  try {
    let conditionMet = false;

    switch (config.condition_type) {
      case "has_tag": {
        if (!config.tag_id) {
          return { success: false, error: "条件のタグIDが未設定です" };
        }
        const { data: tagRow } = await withTenant(
          supabaseAdmin
            .from("patient_tags")
            .select("id")
            .eq("patient_id", patientId)
            .eq("tag_id", config.tag_id)
            .maybeSingle(),
          tenantId,
        );
        conditionMet = !!tagRow;
        break;
      }

      case "in_segment": {
        if (!config.segment_id) {
          return { success: false, error: "条件のセグメントIDが未設定です" };
        }
        // patient_segments テーブルでチェック
        const { data: segRow } = await withTenant(
          supabaseAdmin
            .from("patient_segments")
            .select("id")
            .eq("patient_id", patientId)
            .eq("segment_id", config.segment_id)
            .maybeSingle(),
          tenantId,
        );
        conditionMet = !!segRow;
        break;
      }

      case "custom_field": {
        // カスタムフィールドの比較（トリガーデータから取得）
        const fieldValue = triggerData[config.field_name || ""];
        const targetValue = config.field_value;
        const op = config.operator || "eq";

        switch (op) {
          case "eq":
            conditionMet = String(fieldValue) === String(targetValue);
            break;
          case "neq":
            conditionMet = String(fieldValue) !== String(targetValue);
            break;
          case "contains":
            conditionMet = String(fieldValue).includes(String(targetValue));
            break;
          case "gt":
            conditionMet = Number(fieldValue) > Number(targetValue);
            break;
          case "lt":
            conditionMet = Number(fieldValue) < Number(targetValue);
            break;
        }
        break;
      }

      default:
        return { success: false, error: `不明な条件タイプ: ${config.condition_type}` };
    }

    if (!conditionMet) {
      // 条件不一致: このステップをスキップ（次のステップへ）
      return { success: true, skipped: true, detail: "条件不一致のためスキップ" };
    }

    return { success: true, detail: "条件一致" };
  } catch (err) {
    return { success: false, error: `条件評価失敗: ${err instanceof Error ? err.message : String(err)}` };
  }
}

/** Webhook送信 */
async function executeWebhook(
  config: WebhookConfig,
  triggerData: TriggerData,
): Promise<StepResult> {
  if (!config.url) {
    return { success: false, error: "Webhook URLが設定されていません" };
  }

  try {
    const res = await fetch(config.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(config.headers || {}),
      },
      body: JSON.stringify({
        event: "workflow_webhook",
        trigger_data: triggerData,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!res.ok) {
      return { success: false, error: `Webhook応答エラー: ${res.status} ${res.statusText}` };
    }

    return { success: true, detail: `Webhook送信完了: ${config.url}` };
  } catch (err) {
    return { success: false, error: `Webhook送信失敗: ${err instanceof Error ? err.message : String(err)}` };
  }
}

/* ---------- ユーティリティ ---------- */

/**
 * テキスト内の変数を置換する
 * {name} → 患者名、{patient_id} → 患者ID
 */
function replaceVariables(text: string, triggerData: TriggerData): string {
  return text
    .replace(/\{name\}/g, triggerData.patient_name || "")
    .replace(/\{patient_id\}/g, triggerData.patient_id || "");
}

/**
 * 特定のトリガーに該当するアクティブなワークフローを検索して実行する
 * Webhook等から呼び出す用途
 */
export async function fireWorkflowTrigger(
  triggerType: TriggerType,
  triggerData: TriggerData,
  tenantId: string | null,
): Promise<WorkflowExecutionResult[]> {
  // アクティブなワークフローを検索
  const query = supabaseAdmin
    .from("workflows")
    .select("id, trigger_config")
    .eq("trigger_type", triggerType)
    .eq("status", "active");

  const { data: workflows } = await withTenant(query, tenantId);

  if (!workflows || workflows.length === 0) {
    return [];
  }

  const results: WorkflowExecutionResult[] = [];

  for (const wf of workflows) {
    // トリガー条件の追加フィルタリング
    if (!matchesTriggerConfig(wf.trigger_config, triggerData)) {
      continue;
    }

    const result = await executeWorkflow(wf.id, triggerData, tenantId);
    results.push(result);
  }

  return results;
}

/**
 * トリガー設定と実際のデータが一致するかチェック
 */
function matchesTriggerConfig(
  triggerConfig: Record<string, any> | null,
  triggerData: TriggerData,
): boolean {
  if (!triggerConfig || Object.keys(triggerConfig).length === 0) {
    // 設定なし = 常にマッチ
    return true;
  }

  // tag_added トリガー: 特定のタグIDにマッチするか
  if (triggerConfig.tag_id && triggerData.tag_id) {
    return triggerConfig.tag_id === triggerData.tag_id;
  }

  // form_submitted トリガー: 特定のフォームIDにマッチするか
  if (triggerConfig.form_id && triggerData.form_id) {
    return triggerConfig.form_id === triggerData.form_id;
  }

  return true;
}
