// lib/chatbot-engine.ts — シナリオ型チャットボットエンジン
// ノードタイプ: message(テキスト送信), question(選択肢表示), action(タグ付け等), condition(分岐)

import { supabaseAdmin } from "@/lib/supabase";
import { withTenant, tenantPayload } from "@/lib/tenant";

/* ---------- 型定義 ---------- */

export interface ChatbotNode {
  id: string;
  scenario_id: string;
  tenant_id: string;
  node_type: "message" | "question" | "action" | "condition";
  position_x: number;
  position_y: number;
  data: ChatbotNodeData;
  next_node_id: string | null;
  created_at: string;
}

export interface ChatbotNodeData {
  // message ノード
  text?: string;
  // question ノード
  question_text?: string;
  buttons?: { label: string; value: string; next_node_id?: string }[];
  // action ノード
  action_type?: "tag_add" | "tag_remove" | "api_call";
  tag_id?: string;
  api_url?: string;
  // condition ノード
  conditions?: { field: string; operator: string; value: string; next_node_id?: string }[];
  default_next_node_id?: string;
  // 共通
  [key: string]: unknown;
}

export interface ChatbotSession {
  id: string;
  tenant_id: string;
  patient_id: string;
  scenario_id: string;
  current_node_id: string | null;
  context: Record<string, unknown>;
  started_at: string;
  completed_at: string | null;
}

export interface ChatbotMessage {
  type: "text" | "question";
  text: string;
  buttons?: { label: string; value: string }[];
}

/* ---------- シナリオ開始 ---------- */

export async function startScenario(
  patientId: string,
  scenarioId: string,
  tenantId: string | null = null,
): Promise<ChatbotSession | null> {
  // シナリオ存在確認
  const { data: scenario } = await withTenant(
    supabaseAdmin
      .from("chatbot_scenarios")
      .select("id, is_active")
      .eq("id", scenarioId)
      .maybeSingle(),
    tenantId,
  );
  if (!scenario || !scenario.is_active) return null;

  // 既存の未完了セッションがあれば完了にする
  await withTenant(
    supabaseAdmin
      .from("chatbot_sessions")
      .update({ completed_at: new Date().toISOString() })
      .eq("patient_id", patientId)
      .eq("scenario_id", scenarioId)
      .is("completed_at", null),
    tenantId,
  );

  // 最初のノードを取得（position_y が最小のノード）
  const { data: firstNode } = await withTenant(
    supabaseAdmin
      .from("chatbot_nodes")
      .select("id")
      .eq("scenario_id", scenarioId)
      .order("position_y", { ascending: true })
      .order("position_x", { ascending: true })
      .limit(1)
      .maybeSingle(),
    tenantId,
  );

  // セッション作成
  const { data: session, error } = await supabaseAdmin
    .from("chatbot_sessions")
    .insert({
      ...tenantPayload(tenantId),
      patient_id: patientId,
      scenario_id: scenarioId,
      current_node_id: firstNode?.id || null,
      context: {},
    })
    .select()
    .single();

  if (error) {
    console.error("[chatbot-engine] セッション作成エラー:", error.message);
    return null;
  }

  return session as ChatbotSession;
}

/* ---------- 現在ノードのメッセージ取得 ---------- */

export async function getNextMessage(
  sessionId: string,
  tenantId: string | null = null,
): Promise<ChatbotMessage | null> {
  // セッション取得
  const { data: session } = await withTenant(
    supabaseAdmin
      .from("chatbot_sessions")
      .select("*")
      .eq("id", sessionId)
      .is("completed_at", null)
      .maybeSingle(),
    tenantId,
  );

  if (!session || !session.current_node_id) return null;

  // 現在ノード取得
  const { data: node } = await supabaseAdmin
    .from("chatbot_nodes")
    .select("*")
    .eq("id", session.current_node_id)
    .maybeSingle();

  if (!node) return null;

  return nodeToMessage(node as ChatbotNode);
}

/* ---------- ユーザー入力処理 ---------- */

export async function processUserInput(
  sessionId: string,
  input: string,
  tenantId: string | null = null,
): Promise<ChatbotMessage | null> {
  // セッション取得
  const { data: session } = await withTenant(
    supabaseAdmin
      .from("chatbot_sessions")
      .select("*")
      .eq("id", sessionId)
      .is("completed_at", null)
      .maybeSingle(),
    tenantId,
  );

  if (!session || !session.current_node_id) return null;

  // 現在ノード取得
  const { data: currentNode } = await supabaseAdmin
    .from("chatbot_nodes")
    .select("*")
    .eq("id", session.current_node_id)
    .maybeSingle();

  if (!currentNode) return null;

  const node = currentNode as ChatbotNode;

  // 次のノードIDを決定
  let nextNodeId = node.next_node_id;

  switch (node.node_type) {
    case "question": {
      // ユーザーの選択に基づいて次ノードを決定
      const buttons = node.data.buttons || [];
      const matched = buttons.find(
        (b) => b.value === input || b.label === input,
      );
      if (matched?.next_node_id) {
        nextNodeId = matched.next_node_id;
      }
      // コンテキストにユーザー回答を保存
      const ctx = (session.context as Record<string, unknown>) || {};
      ctx[`answer_${node.id}`] = input;
      await supabaseAdmin
        .from("chatbot_sessions")
        .update({ context: ctx })
        .eq("id", sessionId);
      break;
    }
    case "condition": {
      // 条件評価で次ノードを決定
      const conditions = node.data.conditions || [];
      const ctx = (session.context as Record<string, unknown>) || {};
      let conditionMatched = false;
      for (const cond of conditions) {
        const fieldValue = String(ctx[cond.field] || "");
        if (evaluateCondition(fieldValue, cond.operator, cond.value)) {
          nextNodeId = cond.next_node_id || null;
          conditionMatched = true;
          break;
        }
      }
      if (!conditionMatched && node.data.default_next_node_id) {
        nextNodeId = node.data.default_next_node_id;
      }
      break;
    }
    case "action": {
      // アクション実行（タグ付け等）
      await executeAction(node, session.patient_id, tenantId);
      break;
    }
    // message: そのまま next_node_id へ
  }

  // 次ノードへ遷移（連続的にmessage/action/conditionノードを処理）
  return await advanceToNextInteractiveNode(sessionId, nextNodeId, session.patient_id, tenantId);
}

/* ---------- 次のインタラクティブノードまで進む ---------- */

async function advanceToNextInteractiveNode(
  sessionId: string,
  nextNodeId: string | null | undefined,
  patientId: string,
  tenantId: string | null,
): Promise<ChatbotMessage | null> {
  let currentNextId = nextNodeId;
  const messages: ChatbotMessage[] = [];
  let maxIterations = 20; // 無限ループ防止

  while (currentNextId && maxIterations-- > 0) {
    const { data: nextNode } = await supabaseAdmin
      .from("chatbot_nodes")
      .select("*")
      .eq("id", currentNextId)
      .maybeSingle();

    if (!nextNode) {
      // ノードが見つからない → セッション完了
      await completeSession(sessionId);
      return messages.length > 0 ? messages[messages.length - 1] : null;
    }

    const typed = nextNode as ChatbotNode;

    switch (typed.node_type) {
      case "action": {
        // アクション実行して次へ
        await executeAction(typed, patientId, tenantId);
        currentNextId = typed.next_node_id;
        continue;
      }
      case "condition": {
        // 条件評価して次へ
        const { data: sess } = await supabaseAdmin
          .from("chatbot_sessions")
          .select("context")
          .eq("id", sessionId)
          .maybeSingle();
        const ctx = (sess?.context as Record<string, unknown>) || {};
        const conditions = typed.data.conditions || [];
        let matched = false;
        for (const cond of conditions) {
          const fieldValue = String(ctx[cond.field] || "");
          if (evaluateCondition(fieldValue, cond.operator, cond.value)) {
            currentNextId = cond.next_node_id || null;
            matched = true;
            break;
          }
        }
        if (!matched) {
          currentNextId = typed.data.default_next_node_id || typed.next_node_id;
        }
        continue;
      }
      case "message":
      case "question": {
        // ユーザーに表示するノード → セッション更新して返す
        await supabaseAdmin
          .from("chatbot_sessions")
          .update({ current_node_id: typed.id })
          .eq("id", sessionId);

        return nodeToMessage(typed);
      }
    }
  }

  // 次ノードなし → セッション完了
  await completeSession(sessionId);
  return null;
}

/* ---------- セッション完了 ---------- */

async function completeSession(sessionId: string): Promise<void> {
  await supabaseAdmin
    .from("chatbot_sessions")
    .update({
      completed_at: new Date().toISOString(),
      current_node_id: null,
    })
    .eq("id", sessionId);
}

/* ---------- ノード→メッセージ変換 ---------- */

function nodeToMessage(node: ChatbotNode): ChatbotMessage {
  switch (node.node_type) {
    case "message":
      return {
        type: "text",
        text: node.data.text || "",
      };
    case "question":
      return {
        type: "question",
        text: node.data.question_text || "",
        buttons: (node.data.buttons || []).map((b) => ({
          label: b.label,
          value: b.value,
        })),
      };
    default:
      return { type: "text", text: "" };
  }
}

/* ---------- 条件評価 ---------- */

function evaluateCondition(
  fieldValue: string,
  operator: string,
  condValue: string,
): boolean {
  switch (operator) {
    case "eq":
    case "equals":
      return fieldValue === condValue;
    case "neq":
    case "not_equals":
      return fieldValue !== condValue;
    case "contains":
      return fieldValue.includes(condValue);
    case "not_contains":
      return !fieldValue.includes(condValue);
    case "gt":
      return Number(fieldValue) > Number(condValue);
    case "lt":
      return Number(fieldValue) < Number(condValue);
    default:
      return false;
  }
}

/* ---------- アクション実行 ---------- */

async function executeAction(
  node: ChatbotNode,
  patientId: string,
  tenantId: string | null,
): Promise<void> {
  const { action_type, tag_id } = node.data;

  switch (action_type) {
    case "tag_add": {
      if (!tag_id) break;
      // タグ付与（既存あればスキップ）
      await supabaseAdmin
        .from("patient_tags")
        .upsert(
          {
            ...tenantPayload(tenantId),
            patient_id: patientId,
            tag_id: tag_id,
          },
          { onConflict: "patient_id,tag_id" },
        )
        .then(() => {});
      break;
    }
    case "tag_remove": {
      if (!tag_id) break;
      await withTenant(
        supabaseAdmin
          .from("patient_tags")
          .delete()
          .eq("patient_id", patientId)
          .eq("tag_id", tag_id),
        tenantId,
      );
      break;
    }
    case "api_call": {
      const url = node.data.api_url;
      if (!url) break;
      try {
        await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ patient_id: patientId, node_id: node.id }),
        });
      } catch (e) {
        console.error("[chatbot-engine] API呼び出しエラー:", e);
      }
      break;
    }
  }
}

/* ---------- キーワードマッチでシナリオ検索 ---------- */

export async function findScenarioByKeyword(
  text: string,
  tenantId: string | null,
): Promise<{ id: string; name: string; trigger_keyword: string } | null> {
  const { data: scenarios } = await withTenant(
    supabaseAdmin
      .from("chatbot_scenarios")
      .select("id, name, trigger_keyword")
      .eq("is_active", true)
      .not("trigger_keyword", "is", null),
    tenantId,
  );

  if (!scenarios || scenarios.length === 0) return null;

  for (const s of scenarios) {
    if (!s.trigger_keyword) continue;
    // 完全一致または部分一致
    if (text === s.trigger_keyword || text.includes(s.trigger_keyword)) {
      return s;
    }
  }

  return null;
}

/* ---------- アクティブセッション取得 ---------- */

export async function getActiveSession(
  patientId: string,
  tenantId: string | null,
): Promise<ChatbotSession | null> {
  const { data } = await withTenant(
    supabaseAdmin
      .from("chatbot_sessions")
      .select("*")
      .eq("patient_id", patientId)
      .is("completed_at", null)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    tenantId,
  );

  return (data as ChatbotSession) || null;
}
