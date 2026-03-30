// AI Conversation Merge
// クロスチャネルコンテキスト構築
// ケースに紐づく複数チャネルのタスク情報を統合し、プロンプト注入用テキストを生成

import { getCaseRelatedTasks } from "./ai-case-linking";
import { supabaseAdmin } from "@/lib/supabase";

export interface MergedContext {
  relatedTasks: Array<{
    taskId: string;
    channelType: string;
    workflowType: string;
    summary: string;
    createdAt: string;
  }>;
  combinedHistory: string; // プロンプト注入用の結合テキスト
  channelCount: number;
  firstContactAt: string | null;
}

/**
 * ケースIDからクロスチャネルコンテキストを構築
 * 関連タスクの output/handoff_summary を集約して、
 * LLMに注入可能な統合コンテキストを生成する
 */
export async function buildCrossChannelContext(caseId: string): Promise<MergedContext> {
  const tasks = await getCaseRelatedTasks(caseId);

  if (tasks.length === 0) {
    return {
      relatedTasks: [],
      combinedHistory: "",
      channelCount: 0,
      firstContactAt: null,
    };
  }

  // タスク詳細（output, handoff_summary）を取得
  const taskIds = tasks.map((t) => t.id);
  const { data: fullTasks } = await supabaseAdmin
    .from("ai_tasks")
    .select("id, output, handoff_summary, workflow_type, channel_type, created_at")
    .in("id", taskIds)
    .order("created_at", { ascending: true });

  const relatedTasks: MergedContext["relatedTasks"] = [];
  const historyLines: string[] = [];

  // チャネル種別のユニーク数をカウント
  const channelSet = new Set<string>();

  for (const task of fullTasks ?? []) {
    const summary = extractTaskSummary({
      output: task.output,
      handoff_summary: task.handoff_summary,
      workflow_type: task.workflow_type ?? "",
    });

    const channelType = task.channel_type ?? "line";
    channelSet.add(channelType);

    relatedTasks.push({
      taskId: task.id,
      channelType,
      workflowType: task.workflow_type ?? "",
      summary,
      createdAt: task.created_at,
    });

    // 履歴テキスト構築
    if (summary) {
      const timestamp = formatTimestamp(task.created_at);
      historyLines.push(`[${timestamp}][${channelType}] ${summary}`);
    }
  }

  const firstContactAt = tasks.length > 0 ? tasks[0].created_at : null;

  return {
    relatedTasks,
    combinedHistory: historyLines.join("\n"),
    channelCount: channelSet.size,
    firstContactAt,
  };
}

/**
 * タスクの output/handoff_summary からサマリーテキストを抽出
 * 優先順位: handoff_summary.summary > output.internalSummary > output.suggestedReply > 空文字列
 */
export function extractTaskSummary(task: {
  output: unknown;
  handoff_summary: unknown;
  workflow_type: string;
}): string {
  // handoff_summary から summary を抽出
  if (task.handoff_summary && typeof task.handoff_summary === "object") {
    const hs = task.handoff_summary as Record<string, unknown>;
    if (typeof hs.summary === "string" && hs.summary.length > 0) {
      return hs.summary;
    }
  }

  // output から internalSummary or suggestedReply を抽出
  if (task.output && typeof task.output === "object") {
    const out = task.output as Record<string, unknown>;
    if (typeof out.internalSummary === "string" && out.internalSummary.length > 0) {
      return out.internalSummary;
    }
    if (typeof out.suggestedReply === "string" && out.suggestedReply.length > 0) {
      return out.suggestedReply;
    }
    // LINEの場合は reply を確認
    if (typeof out.reply === "string" && out.reply.length > 0) {
      return out.reply;
    }
  }

  return "";
}

// ============================================================
// 内部ヘルパー
// ============================================================

/** タイムスタンプを簡潔な表示形式に変換 */
function formatTimestamp(isoString: string): string {
  try {
    const d = new Date(isoString);
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${month}/${day} ${hours}:${minutes}`;
  } catch {
    return isoString;
  }
}
