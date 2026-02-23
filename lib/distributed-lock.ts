// lib/distributed-lock.ts — Redis分散ロック（Upstash Redis使用）
// Cron/バッチ処理の同時実行防止に使用
// 設計方針: Redis障害時はサービス継続優先（rate-limit.ts と同じ）

import { redis } from "@/lib/redis";

interface LockResult {
  acquired: boolean;
  release: () => Promise<void>;
}

/**
 * Redis分散ロックを取得
 * @param key ロックキー（例: "cron:process-steps"）
 * @param ttlSec ロック有効期限（秒）。処理が異常終了した場合の自動解放
 * @returns acquired=true の場合、処理完了後に release() で解放
 */
export async function acquireLock(key: string, ttlSec: number): Promise<LockResult> {
  const lockKey = `lock:${key}`;
  const lockValue = `${Date.now()}_${Math.random().toString(36).slice(2)}`;

  try {
    // SET NX EX パターン（アトミックなロック取得）
    const result = await redis.set(lockKey, lockValue, { nx: true, ex: ttlSec });

    if (result === "OK") {
      return {
        acquired: true,
        release: async () => {
          try {
            // 自分が取得したロックのみ解放
            const current = await redis.get(lockKey);
            if (current === lockValue) {
              await redis.del(lockKey);
            }
          } catch (err) {
            console.error("[distributed-lock] release error:", err);
          }
        },
      };
    }

    return { acquired: false, release: async () => {} };
  } catch (err) {
    // Redis障害時はロックなしで続行（サービス継続優先）
    console.error("[distributed-lock] Redis error, skipping lock:", err);
    return { acquired: true, release: async () => {} };
  }
}
