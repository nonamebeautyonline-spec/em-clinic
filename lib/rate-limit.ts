// lib/rate-limit.ts — 汎用レート制限ヘルパー（Upstash Redis使用）
import { redis } from "@/lib/redis";

interface RateLimitResult {
  limited: boolean;
  remaining: number;
  retryAfter?: number; // 秒
}

/**
 * レート制限チェック
 * @param key   制限キー（例: "login:email:user@example.com"）
 * @param max   ウィンドウ内の最大試行回数
 * @param windowSec  ウィンドウ長（秒）
 */
export async function checkRateLimit(
  key: string,
  max: number,
  windowSec: number,
): Promise<RateLimitResult> {
  try {
    const redisKey = `rate:${key}`;
    const current = await redis.get<number>(redisKey);
    const count = current ?? 0;

    if (count >= max) {
      const ttl = await redis.ttl(redisKey);
      return { limited: true, remaining: 0, retryAfter: ttl > 0 ? ttl : windowSec };
    }

    // カウント更新
    if (count === 0) {
      await redis.set(redisKey, 1, { ex: windowSec });
    } else {
      await redis.incr(redisKey);
    }

    return { limited: false, remaining: max - count - 1 };
  } catch (err) {
    // Redis障害時はレート制限をスキップ（サービス継続優先）
    console.error("[rate-limit] Redis error, skipping:", err);
    return { limited: false, remaining: max };
  }
}

/**
 * レート制限カウントをリセット（ログイン成功時など）
 */
export async function resetRateLimit(key: string): Promise<void> {
  try {
    await redis.del(`rate:${key}`);
  } catch (err) {
    console.error("[rate-limit] Redis reset error:", err);
  }
}

/**
 * IPアドレスをリクエストヘッダーから取得
 */
export function getClientIp(req: { headers: { get(name: string): string | null } }): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}
