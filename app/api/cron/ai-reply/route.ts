import { NextRequest, NextResponse } from "next/server";
import { unauthorized } from "@/lib/api-error";
import { processPendingAiReplies, lastProcessLog } from "@/lib/ai-reply";
import { redis } from "@/lib/redis";
import { acquireLock } from "@/lib/distributed-lock";
import { notifyCronFailure } from "@/lib/notifications/cron-failure";
import { supabaseAdmin } from "@/lib/supabase";

// Vercel Cron: AI返信デバウンス処理（毎分実行）
export async function GET(req: NextRequest) {
  // Vercel Cron認証
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return unauthorized();
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

    // expiredドラフトの自動削除（expires_at超過のpendingを一括expired化）
    let expiredCount = 0;
    try {
      const { data: expiredRows } = await supabaseAdmin
        .from("ai_reply_drafts")
        .update({ status: "expired" })
        .eq("status", "pending")
        .lt("expires_at", new Date().toISOString())
        .select("id");
      expiredCount = expiredRows?.length || 0;
      if (expiredCount > 0) {
        console.log(`[ai-reply] ${expiredCount}件のexpiredドラフトを自動失効`);
      }
    } catch (e) {
      console.error("[ai-reply] expired清掃エラー:", e);
    }

    return NextResponse.json({
      ok: true,
      processed,
      expiredCount,
      debug,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    console.error("[ai-reply] cron error:", e);
    notifyCronFailure("ai-reply", e).catch(() => {});
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  } finally {
    await lock.release();
  }
}
