// lib/ai-semantic-reuse.ts — Semantic Reuse: 過去のスタッフ承認済み回答の再利用チェック

import { supabaseAdmin } from "@/lib/supabase";
import { generateEmbedding } from "@/lib/embedding";

// =============================================================
// 定数
// =============================================================

/** 再利用判定のコサイン類似度閾値 */
const REUSE_SIMILARITY_THRESHOLD = 0.92;

/** 再利用候補の有効期限（日数） */
const REUSE_MAX_AGE_DAYS = 30;

/** 再利用候補の最低品質スコア */
const REUSE_MIN_QUALITY_SCORE = 1.0;

// =============================================================
// 型定義
// =============================================================

/** 再利用候補 */
export interface ReuseCandidate {
  exampleId: number;
  question: string;
  answer: string;
  similarity: number;
  qualityScore: number;
}

/** 再利用検索結果 */
export interface ReuseResult {
  found: boolean;
  candidate: ReuseCandidate | null;
  /** "match" | "no_match" | "category_mismatch" | "quality_too_low" | "expired" | "embedding_error" | "error" */
  reason: string;
}

// =============================================================
// メイン関数
// =============================================================

/**
 * 過去のスタッフ承認済み回答から再利用可能な候補を検索する
 *
 * 処理フロー:
 * 1. queryText の embedding を生成
 * 2. match_ai_reply_examples RPC で類似検索
 * 3. source / quality_score / created_at / similarity でフィルタ
 * 4. 最も類似度の高い候補を返す
 */
export async function searchReuseCandidate(params: {
  queryText: string;
  tenantId: string | null;
  aiCategory: string;
}): Promise<ReuseResult> {
  const { queryText, tenantId, aiCategory } = params;

  try {
    // 1. Embedding 生成
    const embedding = await generateEmbedding(queryText, tenantId ?? undefined);
    if (!embedding) {
      console.log("[SemanticReuse] embedding生成失敗");
      return { found: false, candidate: null, reason: "embedding_error" };
    }

    // 2. RPC で類似検索（p_tenant_id パラメータでテナント制御するため withTenant 不要）
    const { data, error } = await supabaseAdmin.rpc("match_ai_reply_examples", {
      query_embedding: embedding,
      match_threshold: REUSE_SIMILARITY_THRESHOLD,
      match_count: 5,
      p_tenant_id: tenantId,
    });

    if (error) {
      console.log("[SemanticReuse] RPC検索エラー:", error.message);
      return { found: false, candidate: null, reason: "error" };
    }

    if (!data || data.length === 0) {
      console.log("[SemanticReuse] 類似候補なし");
      return { found: false, candidate: null, reason: "no_match" };
    }

    // 3. フィルタリング
    const now = new Date();
    const maxAgeMs = REUSE_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

    const filtered = (data as Array<{
      id: number;
      question: string;
      answer: string;
      source: string;
      similarity: number;
      quality_score: number | null;
      created_at: string;
      category: string | null;
    }>).filter((row) => {
      // staff_edit のみ対象
      if (row.source !== "staff_edit") return false;

      // 品質スコアチェック
      if ((row.quality_score ?? 0) < REUSE_MIN_QUALITY_SCORE) return false;

      // 有効期限チェック
      const createdAt = new Date(row.created_at);
      if (now.getTime() - createdAt.getTime() > maxAgeMs) return false;

      // 類似度が閾値を超えているか
      if (row.similarity <= REUSE_SIMILARITY_THRESHOLD) return false;

      return true;
    });

    if (filtered.length === 0) {
      // フィルタで全て除外された場合、理由を特定
      const firstRow = data[0] as { source: string; quality_score: number | null; created_at: string; similarity: number };
      if (firstRow.source !== "staff_edit") {
        console.log("[SemanticReuse] staff_edit以外のソースのみ");
        return { found: false, candidate: null, reason: "no_match" };
      }
      if ((firstRow.quality_score ?? 0) < REUSE_MIN_QUALITY_SCORE) {
        console.log("[SemanticReuse] 品質スコア不足:", firstRow.quality_score);
        return { found: false, candidate: null, reason: "quality_too_low" };
      }
      const createdAt = new Date(firstRow.created_at);
      if (now.getTime() - createdAt.getTime() > maxAgeMs) {
        console.log("[SemanticReuse] 候補の有効期限切れ");
        return { found: false, candidate: null, reason: "expired" };
      }
      console.log("[SemanticReuse] 類似度不足:", firstRow.similarity);
      return { found: false, candidate: null, reason: "no_match" };
    }

    // 4. 最も類似度が高い候補を取得
    const best = filtered.sort((a, b) => b.similarity - a.similarity)[0];

    // 5. カテゴリチェック（緩い一致: category が null の場合はスキップ）
    if (best.category && aiCategory && best.category !== aiCategory) {
      console.log("[SemanticReuse] カテゴリ不一致:", best.category, "!=", aiCategory);
      return { found: false, candidate: null, reason: "category_mismatch" };
    }

    // 6. 再利用候補として返す
    const candidate: ReuseCandidate = {
      exampleId: best.id,
      question: best.question,
      answer: best.answer,
      similarity: best.similarity,
      qualityScore: best.quality_score ?? 0,
    };

    console.log(
      "[SemanticReuse] 再利用候補発見:",
      `id=${candidate.exampleId}`,
      `similarity=${candidate.similarity.toFixed(3)}`,
      `quality=${candidate.qualityScore}`
    );

    return { found: true, candidate, reason: "match" };
  } catch (err) {
    console.log("[SemanticReuse] 予期せぬエラー:", err);
    return { found: false, candidate: null, reason: "error" };
  }
}
