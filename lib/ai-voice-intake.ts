// AI 音声通話取り込み — 通話要約の正規化→workflow入力変換
// 電話問い合わせをAIタスクとして処理するための前処理

import { supabaseAdmin } from "@/lib/supabase";

// ============================================================
// 型定義
// ============================================================

/** 通話入力データ */
export interface VoiceCallInput {
  callId: string;
  callerPhone: string;
  patientId?: string;
  callSummary: string;
  callDurationSec: number;
  callDirection: "inbound" | "outbound";
  tenantId: string;
}

/** 通話サマリーレコード */
export interface VoiceSummaryRecord extends VoiceCallInput {
  id: number;
  taskId: string | null;
  createdAt: string;
}

// ============================================================
// 通話要約の処理
// ============================================================

/**
 * 通話要約を保存してworkflow入力に変換
 * 1. ai_voice_summariesに保存
 * 2. support-intake workflow用の入力フォーマットに変換
 */
export async function processVoiceCall(input: VoiceCallInput): Promise<{
  voiceSummaryId: number;
  workflowInput: Record<string, unknown>;
}> {
  // 1. DBに保存
  const { data, error } = await supabaseAdmin
    .from("ai_voice_summaries")
    .insert({
      tenant_id: input.tenantId,
      call_id: input.callId,
      caller_phone: input.callerPhone,
      patient_id: input.patientId || null,
      call_summary: input.callSummary,
      call_duration_sec: input.callDurationSec,
      call_direction: input.callDirection,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`通話要約保存失敗: ${error?.message || "データなし"}`);
  }

  // 2. workflow入力に変換（voice-intake / support-intake 互換フォーマット）
  const workflowInput: Record<string, unknown> = {
    text: input.callSummary,
    senderType: "patient",
    senderName: input.callerPhone,
    callId: input.callId,
    callerPhone: input.callerPhone,
    callDurationSec: input.callDurationSec,
    callDirection: input.callDirection,
    patientId: input.patientId || undefined,
    sourceChannel: "voice",
  };

  return {
    voiceSummaryId: data.id,
    workflowInput,
  };
}

// ============================================================
// 通話一覧取得
// ============================================================

/**
 * テナントの通話サマリー一覧を取得
 */
export async function listVoiceSummaries(
  tenantId: string,
  limit = 50
): Promise<VoiceSummaryRecord[]> {
  const { data, error } = await supabaseAdmin
    .from("ai_voice_summaries")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[VoiceIntake] 一覧取得エラー:", error);
    return [];
  }

  return (data || []).map((row) => ({
    id: row.id,
    callId: row.call_id,
    callerPhone: row.caller_phone,
    patientId: row.patient_id || undefined,
    callSummary: row.call_summary,
    callDurationSec: row.call_duration_sec,
    callDirection: row.call_direction,
    tenantId: row.tenant_id,
    taskId: row.task_id,
    createdAt: row.created_at,
  }));
}
