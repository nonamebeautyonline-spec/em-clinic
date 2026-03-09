// lib/embedding.ts — OpenAI Embedding生成 + Supabase pgvectorベクトル検索
import OpenAI from "openai";
import { supabaseAdmin } from "@/lib/supabase";
import { getSettingOrEnv } from "@/lib/settings";
import { withTenant, tenantPayload } from "@/lib/tenant";

const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMENSIONS = 1536;

/** OpenAIクライアントを取得（テナント設定 or 環境変数） */
async function getOpenAIClient(tenantId?: string): Promise<OpenAI | null> {
  const apiKey = (await getSettingOrEnv("general", "openai_api_key", "OPENAI_API_KEY", tenantId)) || "";
  if (!apiKey) {
    console.error("[Embedding] OPENAI_API_KEY 未設定");
    return null;
  }
  return new OpenAI({ apiKey });
}

/** テキストからembeddingベクトルを生成 */
export async function generateEmbedding(
  text: string,
  tenantId?: string
): Promise<number[] | null> {
  const client = await getOpenAIClient(tenantId);
  if (!client) return null;

  try {
    const response = await client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text,
      dimensions: EMBEDDING_DIMENSIONS,
    });
    return response.data[0].embedding;
  } catch (err) {
    console.error("[Embedding] 生成エラー:", err);
    return null;
  }
}

/** 学習例をembeddingつきでDBに保存 */
export async function saveAiReplyExample(params: {
  tenantId: string | null;
  question: string;
  answer: string;
  source: "staff_edit" | "manual_reply";
  draftId?: number;
}): Promise<boolean> {
  const { tenantId, question, answer, source, draftId } = params;

  // embeddingを生成（質問文から）
  const embedding = await generateEmbedding(question, tenantId ?? undefined);
  if (!embedding) {
    console.error("[Embedding] ベクトル生成失敗、embedding無しで保存");
  }

  const { error } = await supabaseAdmin
    .from("ai_reply_examples")
    .insert({
      ...tenantPayload(tenantId),
      question,
      answer,
      source,
      draft_id: draftId ?? null,
      embedding: embedding ? JSON.stringify(embedding) : null,
    });

  if (error) {
    console.error("[Embedding] 学習例保存エラー:", error);
    return false;
  }
  return true;
}

/** 類似の学習例をベクトル検索で取得 */
export async function searchSimilarExamples(
  queryText: string,
  tenantId: string | null,
  limit: number = 5,
  similarityThreshold: number = 0.5
): Promise<Array<{ question: string; answer: string; similarity: number }>> {
  // クエリテキストのembeddingを生成
  const embedding = await generateEmbedding(queryText, tenantId ?? undefined);
  if (!embedding) {
    console.log("[Embedding] クエリのベクトル生成失敗、学習例なしで続行");
    return [];
  }

  try {
    const { data, error } = await supabaseAdmin.rpc("match_ai_reply_examples", {
      query_embedding: JSON.stringify(embedding),
      match_threshold: similarityThreshold,
      match_count: limit,
      p_tenant_id: tenantId,
    });

    if (error) {
      console.error("[Embedding] ベクトル検索エラー:", error);
      return [];
    }

    return (data || []).map((row: { question: string; answer: string; similarity: number }) => ({
      question: row.question,
      answer: row.answer,
      similarity: row.similarity,
    }));
  } catch (err) {
    console.error("[Embedding] ベクトル検索例外:", err);
    return [];
  }
}
