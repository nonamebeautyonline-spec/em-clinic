// lib/redis.ts
import { Redis } from "@upstash/redis";

/**
 * Upstash Redisクライアント
 * 環境変数 KV_REST_API_URL と KV_REST_API_TOKEN が必要
 * (Vercel KV統合時の環境変数名)
 */
const url = process.env.KV_REST_API_URL || "";
const token = process.env.KV_REST_API_TOKEN || "";

export const redis = new Redis({ url, token });

/**
 * Redis クライアントが正しく設定されているかチェック
 */
function checkRedisConfig() {
  if (!url || !token) {
    console.warn(
      "[Redis] Missing environment variables: KV_REST_API_URL or KV_REST_API_TOKEN. Cache will not work."
    );
    return false;
  }
  return true;
}

/**
 * キャッシュキーを生成
 */
export function getDashboardCacheKey(patientId: string): string {
  return `dashboard:${patientId}`;
}

/**
 * キャッシュを削除（患者のダッシュボードデータ）
 */
export async function invalidateDashboardCache(patientId: string): Promise<void> {
  if (!patientId) return;

  try {
    const cacheKey = getDashboardCacheKey(patientId);
    await redis.del(cacheKey);
    console.log(`[Cache] Deleted: ${cacheKey}`);
  } catch (error) {
    console.error("[Cache] Failed to invalidate:", error);
    // キャッシュ削除失敗はエラーにしない（次回取得時に新しいデータが入る）
  }
}
