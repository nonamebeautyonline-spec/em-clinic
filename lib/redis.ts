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

// ── friends-list キャッシュ ──

const FL_PREFIX = "fl:";
const FL_TTL = 5; // 秒

export function getFriendsListCacheKey(tenantId: string, offset: number, limit: number): string {
  return `${FL_PREFIX}${tenantId}:${offset}:${limit}`;
}

/**
 * friends-list キャッシュ取得（検索なし・初期ロード時のみ利用）
 */
export async function getFriendsListCache(tenantId: string, offset: number, limit: number): Promise<unknown | null> {
  if (!checkRedisConfig()) return null;
  try {
    const key = getFriendsListCacheKey(tenantId, offset, limit);
    return await redis.get(key);
  } catch (error) {
    console.error("[Cache] friends-list get failed:", error);
    return null;
  }
}

/**
 * friends-list キャッシュ保存
 */
export async function setFriendsListCache(tenantId: string, offset: number, limit: number, data: unknown): Promise<void> {
  if (!checkRedisConfig()) return;
  try {
    const key = getFriendsListCacheKey(tenantId, offset, limit);
    await redis.set(key, data, { ex: FL_TTL });
  } catch (error) {
    console.error("[Cache] friends-list set failed:", error);
  }
}

/**
 * friends-list キャッシュ無効化（テナント単位、パターン削除）
 */
export async function invalidateFriendsListCache(tenantId: string): Promise<void> {
  if (!checkRedisConfig() || !tenantId) return;
  try {
    // Upstash の scan でキー一覧取得し削除
    const keys: string[] = [];
    let cursor = 0;
    do {
      const [nextCursor, batch] = await redis.scan(cursor, { match: `${FL_PREFIX}${tenantId}:*`, count: 100 });
      cursor = typeof nextCursor === "number" ? nextCursor : Number(nextCursor);
      keys.push(...batch);
    } while (cursor !== 0);

    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(`[Cache] friends-list invalidated: ${keys.length} keys for tenant ${tenantId}`);
    }
  } catch (error) {
    console.error("[Cache] friends-list invalidate failed:", error);
  }
}

// ── セッション認証キャッシュ ──

const SESSION_PREFIX = "sess:";
const SESSION_TTL = 30; // 秒

/**
 * セッション検証結果キャッシュ取得
 */
export async function getSessionCache(tokenHash: string): Promise<boolean | null> {
  if (!checkRedisConfig()) return null;
  try {
    const val = await redis.get(`${SESSION_PREFIX}${tokenHash}`);
    if (val === null || val === undefined) return null;
    return val === 1 || val === "1" || val === true;
  } catch {
    return null;
  }
}

/**
 * セッション検証結果キャッシュ保存
 */
export async function setSessionCache(tokenHash: string, isValid: boolean): Promise<void> {
  if (!checkRedisConfig()) return;
  try {
    await redis.set(`${SESSION_PREFIX}${tokenHash}`, isValid ? 1 : 0, { ex: SESSION_TTL });
  } catch {
    // キャッシュ保存失敗は無視
  }
}

/**
 * セッション検証キャッシュ無効化（ログアウト時）
 */
export async function invalidateSessionCache(tokenHash: string): Promise<void> {
  if (!checkRedisConfig()) return;
  try {
    await redis.del(`${SESSION_PREFIX}${tokenHash}`);
  } catch {
    // 無視
  }
}
