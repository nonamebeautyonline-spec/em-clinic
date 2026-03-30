// 患者メモリ管理（Phase 1-4）
// 過去のやり取りから患者の個別情報（アレルギー、好み、通院歴等）を抽出・保存し、
// AI返信時のコンテキストとして活用する

import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "@/lib/supabase";
import { withTenant, tenantPayload, strictWithTenant } from "@/lib/tenant";
import { getSettingOrEnv } from "@/lib/settings";

export interface PatientMemory {
  id: number;
  memory_type: string;
  content: string;
  source: string;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
  is_active: boolean;
}

// メモリタイプ定義
export const MEMORY_TYPES = {
  allergy: "アレルギー",
  preference: "好み・希望",
  medical_history: "治療歴・既往歴",
  concern: "不安・懸念",
  lifestyle: "生活習慣",
  context: "会話コンテキスト",
  other: "その他",
} as const;

/**
 * 患者のアクティブなメモリを取得
 */
export async function fetchPatientMemory(
  patientId: string,
  tenantId: string | null
): Promise<PatientMemory[]> {
  const { data, error } = await strictWithTenant(
    supabaseAdmin
      .from("ai_patient_memory")
      .select("id, memory_type, content, source, created_at, updated_at, expires_at, is_active")
      .eq("patient_id", patientId)
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
      .limit(20),
    tenantId
  );

  if (error) {
    console.error("[PatientMemory] 取得エラー:", error);
    return [];
  }

  // 期限切れを除外
  const now = new Date();
  return (data || []).filter(m => !m.expires_at || new Date(m.expires_at) > now);
}

/**
 * 患者メモリを保存
 */
export async function savePatientMemory(params: {
  tenantId: string | null;
  patientId: string;
  memoryType: string;
  content: string;
  source?: string;
  expiresAt?: string;
}): Promise<boolean> {
  const { tenantId, patientId, memoryType, content, source = "auto", expiresAt } = params;

  // 同じ患者・同じタイプ・同じ内容の重複チェック
  const { data: existing } = await strictWithTenant(
    supabaseAdmin
      .from("ai_patient_memory")
      .select("id, content")
      .eq("patient_id", patientId)
      .eq("memory_type", memoryType)
      .eq("is_active", true)
      .limit(10),
    tenantId
  );

  // 内容が類似するメモリがあれば更新
  if (existing && existing.length > 0) {
    const dup = existing.find(e => e.content.includes(content) || content.includes(e.content));
    if (dup) {
      await supabaseAdmin
        .from("ai_patient_memory")
        .update({ content, updated_at: new Date().toISOString() })
        .eq("id", dup.id);
      return true;
    }
  }

  const { error } = await supabaseAdmin
    .from("ai_patient_memory")
    .insert({
      ...tenantPayload(tenantId),
      patient_id: patientId,
      memory_type: memoryType,
      content,
      source,
      expires_at: expiresAt || null,
    });

  if (error) {
    console.error("[PatientMemory] 保存エラー:", error);
    return false;
  }
  return true;
}

/**
 * メモリを無効化
 */
export async function deactivateMemory(
  memoryId: number,
  tenantId: string | null
): Promise<boolean> {
  const { error } = await strictWithTenant(
    supabaseAdmin
      .from("ai_patient_memory")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", memoryId),
    tenantId
  );
  if (error) {
    console.error("[PatientMemory] 無効化エラー:", error);
    return false;
  }
  return true;
}

/**
 * 会話から患者メモリを自動抽出（Haiku使用・非同期実行）
 * AI返信送信後に呼び出される
 */
export async function extractAndSaveMemory(params: {
  patientId: string;
  tenantId: string | null;
  messages: string[];
  aiReply: string;
}): Promise<void> {
  const { patientId, tenantId, messages, aiReply } = params;

  try {
    const apiKey = await getSettingOrEnv("general", "anthropic_api_key", "ANTHROPIC_API_KEY", tenantId ?? undefined);
    if (!apiKey) return;

    const client = new Anthropic({ apiKey });
    const conversationText = messages.map(m => `患者: ${m}`).join("\n") + `\nAI: ${aiReply}`;

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      system: `会話から患者の個別情報を抽出してください。以下のタイプに分類して出力：
- allergy: アレルギー情報
- preference: 好み・希望（配送方法、連絡手段等）
- medical_history: 治療歴・既往歴
- concern: 不安・懸念事項
- lifestyle: 生活習慣（仕事の都合等）
- context: 次回以降に参考になるコンテキスト

抽出できる情報がない場合は空配列を返してください。
出力形式: JSON配列
[{"type": "allergy", "content": "花粉症あり"}]`,
      messages: [{ role: "user", content: conversationText }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return;

    const memories: Array<{ type: string; content: string }> = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(memories) || memories.length === 0) return;

    // 各メモリを保存（最大5件まで）
    for (const mem of memories.slice(0, 5)) {
      if (mem.type && mem.content && mem.content.length > 2) {
        await savePatientMemory({
          tenantId,
          patientId,
          memoryType: mem.type,
          content: mem.content,
          source: "auto",
        });
      }
    }
    console.log(`[PatientMemory] ${patientId}: ${memories.length}件抽出・保存`);
  } catch (err) {
    // 非同期処理なのでエラーはログのみ
    console.error("[PatientMemory] 抽出エラー:", err);
  }
}

/**
 * メモリをプロンプト用テキストに変換
 */
export function formatMemoryForPrompt(memories: PatientMemory[]): string {
  if (memories.length === 0) return "";

  const lines = memories.map(m => {
    const typeLabel = MEMORY_TYPES[m.memory_type as keyof typeof MEMORY_TYPES] || m.memory_type;
    return `- [${typeLabel}] ${m.content}`;
  });

  return `## この患者に関する記憶\n${lines.join("\n")}`;
}
