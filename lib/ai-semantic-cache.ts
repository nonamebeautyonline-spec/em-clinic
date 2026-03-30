// AI Semantic Cache（意図ハッシュベースキャッシュ）
// 同一意図のレスポンスをハッシュで高速キャッシュ再利用する

import * as crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase";
import { tenantPayload } from "@/lib/tenant";

/**
 * テキストを正規化してSHA-256ハッシュを生成
 * 空白正規化、句読点除去、小文字化
 */
export function generateIntentHash(text: string): string {
  const normalized = text
    // 全角・半角空白を統一
    .replace(/[\s\u3000]+/g, " ")
    .trim()
    // 句読点・記号を除去（日本語の句読点含む）
    .replace(/[。、！？!?.,;:…・「」『』（）()【】\[\]{}""'']/g, "")
    // 小文字化（英字部分）
    .toLowerCase();

  return crypto.createHash("sha256").update(normalized).digest("hex").slice(0, 64);
}

/**
 * キャッシュからレスポンスを検索
 * quality_score >= 0.7 かつ expires_at が有効なもの
 */
export async function findCachedResponse(
  tenantId: string,
  intentHash: string,
  workflowType: string,
): Promise<{ output: unknown; cacheId: number } | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from("ai_semantic_cache")
      .select("id, cached_output, quality_score, expires_at, hit_count")
      .eq("tenant_id", tenantId)
      .eq("intent_hash", intentHash)
      .eq("workflow_type", workflowType)
      .gte("quality_score", 0.7)
      .order("quality_score", { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return null;

    // 有効期限チェック
    if (data.expires_at) {
      const expiresAt = new Date(data.expires_at as string);
      if (expiresAt < new Date()) {
        return null;
      }
    }

    // hit_count をインクリメント
    const currentHitCount = (data.hit_count as number) ?? 0;
    await supabaseAdmin
      .from("ai_semantic_cache")
      .update({ hit_count: currentHitCount + 1 })
      .eq("id", data.id);

    return {
      output: data.cached_output,
      cacheId: data.id as number,
    };
  } catch (err) {
    console.error("[ai-semantic-cache] キャッシュ検索エラー:", err);
    return null;
  }
}

/**
 * レスポンスをキャッシュに保存
 */
export async function saveCachedResponse(
  tenantId: string,
  intentHash: string,
  input: unknown,
  output: unknown,
  workflowType: string,
  ttlHours: number = 72,
): Promise<number | null> {
  try {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + ttlHours);

    const { data, error } = await supabaseAdmin
      .from("ai_semantic_cache")
      .insert({
        ...tenantPayload(tenantId),
        intent_hash: intentHash,
        original_input: input as Record<string, unknown>,
        cached_output: output as Record<string, unknown>,
        workflow_type: workflowType,
        hit_count: 0,
        quality_score: 1.0,
        expires_at: expiresAt.toISOString(),
      })
      .select("id")
      .single();

    if (error) {
      console.error("[ai-semantic-cache] キャッシュ保存エラー:", error);
      return null;
    }

    return data?.id ?? null;
  } catch (err) {
    console.error("[ai-semantic-cache] キャッシュ保存エラー:", err);
    return null;
  }
}

/**
 * 特定のキャッシュを無効化
 */
export async function invalidateCache(
  tenantId: string,
  intentHash: string,
): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from("ai_semantic_cache")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("intent_hash", intentHash);

    if (error) {
      console.error("[ai-semantic-cache] キャッシュ無効化エラー:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[ai-semantic-cache] キャッシュ無効化エラー:", err);
    return false;
  }
}

/**
 * キャッシュ品質のフィードバック
 * approve: +0.1, reject: -0.3（0〜1にクランプ）
 */
export async function reportCacheQuality(
  cacheId: number,
  approved: boolean,
): Promise<boolean> {
  try {
    // 現在のスコアを取得
    const { data, error: fetchError } = await supabaseAdmin
      .from("ai_semantic_cache")
      .select("quality_score")
      .eq("id", cacheId)
      .single();

    if (fetchError || !data) {
      console.error("[ai-semantic-cache] キャッシュ取得エラー:", fetchError);
      return false;
    }

    const currentScore = Number(data.quality_score) || 1.0;
    const delta = approved ? 0.1 : -0.3;
    const newScore = Math.max(0, Math.min(1, currentScore + delta));

    const { error: updateError } = await supabaseAdmin
      .from("ai_semantic_cache")
      .update({ quality_score: newScore })
      .eq("id", cacheId);

    if (updateError) {
      console.error("[ai-semantic-cache] スコア更新エラー:", updateError);
      return false;
    }

    return true;
  } catch (err) {
    console.error("[ai-semantic-cache] スコア更新エラー:", err);
    return false;
  }
}

/**
 * 期限切れキャッシュを削除（定期メンテナンス用）
 */
export async function cleanExpiredCache(): Promise<number> {
  try {
    const { data, error } = await supabaseAdmin
      .from("ai_semantic_cache")
      .delete()
      .lt("expires_at", new Date().toISOString())
      .select("id");

    if (error) {
      console.error("[ai-semantic-cache] 期限切れキャッシュ削除エラー:", error);
      return 0;
    }

    return data?.length ?? 0;
  } catch (err) {
    console.error("[ai-semantic-cache] 期限切れキャッシュ削除エラー:", err);
    return 0;
  }
}
