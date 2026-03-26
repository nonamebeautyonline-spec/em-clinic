// lib/embedding.ts — RAG強化版: Embedding生成 + Hybrid Search + KB チャンキング + 重複排除 + Reranking + Query Rewriting
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "@/lib/supabase";
import { getSettingOrEnv } from "@/lib/settings";
import { withTenant, tenantPayload } from "@/lib/tenant";
import { redis } from "@/lib/redis";
import { notifyCronFailure } from "@/lib/notifications/cron-failure";

const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMENSIONS = 1536;

// Embeddingキャッシュの有効期限（秒）
const EMBEDDING_CACHE_TTL = 3600; // 1時間

// =============================================================
// OpenAI クライアント
// =============================================================
async function getOpenAIClient(tenantId?: string): Promise<OpenAI | null> {
  const apiKey = (await getSettingOrEnv("general", "openai_api_key", "OPENAI_API_KEY", tenantId)) || "";
  if (!apiKey) {
    console.error("[Embedding] OPENAI_API_KEY 未設定");
    return null;
  }
  return new OpenAI({ apiKey });
}

// =============================================================
// Embedding生成（Redisキャッシュ付き）
// =============================================================

/** テキストからembeddingベクトルを生成（キャッシュ付き） */
export async function generateEmbedding(
  text: string,
  tenantId?: string
): Promise<number[] | null> {
  // キャッシュキーはテキストのハッシュ（簡易: 先頭200文字 + 長さ）
  const cacheKey = `emb_cache:${hashText(text)}`;

  // キャッシュチェック
  try {
    const cached = await redis.get<string>(cacheKey);
    if (cached) {
      const parsed = typeof cached === "string" ? JSON.parse(cached) : cached;
      if (Array.isArray(parsed) && parsed.length === EMBEDDING_DIMENSIONS) {
        return parsed;
      }
    }
  } catch {
    // キャッシュミス — 通常フローへ
  }

  const client = await getOpenAIClient(tenantId);
  if (!client) return null;

  try {
    const response = await client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text,
      dimensions: EMBEDDING_DIMENSIONS,
    });
    const embedding = response.data[0].embedding;

    // キャッシュに保存（fire-and-forget）
    redis.set(cacheKey, JSON.stringify(embedding), { ex: EMBEDDING_CACHE_TTL }).catch(() => {});

    return embedding;
  } catch (err) {
    console.error("[Embedding] 生成エラー:", err);
    return null;
  }
}

/** テキストのハッシュ（キャッシュキー用） */
function hashText(text: string): string {
  // 簡易ハッシュ: FNV-1a 32bit
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash.toString(36) + "_" + text.length;
}

// =============================================================
// Query Rewriting（Haiku で検索クエリを書き換え）
// =============================================================

/** 会話コンテキストを考慮してクエリを書き換え（検索精度向上） */
export async function rewriteQueryForSearch(
  pendingMessages: string[],
  contextMessages: Array<{ direction: string; content: string }>,
  tenantId: string | null
): Promise<string> {
  const originalQuery = pendingMessages.join(" ");

  // 短い明確なメッセージはそのまま使う
  if (originalQuery.length > 50 && contextMessages.length === 0) {
    return originalQuery;
  }

  // コンテキストがない & 短くない場合もそのまま
  if (contextMessages.length === 0) {
    return originalQuery;
  }

  try {
    const apiKey = (await getSettingOrEnv("general", "anthropic_api_key", "ANTHROPIC_API_KEY", tenantId ?? undefined)) || "";
    if (!apiKey) return originalQuery;

    const client = new Anthropic({ apiKey });

    const contextStr = contextMessages
      .slice(-5) // 直近5件のみ
      .map(m => `${m.direction === "incoming" ? "患者" : "スタッフ"}: ${m.content}`)
      .join("\n");

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 150,
      system: "あなたは検索クエリ最適化アシスタントです。患者のメッセージと会話履歴から、ナレッジベース検索に最適な検索クエリを1つ生成してください。曖昧な代名詞（あの件、それ等）を具体的な内容に置き換えてください。出力は検索クエリのテキストのみ（説明不要）。",
      messages: [{
        role: "user",
        content: `## 会話履歴\n${contextStr}\n\n## 患者の新しいメッセージ\n${originalQuery}\n\n上記を踏まえた検索クエリ:`,
      }],
    });

    const rewritten = response.content[0].type === "text" ? response.content[0].text.trim() : "";
    if (rewritten && rewritten.length > 0 && rewritten.length < 500) {
      console.log(`[RAG] Query Rewriting: "${originalQuery}" → "${rewritten}"`);
      return rewritten;
    }
  } catch (err) {
    console.error("[RAG] Query Rewriting エラー（元のクエリを使用）:", err);
  }

  return originalQuery;
}

// =============================================================
// Hybrid Search（ベクトル + trigram + RRF 統合）
// =============================================================

export interface SearchResult {
  id: number;
  question: string;
  answer: string;
  source: string;
  similarity: number;
  keyword_similarity: number;
  rrf_score: number;
  quality_score: number;
}

/** Hybrid Searchで類似学習例を検索（ベクトル + キーワード + 品質重み付け） */
export async function searchSimilarExamplesHybrid(
  queryText: string,
  tenantId: string | null,
  limit: number = 20,
  similarityThreshold: number = 0.4
): Promise<SearchResult[]> {
  const embedding = await generateEmbedding(queryText, tenantId ?? undefined);
  if (!embedding) {
    console.log("[RAG] Hybrid Search: embedding生成失敗、フォールバック検索");
    return fallbackKeywordSearch(queryText, tenantId, limit);
  }

  try {
    const { data, error } = await supabaseAdmin.rpc("match_ai_reply_examples_hybrid", {
      query_embedding: JSON.stringify(embedding),
      query_text: queryText,
      match_threshold: similarityThreshold,
      match_count: limit,
      p_tenant_id: tenantId,
    });

    if (error) {
      console.error("[RAG] Hybrid Search RPC エラー:", error);
      notifyCronFailure("rag-hybrid-search", new Error(`RPC error: ${JSON.stringify(error)}`)).catch(() => {});
      // フォールバック: 従来のベクトル検索
      return fallbackVectorSearch(embedding, tenantId, limit, similarityThreshold);
    }

    return (data || []).map((row: Record<string, unknown>) => ({
      id: row.id as number,
      question: row.question as string,
      answer: row.answer as string,
      source: row.source as string,
      similarity: row.similarity as number,
      keyword_similarity: row.keyword_similarity as number,
      rrf_score: row.rrf_score as number,
      quality_score: row.quality_score as number,
    }));
  } catch (err) {
    console.error("[RAG] Hybrid Search 例外:", err);
    notifyCronFailure("rag-hybrid-search", err).catch(() => {});
    return [];
  }
}

/** フォールバック: 従来のベクトル検索（hybrid RPC が未適用の場合） */
async function fallbackVectorSearch(
  embedding: number[],
  tenantId: string | null,
  limit: number,
  threshold: number
): Promise<SearchResult[]> {
  try {
    const { data, error } = await supabaseAdmin.rpc("match_ai_reply_examples", {
      query_embedding: JSON.stringify(embedding),
      match_threshold: threshold,
      match_count: limit,
      p_tenant_id: tenantId,
    });

    if (error) return [];
    return (data || []).map((row: Record<string, unknown>) => ({
      id: row.id as number,
      question: row.question as string,
      answer: row.answer as string,
      source: row.source as string,
      similarity: row.similarity as number,
      keyword_similarity: 0,
      rrf_score: row.similarity as number,
      quality_score: 1.0,
    }));
  } catch {
    return [];
  }
}

/** フォールバック: キーワード検索のみ（embedding生成失敗時） */
async function fallbackKeywordSearch(
  queryText: string,
  tenantId: string | null,
  limit: number
): Promise<SearchResult[]> {
  try {
    let query = supabaseAdmin
      .from("ai_reply_examples")
      .select("id, question, answer, source, quality_score")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (tenantId) {
      query = query.eq("tenant_id", tenantId);
    }

    // テキスト部分一致（trigram使えない場合のフォールバック）
    query = query.ilike("question", `%${queryText.slice(0, 50)}%`);

    const { data } = await query;
    return (data || []).map((row: Record<string, unknown>) => ({
      id: row.id as number,
      question: row.question as string,
      answer: row.answer as string,
      source: row.source as string,
      similarity: 0.5,
      keyword_similarity: 0.5,
      rrf_score: 0.5,
      quality_score: (row.quality_score as number) || 1.0,
    }));
  } catch {
    return [];
  }
}

// =============================================================
// 後方互換: searchSimilarExamples（既存の呼び出し元向け）
// =============================================================

/** 類似の学習例をベクトル検索で取得（後方互換） */
export async function searchSimilarExamples(
  queryText: string,
  tenantId: string | null,
  limit: number = 5,
  similarityThreshold: number = 0.5
): Promise<Array<{ question: string; answer: string; similarity: number }>> {
  // Hybrid Searchを内部で使い、上位N件を返す
  const results = await searchSimilarExamplesHybrid(queryText, tenantId, limit, similarityThreshold);
  return results.map(r => ({
    question: r.question,
    answer: r.answer,
    similarity: r.similarity,
  }));
}

// =============================================================
// Reranking（LLMベース再ランキング）
// =============================================================

export interface RerankResult {
  question: string;
  answer: string;
  relevance: number;
  original_similarity: number;
}

/** LLM（Haiku）で検索結果を再ランキング */
export async function rerankExamples(
  query: string,
  candidates: SearchResult[],
  tenantId: string | null,
  topK: number = 5
): Promise<RerankResult[]> {
  if (candidates.length === 0) return [];
  if (candidates.length <= topK) {
    // 候補がtopK以下ならそのまま返す
    return candidates.map(c => ({
      question: c.question,
      answer: c.answer,
      relevance: c.rrf_score,
      original_similarity: c.similarity,
    }));
  }

  try {
    const apiKey = (await getSettingOrEnv("general", "anthropic_api_key", "ANTHROPIC_API_KEY", tenantId ?? undefined)) || "";
    if (!apiKey) {
      // フォールバック: RRFスコア順でtopKを返す
      return candidates.slice(0, topK).map(c => ({
        question: c.question,
        answer: c.answer,
        relevance: c.rrf_score,
        original_similarity: c.similarity,
      }));
    }

    const client = new Anthropic({ apiKey });

    // 候補をテキスト化
    const candidateList = candidates
      .slice(0, 15) // コスト制限: 最大15件
      .map((c, i) => `[${i}] Q: ${c.question.slice(0, 100)}\n    A: ${c.answer.slice(0, 100)}`)
      .join("\n");

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      system: "あなたは検索結果の関連度を評価するアシスタントです。患者の質問に対して、以下の候補からもっとも参考になる順にインデックス番号を並べてください。出力はカンマ区切りの数字のみ（例: 2,0,5,1,3）。",
      messages: [{
        role: "user",
        content: `## 患者の質問\n${query}\n\n## 候補\n${candidateList}\n\n関連度が高い順のインデックス（上位${topK}個）:`,
      }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text.trim() : "";
    const indices = text.match(/\d+/g)?.map(Number).filter(i => i < candidates.length) || [];

    if (indices.length === 0) {
      // パース失敗 → フォールバック
      return candidates.slice(0, topK).map(c => ({
        question: c.question,
        answer: c.answer,
        relevance: c.rrf_score,
        original_similarity: c.similarity,
      }));
    }

    // 重複除去しつつ上位topK件
    const seen = new Set<number>();
    const reranked: RerankResult[] = [];
    for (const idx of indices) {
      if (seen.has(idx)) continue;
      seen.add(idx);
      const c = candidates[idx];
      reranked.push({
        question: c.question,
        answer: c.answer,
        relevance: 1.0 - (reranked.length * 0.1), // 順位ベースのスコア
        original_similarity: c.similarity,
      });
      if (reranked.length >= topK) break;
    }

    console.log(`[RAG] Reranking: ${candidates.length}件 → ${reranked.length}件に絞り込み`);
    return reranked;
  } catch (err) {
    console.error("[RAG] Reranking エラー（RRFスコア順でフォールバック）:", err);
    return candidates.slice(0, topK).map(c => ({
      question: c.question,
      answer: c.answer,
      relevance: c.rrf_score,
      original_similarity: c.similarity,
    }));
  }
}

// =============================================================
// Knowledge Base チャンキング
// =============================================================

/** KBテキストをセクション単位でチャンク分割 */
export function chunkKnowledgeBase(kbText: string): Array<{ title: string; content: string }> {
  if (!kbText || kbText.trim().length === 0) return [];

  const chunks: Array<{ title: string; content: string }> = [];
  // ## or 【】で区切られたセクションを検出
  const sections = kbText.split(/(?=^##\s|^【)/m);

  for (const section of sections) {
    const trimmed = section.trim();
    if (!trimmed) continue;

    // タイトル抽出
    const titleMatch = trimmed.match(/^(?:##\s+(.+)|【(.+?)】)/);
    const title = titleMatch ? (titleMatch[1] || titleMatch[2] || "").trim() : "";
    const content = titleMatch ? trimmed.slice(titleMatch[0].length).trim() : trimmed;

    if (content.length < 10) continue; // 短すぎるチャンクはスキップ

    // 長いチャンクはさらに分割（500文字超）
    if (content.length > 500) {
      const subChunks = splitLongChunk(content, 400);
      for (let i = 0; i < subChunks.length; i++) {
        chunks.push({
          title: title ? `${title}（${i + 1}/${subChunks.length}）` : `チャンク${chunks.length + 1}`,
          content: subChunks[i],
        });
      }
    } else {
      chunks.push({ title: title || `チャンク${chunks.length + 1}`, content });
    }
  }

  // セクション区切りがない場合は段落単位で分割
  if (chunks.length === 0) {
    const paragraphs = kbText.split(/\n\n+/);
    let current = "";
    let idx = 0;
    for (const para of paragraphs) {
      if ((current + para).length > 400 && current.length > 0) {
        chunks.push({ title: `セクション${++idx}`, content: current.trim() });
        current = para;
      } else {
        current += (current ? "\n\n" : "") + para;
      }
    }
    if (current.trim()) {
      chunks.push({ title: `セクション${++idx}`, content: current.trim() });
    }
  }

  return chunks;
}

/** 長いテキストを意味的な区切りで分割 */
function splitLongChunk(text: string, maxLen: number): string[] {
  const result: string[] = [];
  const sentences = text.split(/(?<=[。！？\n])/);
  let current = "";

  for (const sentence of sentences) {
    if ((current + sentence).length > maxLen && current.length > 0) {
      result.push(current.trim());
      current = sentence;
    } else {
      current += sentence;
    }
  }
  if (current.trim()) result.push(current.trim());
  return result;
}

/** KBチャンクをDBに保存（embedding付き） */
export async function saveKnowledgeChunks(
  kbText: string,
  tenantId: string | null,
  source: string = "knowledge_base"
): Promise<number> {
  const chunks = chunkKnowledgeBase(kbText);
  if (chunks.length === 0) return 0;

  // 既存チャンクを削除（同一テナント・同一ソース）
  let deleteQuery = supabaseAdmin
    .from("knowledge_chunks")
    .delete()
    .eq("source", source);
  if (tenantId) {
    deleteQuery = deleteQuery.eq("tenant_id", tenantId);
  }
  await deleteQuery;

  // 新しいチャンクを保存
  let savedCount = 0;
  for (const chunk of chunks) {
    const embedding = await generateEmbedding(
      `${chunk.title}: ${chunk.content}`,
      tenantId ?? undefined
    );

    const { error } = await supabaseAdmin.from("knowledge_chunks").insert({
      ...tenantPayload(tenantId),
      title: chunk.title,
      content: chunk.content,
      source,
      embedding: embedding ? JSON.stringify(embedding) : null,
    });

    if (!error) savedCount++;
  }

  console.log(`[RAG] KBチャンク保存: ${savedCount}/${chunks.length}件`);
  return savedCount;
}

/** 関連するKBチャンクを検索 */
export async function searchKnowledgeChunks(
  queryText: string,
  tenantId: string | null,
  limit: number = 3,
  similarityThreshold: number = 0.4
): Promise<Array<{ title: string; content: string; similarity: number }>> {
  const embedding = await generateEmbedding(queryText, tenantId ?? undefined);
  if (!embedding) return [];

  try {
    // Hybrid Search RPCを試行
    const { data, error } = await supabaseAdmin.rpc("match_knowledge_chunks", {
      query_embedding: JSON.stringify(embedding),
      query_text: queryText,
      match_threshold: similarityThreshold,
      match_count: limit,
      p_tenant_id: tenantId,
    });

    if (error) {
      // フォールバック: 単純なベクトル検索
      return fallbackKnowledgeSearch(embedding, tenantId, limit, similarityThreshold);
    }

    return (data || []).map((row: Record<string, unknown>) => ({
      title: row.title as string,
      content: row.content as string,
      similarity: (row.combined_score as number) || (row.similarity as number),
    }));
  } catch (err) {
    console.error("[RAG] KB検索例外:", err);
    notifyCronFailure("rag-knowledge-search", err).catch(() => {});
    return [];
  }
}

/** フォールバック: KBの単純ベクトル検索 */
async function fallbackKnowledgeSearch(
  embedding: number[],
  tenantId: string | null,
  limit: number,
  _threshold: number
): Promise<Array<{ title: string; content: string; similarity: number }>> {
  try {
    // 直接SQLでcosine距離ソート
    let query = supabaseAdmin
      .from("knowledge_chunks")
      .select("title, content")
      .not("embedding", "is", null)
      .limit(limit);

    if (tenantId) {
      query = query.eq("tenant_id", tenantId);
    }

    const { data } = await query;
    // embedding比較ができないのでそのまま返す（精度は落ちる）
    return (data || []).map((row: Record<string, unknown>) => ({
      title: row.title as string,
      content: row.content as string,
      similarity: 0.5,
    }));
  } catch {
    return [];
  }
}

// =============================================================
// 学習例の保存（重複排除 + answer_embedding 付き）
// =============================================================

/** 学習例をembeddingつきでDBに保存（重複排除あり） */
export async function saveAiReplyExample(params: {
  tenantId: string | null;
  question: string;
  answer: string;
  source: "staff_edit" | "manual_reply";
  draftId?: number;
}): Promise<boolean> {
  const { tenantId, question, answer, source, draftId } = params;

  // question の embedding 生成
  const embedding = await generateEmbedding(question, tenantId ?? undefined);
  if (!embedding) {
    console.error("[RAG] ベクトル生成失敗、embedding無しで保存");
  }

  // answer の embedding 生成
  const answerEmbedding = await generateEmbedding(answer, tenantId ?? undefined);

  // 品質スコア: staff_edit（修正）は高品質
  const qualityScore = source === "staff_edit" ? 1.2 : 1.0;

  // 重複チェック（cosine類似度0.95以上）
  if (embedding) {
    try {
      const { data: duplicates } = await supabaseAdmin.rpc("find_near_duplicate_examples", {
        query_embedding: JSON.stringify(embedding),
        p_tenant_id: tenantId,
        p_threshold: 0.95,
      });

      if (duplicates && duplicates.length > 0) {
        const dup = duplicates[0] as { id: number; question: string; answer: string };
        // 既存レコードを更新（新しい回答で上書き）
        const { error: updateError } = await supabaseAdmin
          .from("ai_reply_examples")
          .update({
            answer,
            source,
            quality_score: qualityScore,
            answer_embedding: answerEmbedding ? JSON.stringify(answerEmbedding) : null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", dup.id);

        if (updateError) {
          console.error("[RAG] 重複レコード更新エラー:", updateError);
        } else {
          console.log(`[RAG] 重複検出: id=${dup.id} を最新の回答で更新`);
        }
        return !updateError;
      }
    } catch (err) {
      // 重複チェックRPCが未適用の場合 → 新規挿入へフォールバック
      console.warn("[RAG] 重複チェックRPC未対応、新規挿入:", err);
    }
  }

  // 新規挿入
  const { error } = await supabaseAdmin
    .from("ai_reply_examples")
    .insert({
      ...tenantPayload(tenantId),
      question,
      answer,
      source,
      draft_id: draftId ?? null,
      embedding: embedding ? JSON.stringify(embedding) : null,
      answer_embedding: answerEmbedding ? JSON.stringify(answerEmbedding) : null,
      quality_score: qualityScore,
    });

  if (error) {
    console.error("[RAG] 学習例保存エラー:", error);
    return false;
  }
  return true;
}

// =============================================================
// Feedback Loop 強化
// =============================================================

/** ドラフト承認時に学習例の品質スコアを向上 */
export async function boostExampleQuality(draftId: number): Promise<void> {
  try {
    const { data } = await supabaseAdmin
      .from("ai_reply_examples")
      .select("id, quality_score, approved_count, used_count")
      .eq("draft_id", draftId)
      .maybeSingle();

    if (data) {
      await supabaseAdmin
        .from("ai_reply_examples")
        .update({
          quality_score: Math.min(2.0, (data.quality_score || 1.0) + 0.1),
          approved_count: (data.approved_count || 0) + 1,
          used_count: (data.used_count || 0) + 1,
        })
        .eq("id", data.id);
    }
  } catch (err) {
    console.error("[RAG] 品質スコア向上エラー:", err);
  }
}

/** ドラフト却下時に学習例の品質スコアを低下 */
export async function penalizeExampleQuality(draftId: number): Promise<void> {
  try {
    const { data } = await supabaseAdmin
      .from("ai_reply_examples")
      .select("id, quality_score, rejected_count")
      .eq("draft_id", draftId)
      .maybeSingle();

    if (data) {
      await supabaseAdmin
        .from("ai_reply_examples")
        .update({
          quality_score: Math.max(0.1, (data.quality_score || 1.0) - 0.2),
          rejected_count: (data.rejected_count || 0) + 1,
        })
        .eq("id", data.id);
    }
  } catch (err) {
    console.error("[RAG] 品質スコア低下エラー:", err);
  }
}

/** 検索で使用された学習例のused_countをインクリメント */
export async function incrementUsedCount(exampleIds: number[]): Promise<void> {
  if (exampleIds.length === 0) return;
  try {
    for (const id of exampleIds) {
      // used_count を +1（シンプルに現在値取得→更新）
      const { data } = await supabaseAdmin
        .from("ai_reply_examples")
        .select("used_count")
        .eq("id", id)
        .maybeSingle();
      if (data) {
        await supabaseAdmin
          .from("ai_reply_examples")
          .update({ used_count: (data.used_count || 0) + 1 })
          .eq("id", id);
      }
    }
  } catch {
    // fire-and-forget
  }
}

// =============================================================
// RAGパイプライン統合（メイン関数）
// =============================================================

export interface RAGResult {
  // 類似学習例（rerank済み）
  examples: RerankResult[];
  // 関連KBチャンク
  knowledgeChunks: Array<{ title: string; content: string; similarity: number }>;
  // 書き換え後のクエリ
  rewrittenQuery: string;
  // 使用した学習例のID（used_count更新用）
  usedExampleIds: number[];
}

/** RAGパイプライン全体を実行 */
export async function executeRAGPipeline(params: {
  pendingMessages: string[];
  contextMessages: Array<{ direction: string; content: string }>;
  tenantId: string | null;
  knowledgeBase?: string;
  /** テナント設定のRAGパラメータ（未指定時はデフォルト値） */
  ragConfig?: {
    similarityThreshold?: number;
    maxExamples?: number;
    maxKbChunks?: number;
  };
}): Promise<RAGResult> {
  const { pendingMessages, contextMessages, tenantId, knowledgeBase, ragConfig } = params;
  const threshold = ragConfig?.similarityThreshold ?? 0.35;
  const maxExamples = ragConfig?.maxExamples ?? 5;
  const maxKbChunks = ragConfig?.maxKbChunks ?? 5;

  // Step 1: Query Rewriting
  const rewrittenQuery = await rewriteQueryForSearch(
    pendingMessages,
    contextMessages,
    tenantId
  );

  // Step 2: 並列で Hybrid Search + KB チャンク検索
  const [hybridResults, kbChunks] = await Promise.all([
    searchSimilarExamplesHybrid(rewrittenQuery, tenantId, 20, threshold),
    knowledgeBase
      ? searchKnowledgeChunks(rewrittenQuery, tenantId, maxKbChunks, threshold)
      : Promise.resolve([]),
  ]);

  // Step 3: Reranking（上位20件 → top N に絞り込み）
  const reranked = await rerankExamples(rewrittenQuery, hybridResults, tenantId, maxExamples);

  // 使用した学習例のID
  const usedExampleIds = hybridResults
    .filter(h => reranked.some(r => r.question === h.question))
    .map(h => h.id);

  // Step 4: used_count インクリメント（fire-and-forget）
  incrementUsedCount(usedExampleIds).catch(() => {});

  console.log(`[RAG] パイプライン完了: query="${rewrittenQuery.slice(0, 50)}", examples=${reranked.length}, kb_chunks=${kbChunks.length}`);

  return {
    examples: reranked,
    knowledgeChunks: kbChunks,
    rewrittenQuery,
    usedExampleIds,
  };
}
