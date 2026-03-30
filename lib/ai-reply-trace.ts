// AI返信 トレース保存（Phase 3-3）
// パイプラインの全中間結果を保存し、再現可能な改善を可能にする

import { supabaseAdmin } from "@/lib/supabase";
import { tenantPayload } from "@/lib/tenant";
import crypto from "crypto";

export interface TracePayload {
  tenantId: string | null;
  draftId: number;
  patientId: string;
  rewrittenQuery?: string;
  classificationResult?: Record<string, unknown> | null;
  policyDecision?: Record<string, unknown> | null;
  candidateExamples?: Array<Record<string, unknown>>;
  rerankedExamples?: Array<Record<string, unknown>>;
  candidateChunks?: Array<Record<string, unknown>>;
  toolCalls?: Array<Record<string, unknown>>;
  patientStateSnapshot?: Record<string, unknown>;
  modelName?: string;
  modelResponseRaw?: string;
  systemPrompt?: string;
  userMessage?: string;
}

/**
 * パイプライントレースを保存
 */
export async function saveReplyTrace(payload: TracePayload): Promise<void> {
  try {
    // プロンプトハッシュ（システムプロンプト+ユーザーメッセージのSHA256前方16文字）
    const promptContent = (payload.systemPrompt || "") + (payload.userMessage || "");
    const promptHash = promptContent
      ? crypto.createHash("sha256").update(promptContent).digest("hex").slice(0, 16)
      : null;

    await supabaseAdmin
      .from("ai_reply_traces")
      .insert({
        ...tenantPayload(payload.tenantId),
        draft_id: payload.draftId,
        patient_id: payload.patientId,
        rewritten_query: payload.rewrittenQuery || null,
        classification_result: payload.classificationResult || {},
        policy_decision: payload.policyDecision || {},
        candidate_examples: payload.candidateExamples || [],
        reranked_examples: payload.rerankedExamples || [],
        candidate_chunks: payload.candidateChunks || [],
        tool_calls: payload.toolCalls || [],
        patient_state_snapshot: payload.patientStateSnapshot || {},
        prompt_hash: promptHash,
        model_name: payload.modelName || null,
        model_response_raw: payload.modelResponseRaw || null,
      });
  } catch (err) {
    // トレース保存失敗はメイン処理に影響させない
    console.error("[AI Trace] 保存エラー:", err);
  }
}

/**
 * トレースペイロードを段階的に構築するビルダー
 */
export class TraceBuilder {
  private payload: Partial<TracePayload> = {};

  setBase(tenantId: string | null, patientId: string): this {
    this.payload.tenantId = tenantId;
    this.payload.patientId = patientId;
    return this;
  }

  setDraftId(draftId: number): this {
    this.payload.draftId = draftId;
    return this;
  }

  setRewrittenQuery(query: string): this {
    this.payload.rewrittenQuery = query;
    return this;
  }

  setClassification(result: Record<string, unknown> | null): this {
    this.payload.classificationResult = result;
    return this;
  }

  setPolicy(decision: Record<string, unknown> | null): this {
    this.payload.policyDecision = decision;
    return this;
  }

  setExamples(candidates: Array<Record<string, unknown>>, reranked: Array<Record<string, unknown>>): this {
    this.payload.candidateExamples = candidates;
    this.payload.rerankedExamples = reranked;
    return this;
  }

  setChunks(chunks: Array<Record<string, unknown>>): this {
    this.payload.candidateChunks = chunks;
    return this;
  }

  setToolCalls(calls: Array<Record<string, unknown>>): this {
    this.payload.toolCalls = calls;
    return this;
  }

  setPatientState(snapshot: Record<string, unknown>): this {
    this.payload.patientStateSnapshot = snapshot;
    return this;
  }

  setModel(name: string, responseRaw: string): this {
    this.payload.modelName = name;
    this.payload.modelResponseRaw = responseRaw;
    return this;
  }

  setPrompts(system: string, user: string): this {
    this.payload.systemPrompt = system;
    this.payload.userMessage = user;
    return this;
  }

  async save(): Promise<void> {
    if (!this.payload.draftId || !this.payload.patientId) {
      console.warn("[AI Trace] draftIdまたはpatientIdが未設定、スキップ");
      return;
    }
    await saveReplyTrace(this.payload as TracePayload);
  }
}
