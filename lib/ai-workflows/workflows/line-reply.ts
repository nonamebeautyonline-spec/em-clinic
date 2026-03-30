// AI Workflow: LINE自動返信（既存AI返信のアダプタ）
// 既存の ai-reply-*.ts モジュールを hooks 経由でラップ
// 既存 processAiReply() はそのまま動作し続ける（このworkflowは並行記録用）

import { z } from "zod/v4";
import type { WorkflowConfig } from "../types";

// LINE返信の入力スキーマ
const lineReplyInputSchema = z.object({
  messageText: z.string(),
  messageType: z.string().default("text"),
  patientId: z.string(),
  patientName: z.string().optional(),
  lineUid: z.string(),
  contextMessages: z.array(z.object({
    direction: z.string(),
    content: z.string(),
  })).default([]),
});

// LINE返信の出力スキーマ
const lineReplyOutputSchema = z.object({
  category: z.string(),
  confidence: z.number(),
  reply: z.string().nullable(),
  reason: z.string(),
});

export type LineReplyInput = z.infer<typeof lineReplyInputSchema>;
export type LineReplyOutput = z.infer<typeof lineReplyOutputSchema>;

export const lineReplyWorkflow: WorkflowConfig<LineReplyInput, LineReplyOutput> = {
  id: "line-reply",
  version: "1.0.0",
  label: "LINE自動返信",
  description: "患者からのLINEメッセージに対するAI返信案生成",

  inputSchema: lineReplyInputSchema,
  outputSchema: lineReplyOutputSchema,

  classifyCategories: ["operational", "medical", "greeting", "other"] as const,
  allowedTools: ["check_reservation", "check_order_status", "check_payment_status", "check_questionnaire_status"],

  handoffTarget: {
    type: "human",
    channel: "line-approval-flex",
    description: "LINE承認Flexメッセージ経由でスタッフへ",
  },

  metrics: [
    { id: "approval_rate", label: "承認率", type: "percentage" },
    { id: "rejection_rate", label: "却下率", type: "percentage" },
    { id: "avg_confidence", label: "平均信頼度", type: "number" },
    { id: "avg_response_time_sec", label: "平均応答時間", type: "duration_sec" },
    { id: "modification_rate", label: "修正率", type: "percentage" },
  ],

  // hooksは定義しない（line-replyは既存processAiReply経由で動作し、
  // ブリッジ関数でai_tasksに同期する方式のため）
};
