import { NextRequest, NextResponse } from "next/server";
import { processPendingAiReplies, lastProcessLog } from "@/lib/ai-reply";
import { redis } from "@/lib/redis";
import { acquireLock } from "@/lib/distributed-lock";

// Vercel Cron: AI返信デバウンス処理（毎分実行）
export async function GET(req: NextRequest) {
  // Vercel Cron認証
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 排他制御: 同時実行を防止
  const lock = await acquireLock("cron:ai-reply", 55);
  if (!lock.acquired) {
    return NextResponse.json({ ok: true, skipped: "別のプロセスが実行中" });
  }

  try {
    // デバッグ: 処理前のRedis状態
    const debug: Record<string, unknown> = {};
    try {
      const keys = await redis.smembers("ai_debounce_keys");
      debug.debounce_keys = keys;
      debug.now = Date.now();
      debug.hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY;
      for (const k of (keys || [])) {
        const v = await redis.get(`ai_debounce:${k}`);
        debug[`entry_${k}`] = v;
      }
    } catch (e) {
      debug.redis_error = String(e);
    }

    const processed = await processPendingAiReplies();
    debug.processLog = lastProcessLog;

    return NextResponse.json({
      ok: true,
      processed,
      debug,
      timestamp: new Date().toISOString(),
    });
  } finally {
    await lock.release();
  }
}
