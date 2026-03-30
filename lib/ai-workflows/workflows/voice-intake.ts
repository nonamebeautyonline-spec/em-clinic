// AI Workflow: 音声通話取り込み
// support-intakeベースで、通話要約をタスク化する

import { z } from "zod/v4";
import type {
  WorkflowConfig,
  FilterResult,
} from "../types";

// ============================================================
// スキーマ定義
// ============================================================

const voiceIntakeInputSchema = z.object({
  text: z.string().min(1), // callSummary
  senderName: z.string().optional(),
  senderType: z.enum(["clinic", "prospect", "internal", "unknown", "patient"]).default("patient"),
  callerPhone: z.string(),
  callDurationSec: z.number(),
  callDirection: z.enum(["inbound", "outbound"]),
  callId: z.string().optional(),
  patientId: z.string().optional(),
  tenantName: z.string().optional(),
  contractPlan: z.string().optional(),
  previousInquiries: z.array(z.object({
    summary: z.string(),
    resolvedAt: z.string().optional(),
  })).default([]),
});

const voiceIntakeOutputSchema = z.object({
  category: z.string(),
  urgency: z.enum(["low", "medium", "high", "critical"]),
  suggestedReply: z.string(),
  internalSummary: z.string(),
  department: z.string(),
  additionalQuestions: z.array(z.string()),
  confidence: z.number(),
});

export type VoiceIntakeInput = z.infer<typeof voiceIntakeInputSchema>;
export type VoiceIntakeOutput = z.infer<typeof voiceIntakeOutputSchema>;

// ============================================================
// filter: 通話要約が処理対象かどうかを判定
// ============================================================

async function voiceFilter(
  input: VoiceIntakeInput,
  _tenantId: string | null
): Promise<FilterResult> {
  const trimmed = (input.text ?? "").trim();

  // 10文字未満の通話要約はスキップ（通話が短すぎて有意な情報なし）
  if (trimmed.length < 10) {
    return { shouldProcess: false, reason: "call_summary_too_short" };
  }

  // 通話時間が5秒未満はスキップ（誤発信等）
  if (input.callDurationSec < 5) {
    return { shouldProcess: false, reason: "call_too_short" };
  }

  return { shouldProcess: true };
}

// ============================================================
// Workflow定義
// classify/generate/handoff はデフォルト（汎用）を使用
// ============================================================

export const voiceIntakeWorkflow: WorkflowConfig<VoiceIntakeInput, VoiceIntakeOutput> = {
  id: "voice-intake",
  version: "1.0.0",
  label: "音声通話取り込み",
  description: "電話通話の要約を自動分類し、タスク化・引き継ぎ情報を生成",

  inputSchema: voiceIntakeInputSchema,
  outputSchema: voiceIntakeOutputSchema,

  classifyCategories: [
    "reservation",
    "prescription",
    "billing",
    "complaint",
    "general_inquiry",
    "emergency",
  ] as const,
  allowedTools: [],

  handoffTarget: {
    type: "human",
    channel: "admin-notification",
    description: "担当スタッフへ引き継ぎ",
  },

  metrics: [
    { id: "call_to_task_conversion", label: "通話→タスク変換率", type: "percentage" },
    { id: "avg_call_duration_sec", label: "平均通話時間", type: "duration_sec" },
    { id: "first_response_time_min", label: "初回対応時間", type: "duration_min" },
    { id: "human_intervention_rate", label: "人手介入率", type: "percentage" },
  ],

  hooks: {
    filter: voiceFilter,
    // classify, generate, handoff はデフォルト（runner.ts内の汎用処理）を使用
  },
};
