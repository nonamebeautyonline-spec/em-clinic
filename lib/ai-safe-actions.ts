/**
 * AI Safe Actions — AIが提案するwrite系アクションの管理モジュール
 *
 * AIが返信ドラフト生成時に「支払リンク再送」「問診再送」等のアクションを提案し、
 * スタッフが承認した場合のみ実行する仕組み。
 */

import { supabaseAdmin } from "@/lib/supabase";
import { withTenant, tenantPayload } from "@/lib/tenant";
import { pushMessage } from "@/lib/line-push";

// ---------------------------------------------------------------------------
// 定数・型定義
// ---------------------------------------------------------------------------

/** アクション定義 */
export const SAFE_ACTIONS = {
  resend_payment_link: {
    label: "支払リンク再送",
    description: "患者への支払いリンクを再送します",
  },
  resend_questionnaire: {
    label: "問診再送",
    description: "患者への問診フォームリンクを再送します",
  },
} as const;

export type SafeActionType = keyof typeof SAFE_ACTIONS;

export interface ProposedAction {
  id: number;
  draft_id: number;
  action_type: SafeActionType;
  action_params: Record<string, string>;
  status: "pending" | "approved" | "rejected" | "executed" | "failed";
  approved_by: string | null;
  approved_at: string | null;
  execution_result: Record<string, unknown> | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// 公開関数
// ---------------------------------------------------------------------------

/**
 * アクションを提案（pending状態でINSERT）
 */
export async function proposeAction(params: {
  tenantId: string | null;
  draftId: number;
  actionType: SafeActionType;
  actionParams: Record<string, string>;
}): Promise<ProposedAction | null> {
  const { tenantId, draftId, actionType, actionParams } = params;

  const { data, error } = await withTenant(
    supabaseAdmin.from("ai_proposed_actions").insert({
      ...tenantPayload(tenantId),
      draft_id: draftId,
      action_type: actionType,
      action_params: actionParams,
      status: "pending",
    }).select().single(),
    tenantId,
  );

  if (error) {
    console.error("[ai-safe-actions] proposeAction 失敗:", error.message);
    return null;
  }

  return data as ProposedAction;
}

/**
 * アクションを承認して実行する
 */
export async function approveAndExecuteAction(
  actionId: number,
  approvedBy: string,
  tenantId: string | null,
): Promise<{ success: boolean; result: Record<string, unknown> }> {
  // 1. 対象アクションを取得し、pending であることを確認
  const { data: action, error: fetchError } = await withTenant(
    supabaseAdmin
      .from("ai_proposed_actions")
      .select("*")
      .eq("id", actionId)
      .single(),
    tenantId,
  );

  if (fetchError || !action) {
    return { success: false, result: { error: "アクションが見つかりません" } };
  }

  if (action.status !== "pending") {
    return {
      success: false,
      result: { error: `アクションは既に ${action.status} 状態です` },
    };
  }

  // 2. 承認に更新
  await supabaseAdmin
    .from("ai_proposed_actions")
    .update({
      status: "approved",
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
    })
    .eq("id", actionId);

  // 3. アクションを実行
  try {
    const result = await executeAction(
      action.action_type as SafeActionType,
      action.action_params as Record<string, string>,
      tenantId,
    );

    // 4. 成功 → executed に更新
    await supabaseAdmin
      .from("ai_proposed_actions")
      .update({
        status: "executed",
        execution_result: result,
      })
      .eq("id", actionId);

    return { success: true, result };
  } catch (err) {
    // 5. 失敗 → failed に更新
    const errorResult = {
      error: err instanceof Error ? err.message : "不明なエラー",
    };

    await supabaseAdmin
      .from("ai_proposed_actions")
      .update({
        status: "failed",
        execution_result: errorResult,
      })
      .eq("id", actionId);

    return { success: false, result: errorResult };
  }
}

/**
 * アクションを却下する
 */
export async function rejectAction(actionId: number): Promise<void> {
  await supabaseAdmin
    .from("ai_proposed_actions")
    .update({ status: "rejected" })
    .eq("id", actionId);
}

/**
 * 指定ドラフトに紐づく提案アクション一覧を取得
 */
export async function getProposedActions(
  draftId: number,
  tenantId: string | null,
): Promise<ProposedAction[]> {
  const { data, error } = await withTenant(
    supabaseAdmin
      .from("ai_proposed_actions")
      .select("*")
      .eq("draft_id", draftId)
      .order("created_at", { ascending: true }),
    tenantId,
  );

  if (error) {
    console.error("[ai-safe-actions] getProposedActions 失敗:", error.message);
    return [];
  }

  return (data ?? []) as ProposedAction[];
}

// ---------------------------------------------------------------------------
// 内部関数
// ---------------------------------------------------------------------------

/**
 * アクションを実際に実行する（内部用）
 */
async function executeAction(
  actionType: SafeActionType,
  actionParams: Record<string, string>,
  tenantId: string | null,
): Promise<Record<string, unknown>> {
  switch (actionType) {
    case "resend_payment_link":
      return await executeResendPaymentLink(actionParams, tenantId);

    case "resend_questionnaire":
      return await executeResendQuestionnaire(actionParams, tenantId);

    default:
      throw new Error(`不明なアクション: ${actionType}`);
  }
}

/**
 * 支払リンク再送の実行
 */
async function executeResendPaymentLink(
  actionParams: Record<string, string>,
  tenantId: string | null,
): Promise<Record<string, unknown>> {
  const { patient_id, order_id } = actionParams;

  if (!patient_id || !order_id) {
    throw new Error("patient_id と order_id が必要です");
  }

  // 患者の line_uid を取得
  const { data: patient, error: patientError } = await supabaseAdmin
    .from("patients")
    .select("line_uid")
    .eq("id", patient_id)
    .single();

  if (patientError || !patient?.line_uid) {
    throw new Error("患者のLINE UIDが取得できません");
  }

  // 注文の payment_link を取得
  const { data: order, error: orderError } = await supabaseAdmin
    .from("orders")
    .select("payment_link")
    .eq("id", order_id)
    .single();

  if (orderError || !order?.payment_link) {
    throw new Error("支払いリンクが取得できません");
  }

  const lineUid = patient.line_uid;
  const paymentLink = order.payment_link;
  const messageText = `お支払いリンク: ${paymentLink}`;

  // LINE送信
  await pushMessage(
    lineUid,
    [{ type: "text", text: messageText }],
    tenantId ?? undefined,
  );

  // メッセージログに記録
  await supabaseAdmin.from("message_log").insert({
    ...tenantPayload(tenantId),
    patient_id,
    line_uid: lineUid,
    direction: "outgoing",
    event_type: "message",
    message_type: "text",
    content: messageText,
    status: "sent",
  });

  return { sent: true, patient_id, order_id };
}

/**
 * 問診再送の実行
 */
async function executeResendQuestionnaire(
  actionParams: Record<string, string>,
  tenantId: string | null,
): Promise<Record<string, unknown>> {
  const { patient_id } = actionParams;

  if (!patient_id) {
    throw new Error("patient_id が必要です");
  }

  // 患者の line_uid を取得
  const { data: patient, error: patientError } = await supabaseAdmin
    .from("patients")
    .select("line_uid")
    .eq("id", patient_id)
    .single();

  if (patientError || !patient?.line_uid) {
    throw new Error("患者のLINE UIDが取得できません");
  }

  const lineUid = patient.line_uid;

  // 問診フォームURLを構築（LIFFまたはWeb URL）
  const liffId = process.env.LIFF_ID_QUESTIONNAIRE;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://l-ope.jp";
  const url = liffId
    ? `https://liff.line.me/${liffId}?patient_id=${patient_id}`
    : `${baseUrl}/questionnaire?patient_id=${patient_id}`;

  const messageText = `問診フォーム: ${url}`;

  // LINE送信
  await pushMessage(
    lineUid,
    [{ type: "text", text: messageText }],
    tenantId ?? undefined,
  );

  // メッセージログに記録
  await supabaseAdmin.from("message_log").insert({
    ...tenantPayload(tenantId),
    patient_id,
    line_uid: lineUid,
    direction: "outgoing",
    event_type: "message",
    message_type: "text",
    content: messageText,
    status: "sent",
  });

  return { sent: true, patient_id };
}
