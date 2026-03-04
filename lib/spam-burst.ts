// lib/spam-burst.ts — LINE webhook 連打防止ヘルパー（Upstash Redis使用）
import { redis } from "@/lib/redis";

interface BurstCheckResult {
  blocked: boolean;      // true → アクション実行をスキップすべき
  shouldNotify: boolean; // true → スキップログを記録すべき（1回だけ）
}

const BURST_WINDOW_SEC = 5;    // 検出ウィンドウ（秒）
const BURST_MAX_COUNT = 8;     // この回数を超えたらブロック
const NOTIFY_TTL_SEC = 10;     // スキップログ重複防止フラグのTTL

/**
 * 連打チェック — 同一ユーザーの短時間連続イベントを検出
 * @param lineUid LINEユーザーID
 * @returns blocked=true のときはアクション実行をスキップする
 *          shouldNotify=true のときはスキップログを1回記録する
 */
export async function checkSpamBurst(lineUid: string): Promise<BurstCheckResult> {
  try {
    const countKey = `burst:${lineUid}`;
    const notifyKey = `burst-notified:${lineUid}`;

    // イベントカウントをインクリメント（アトミック）
    const count = await redis.incr(countKey);

    // 初回のみTTLを設定（INCR はキーがなければ 1 で作成するが TTL はセットしない）
    if (count === 1) {
      await redis.expire(countKey, BURST_WINDOW_SEC);
    }

    // 閾値以内 → 通常処理
    if (count <= BURST_MAX_COUNT) {
      return { blocked: false, shouldNotify: false };
    }

    // 閾値超過 → ブロック
    // スキップログは1回だけ記録（SET NX で排他制御）
    const notifyResult = await redis.set(notifyKey, "1", { nx: true, ex: NOTIFY_TTL_SEC });
    const shouldNotify = notifyResult === "OK";

    return { blocked: true, shouldNotify };
  } catch (err) {
    // Redis障害時はブロックしない（サービス継続優先 = graceful degradation）
    console.error("[spam-burst] Redis error, skipping burst check:", err);
    return { blocked: false, shouldNotify: false };
  }
}
