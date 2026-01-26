// lib/redis.ts
"use server";
import { Redis } from "@upstash/redis";

/**
 * Upstash Redisクライアント
 * 環境変数 UPSTASH_REDIS_REST_URL と UPSTASH_REDIS_REST_TOKEN が必要
 */
const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

if (!url || !token) {
  throw new Error(
    "[Redis] Missing environment variables: UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN"
  );
}

export const redis = new Redis({ url, token });

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
