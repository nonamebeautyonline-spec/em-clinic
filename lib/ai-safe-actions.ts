// AI Safe Actions — write系操作を「提案→承認→実行」の3段階で処理
// 外部API呼び出しは行わず、ログ記録+DB操作のみ（安全）

import { supabaseAdmin } from "@/lib/supabase";

// ============================================================
// 型定義
// ============================================================

/** 安全アクション種別 */
export type SafeActionType =
  | "resend_payment_link"
  | "resend_questionnaire"
  | "create_staff_task"
  | "suggest_reservation_slots";

/** アクション提案 */
export interface SafeActionProposal {
  id: number;
  taskId: string;
  actionType: SafeActionType;
  actionParams: Record<string, unknown>;
  status: "proposed" | "approved" | "executed" | "rejected" | "failed";
  proposedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  executedAt?: string;
  executionResult?: Record<string, unknown>;
}

/** 有効なアクション種別一覧 */
const VALID_ACTION_TYPES: SafeActionType[] = [
  "resend_payment_link",
  "resend_questionnaire",
  "create_staff_task",
  "suggest_reservation_slots",
];

/** 各アクション種別の必須パラメータ定義 */
const ACTION_PARAM_RULES: Record<SafeActionType, { required: string[]; optional: string[] }> = {
  resend_payment_link: {
    required: ["patientId"],
    optional: ["paymentAmount", "paymentNote"],
  },
  resend_questionnaire: {
    required: ["patientId"],
    optional: ["questionnaireType"],
  },
  create_staff_task: {
    required: ["title", "assigneeId"],
    optional: ["description", "priority", "dueDate"],
  },
  suggest_reservation_slots: {
    required: ["patientId"],
    optional: ["preferredDate", "preferredTime", "department"],
  },
};

// ============================================================
// アクションパラメータバリデーション（純ロジック）
// ============================================================

/**
 * アクション種別・パラメータのバリデーション
 */
export function validateActionParams(
  actionType: SafeActionType,
  params: Record<string, unknown>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // アクション種別チェック
  if (!VALID_ACTION_TYPES.includes(actionType)) {
    errors.push(`不明なアクション種別: ${actionType}`);
    return { valid: false, errors };
  }

  const rules = ACTION_PARAM_RULES[actionType];

  // 必須パラメータチェック
  for (const key of rules.required) {
    if (params[key] === undefined || params[key] === null || params[key] === "") {
      errors.push(`必須パラメータが不足: ${key}`);
    }
  }

  // 未知パラメータ警告（エラーにはしない）
  const allKnown = new Set([...rules.required, ...rules.optional]);
  for (const key of Object.keys(params)) {
    if (!allKnown.has(key)) {
      errors.push(`不明なパラメータ: ${key}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

// ============================================================
// アクション提案の作成
// ============================================================

/**
 * アクション提案をDBに保存（実行はしない）
 * @returns proposal_id
 */
export async function proposeAction(
  tenantId: string,
  taskId: string,
  actionType: SafeActionType,
  params: Record<string, unknown>
): Promise<number> {
  // バリデーション
  const validation = validateActionParams(actionType, params);
  if (!validation.valid) {
    throw new Error(`パラメータ不正: ${validation.errors.join(", ")}`);
  }

  const { data, error } = await supabaseAdmin
    .from("ai_safe_action_proposals")
    .insert({
      tenant_id: tenantId,
      task_id: taskId,
      action_type: actionType,
      action_params: params,
      status: "proposed",
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`提案保存失敗: ${error?.message || "データなし"}`);
  }

  return data.id;
}

// ============================================================
// 提案の承認
// ============================================================

/**
 * 提案を承認（ステータスをapprovedに変更）
 */
export async function approveAction(
  proposalId: number,
  approvedBy: string
): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from("ai_safe_action_proposals")
    .update({
      status: "approved",
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
    })
    .eq("id", proposalId)
    .eq("status", "proposed");

  if (error) {
    console.error("[SafeActions] 承認失敗:", error);
    return false;
  }
  return true;
}

// ============================================================
// 承認済み提案の実行
// ============================================================

/**
 * 承認済み提案を実行
 * 各アクションの実行ロジックはログ記録のみ（外部API呼び出しなし）
 */
export async function executeAction(
  proposalId: number
): Promise<{ success: boolean; result: unknown }> {
  // 承認済み提案を取得
  const { data: proposal, error: fetchErr } = await supabaseAdmin
    .from("ai_safe_action_proposals")
    .select("*")
    .eq("id", proposalId)
    .eq("status", "approved")
    .single();

  if (fetchErr || !proposal) {
    return { success: false, result: { error: "承認済み提案が見つかりません" } };
  }

  let executionResult: Record<string, unknown>;

  try {
    // アクション種別ごとの処理（全てログ記録のみ）
    switch (proposal.action_type as SafeActionType) {
      case "resend_payment_link":
        executionResult = {
          action: "resend_payment_link",
          patientId: proposal.action_params.patientId,
          message: "決済リンク再送信をログに記録（実際のSquare連携は別途）",
          loggedAt: new Date().toISOString(),
        };
        break;

      case "resend_questionnaire":
        executionResult = {
          action: "resend_questionnaire",
          patientId: proposal.action_params.patientId,
          message: "問診票再送信をログに記録",
          loggedAt: new Date().toISOString(),
        };
        break;

      case "create_staff_task": {
        // ai_tasksにスタッフタスクを作成
        const { data: task, error: taskErr } = await supabaseAdmin
          .from("ai_tasks")
          .insert({
            tenant_id: proposal.tenant_id,
            workflow_type: "staff-manual",
            status: "pending",
            input: {
              title: proposal.action_params.title,
              description: proposal.action_params.description || "",
            },
            handoff_summary: {
              targetType: "human",
              targetId: proposal.action_params.assigneeId,
              summary: String(proposal.action_params.title),
              urgency: proposal.action_params.priority || "medium",
              actionItems: [],
              context: {},
            },
            handoff_status: "pending",
            output_evidence: [],
            trace: {},
            input_tokens: 0,
            output_tokens: 0,
            queue_name: "staff",
            assignee_id: proposal.action_params.assigneeId,
          })
          .select("id")
          .single();

        if (taskErr) {
          throw new Error(`スタッフタスク作成失敗: ${taskErr.message}`);
        }

        executionResult = {
          action: "create_staff_task",
          taskId: task?.id,
          message: "スタッフタスクを作成しました",
          loggedAt: new Date().toISOString(),
        };
        break;
      }

      case "suggest_reservation_slots":
        executionResult = {
          action: "suggest_reservation_slots",
          patientId: proposal.action_params.patientId,
          message: "予約枠提案をログに記録",
          loggedAt: new Date().toISOString(),
        };
        break;

      default:
        executionResult = { error: `未対応アクション: ${proposal.action_type}` };
    }

    // 実行結果をDBに保存
    await supabaseAdmin
      .from("ai_safe_action_proposals")
      .update({
        status: "executed",
        executed_at: new Date().toISOString(),
        execution_result: executionResult,
      })
      .eq("id", proposalId);

    return { success: true, result: executionResult };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "不明なエラー";

    // 失敗ステータスに更新
    await supabaseAdmin
      .from("ai_safe_action_proposals")
      .update({
        status: "failed",
        execution_result: { error: errMsg },
      })
      .eq("id", proposalId);

    return { success: false, result: { error: errMsg } };
  }
}

// ============================================================
// 提案の却下
// ============================================================

/**
 * 提案を却下
 */
export async function rejectAction(proposalId: number): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from("ai_safe_action_proposals")
    .update({ status: "rejected" })
    .eq("id", proposalId)
    .eq("status", "proposed");

  if (error) {
    console.error("[SafeActions] 却下失敗:", error);
    return false;
  }
  return true;
}

// ============================================================
// 提案一覧
// ============================================================

/**
 * 提案一覧を取得
 */
export async function listActionProposals(
  filters?: { taskId?: string; status?: string; limit?: number }
): Promise<SafeActionProposal[]> {
  let query = supabaseAdmin
    .from("ai_safe_action_proposals")
    .select("*")
    .order("proposed_at", { ascending: false })
    .limit(filters?.limit ?? 50);

  if (filters?.taskId) {
    query = query.eq("task_id", filters.taskId);
  }
  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[SafeActions] 一覧取得エラー:", error);
    return [];
  }

  return (data || []).map(mapRowToProposal);
}

// ============================================================
// ヘルパー
// ============================================================

/** DBレコード → SafeActionProposal マッピング */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRowToProposal(row: any): SafeActionProposal {
  return {
    id: row.id,
    taskId: row.task_id,
    actionType: row.action_type,
    actionParams: row.action_params || {},
    status: row.status,
    proposedAt: row.proposed_at,
    approvedBy: row.approved_by || undefined,
    approvedAt: row.approved_at || undefined,
    executedAt: row.executed_at || undefined,
    executionResult: row.execution_result || undefined,
  };
}
