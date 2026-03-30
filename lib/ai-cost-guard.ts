// AI返信 Cost Guard / Anti-Spam（Phase 0）
// LLM呼び出し前にレート制限・同一文連投・コスト上限・cooldownを判定

import { createHash } from "crypto";
import { redis } from "@/lib/redis";
import { checkRateLimit } from "@/lib/rate-limit";
import { supabaseAdmin } from "@/lib/supabase";
import { withTenant } from "@/lib/tenant";
import {
  ESTIMATED_COST_PER_INPUT_TOKEN,
  ESTIMATED_COST_PER_OUTPUT_TOKEN,
  BLOCK_REASONS,
  type BlockReason,
} from "@/lib/ai-cost-constants";

// --- 型定義 ---

interface RateLimitSettings {
  rate_limit_30s?: number;
  rate_limit_1h?: number;
}

interface CostLimitSettings {
  daily_cost_limit_usd?: number;
}

interface GuardResult {
  blocked: boolean;
  reason?: BlockReason;
}

// --- ブロック件数カウンター ---

/** ブロック件数をRedisカウンターに記録（TTL 48時間） */
export async function incrementBlockCount(
  tenantId: string | null,
  reason: BlockReason
): Promise<void> {
  try {
    const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const key = `ai_block_count:${tenantId || "global"}:${reason}:${date}`;
    await redis.incr(key);
    // TTLが未設定なら48時間に設定
    const ttl = await redis.ttl(key);
    if (ttl === -1) {
      await redis.expire(key, 48 * 3600);
    }
  } catch {
    // fire-and-forget
  }
}

/** ブロック件数を取得（stats API用） */
export async function getBlockCounts(
  tenantId: string | null,
  date?: string
): Promise<Record<string, number>> {
  const d = date || new Date().toISOString().slice(0, 10);
  const tid = tenantId || "global";
  const reasons = [
    BLOCK_REASONS.rate_limit,
    BLOCK_REASONS.repeat_message,
    BLOCK_REASONS.cost_limit,
    BLOCK_REASONS.cooldown,
  ];
  const counts: Record<string, number> = {};
  try {
    for (const reason of reasons) {
      const val = await redis.get<number>(
        `ai_block_count:${tid}:${reason}:${d}`
      );
      counts[`${reason}_block_count`] = val || 0;
    }
  } catch {
    // Redis障害時は0を返す
    for (const reason of reasons) {
      counts[`${reason}_block_count`] = 0;
    }
  }
  return counts;
}

// --- メッセージ正規化 ---

/** repeat判定用にメッセージを正規化（空白・全角半角・大小文字を統一） */
export function normalizeForHash(text: string): string {
  return (
    text
      .trim()
      // 連続空白を1つに
      .replace(/\s+/g, " ")
      // 全角英数字→半角
      .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) =>
        String.fromCharCode(s.charCodeAt(0) - 0xfee0)
      )
      // 全角記号→半角（基本的なもの）
      .replace(/[！-～]/g, (s) =>
        String.fromCharCode(s.charCodeAt(0) - 0xfee0)
      )
      .toLowerCase()
  );
}

// --- レート制限 ---

/**
 * patient単位のAI返信レート制限チェック
 * 30秒/1時間の2段階。ブロック時はcooldownもセット
 */
export async function checkAiRateLimit(
  tenantId: string | null,
  patientId: string,
  settings: RateLimitSettings
): Promise<GuardResult> {
  const tid = tenantId || "global";
  const max30s = settings.rate_limit_30s ?? 3;
  const max1h = settings.rate_limit_1h ?? 30;

  // 30秒ウィンドウ
  const result30s = await checkRateLimit(
    `ai_30s:${tid}:${patientId}`,
    max30s,
    30
  );
  if (result30s.limited) {
    // cooldown 30分セット
    await setCooldown(tenantId, patientId, 30 * 60);
    await incrementBlockCount(tenantId, BLOCK_REASONS.rate_limit);
    return { blocked: true, reason: BLOCK_REASONS.rate_limit };
  }

  // 1時間ウィンドウ
  const result1h = await checkRateLimit(
    `ai_1h:${tid}:${patientId}`,
    max1h,
    3600
  );
  if (result1h.limited) {
    await setCooldown(tenantId, patientId, 60 * 60);
    await incrementBlockCount(tenantId, BLOCK_REASONS.rate_limit);
    return { blocked: true, reason: BLOCK_REASONS.rate_limit };
  }

  return { blocked: false };
}

// --- 同一文連投検出 ---

/**
 * 同一メッセージの連投を検出（正規化→SHA256、2分以内に3回以上でブロック）
 */
export async function checkRepeatMessage(
  tenantId: string | null,
  patientId: string,
  messageText: string
): Promise<GuardResult> {
  try {
    const tid = tenantId || "global";
    const normalized = normalizeForHash(messageText);
    const hash = createHash("sha256").update(normalized).digest("hex").slice(0, 16);
    const key = `ai_repeat:${tid}:${patientId}`;

    // ハッシュをリストに追加（先頭に）
    await redis.lpush(key, hash);
    // 直近5件に制限
    await redis.ltrim(key, 0, 4);
    // TTL 120秒（2分で自動消去 → 古い正当な再送は引っかからない）
    await redis.expire(key, 120);

    // 直近5件を取得して同一ハッシュを数える
    const recent = await redis.lrange(key, 0, 4);
    const sameCount = recent.filter((h) => h === hash).length;

    if (sameCount >= 3) {
      await incrementBlockCount(tenantId, BLOCK_REASONS.repeat_message);
      return { blocked: true, reason: BLOCK_REASONS.repeat_message };
    }

    return { blocked: false };
  } catch {
    // Redis障害時はブロックしない
    return { blocked: false };
  }
}

// --- 日次コスト上限 ---

/**
 * tenant単位の日次コスト上限チェック
 * 全ステータスのドラフトを対象（生成時点でコスト発生）
 */
export async function checkDailyCostLimit(
  tenantId: string | null,
  settings: CostLimitSettings
): Promise<GuardResult> {
  const limit = settings.daily_cost_limit_usd;
  if (!limit || limit <= 0) return { blocked: false };

  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { data } = await withTenant(
      supabaseAdmin
        .from("ai_reply_drafts")
        .select("input_tokens, output_tokens")
        .gte("created_at", todayStart.toISOString()),
      tenantId
    );

    if (!data || data.length === 0) return { blocked: false };

    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    for (const d of data) {
      totalInputTokens += d.input_tokens || 0;
      totalOutputTokens += d.output_tokens || 0;
    }

    const estimatedCost =
      totalInputTokens * ESTIMATED_COST_PER_INPUT_TOKEN +
      totalOutputTokens * ESTIMATED_COST_PER_OUTPUT_TOKEN;

    if (estimatedCost >= limit) {
      await incrementBlockCount(tenantId, BLOCK_REASONS.cost_limit);
      return { blocked: true, reason: BLOCK_REASONS.cost_limit };
    }

    return { blocked: false };
  } catch (err) {
    console.error("[CostGuard] コスト上限チェックエラー:", err);
    // エラー時はブロックしない
    return { blocked: false };
  }
}

// --- Cooldown ---

/** cooldown中かどうかをチェック */
export async function isInCooldown(
  tenantId: string | null,
  patientId: string
): Promise<boolean> {
  try {
    const tid = tenantId || "global";
    const val = await redis.get(`ai_cooldown:${tid}:${patientId}`);
    return val !== null;
  } catch {
    return false;
  }
}

/** cooldownフラグをセット（TTL付き） */
export async function setCooldown(
  tenantId: string | null,
  patientId: string,
  durationSec: number
): Promise<void> {
  try {
    const tid = tenantId || "global";
    await redis.set(`ai_cooldown:${tid}:${patientId}`, "1", {
      ex: durationSec,
    });
  } catch {
    // fire-and-forget
  }
}
