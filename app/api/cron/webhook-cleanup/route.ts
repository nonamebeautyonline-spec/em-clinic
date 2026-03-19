// app/api/cron/webhook-cleanup/route.ts
// Webhookイベントのスタック検知 + 古いレコードのクリーンアップ
// - processing状態で5分以上経過 → failed に更新 + 通知
// - completed状態で30日以上経過 → 削除
// Vercel Cronから5分ごとに実行

import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { acquireLock } from "@/lib/distributed-lock";
import { notifyWebhookFailure } from "@/lib/notifications/webhook-failure";
import { notifyCronFailure } from "@/lib/notifications/cron-failure";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Vercel Cron認証
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return unauthorized();
  }

  // 排他制御: 同時実行を防止
  const lock = await acquireLock("cron:webhook-cleanup", 55);
  if (!lock.acquired) {
    return NextResponse.json({ ok: true, skipped: "別のプロセスが実行中" });
  }

  try {
    let stuckCount = 0;
    let cleanedCount = 0;

    // ===== 処理1: スタックしたイベントを検知してfailedに更新 =====
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const { data: stuckEvents, error: stuckError } = await supabaseAdmin
      .from("webhook_events")
      .select("id, event_source, event_id, tenant_id, created_at")
      .eq("status", "processing")
      .lt("created_at", fiveMinutesAgo)
      .limit(100);

    if (stuckError) {
      console.error("[webhook-cleanup] スタックイベント取得エラー:", stuckError);
    } else if (stuckEvents && stuckEvents.length > 0) {
      // バッチでfailedに更新
      const stuckIds = stuckEvents.map((e) => e.id);
      const { error: updateError } = await supabaseAdmin
        .from("webhook_events")
        .update({
          status: "failed",
          error_message: "stuck: processing timeout (5min)",
          completed_at: new Date().toISOString(),
        })
        .in("id", stuckIds);

      if (updateError) {
        console.error("[webhook-cleanup] スタックイベント更新エラー:", updateError);
      } else {
        stuckCount = stuckEvents.length;
        // 各スタックイベントに通知を送信（fire-and-forget）
        for (const evt of stuckEvents) {
          notifyWebhookFailure(
            evt.event_source,
            evt.event_id,
            new Error("stuck: processing timeout (5min)"),
            evt.tenant_id ?? undefined,
          ).catch(() => {});
        }
      }
    }

    // ===== 処理2: 30日以上前のcompletedイベントを削除 =====
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { count, error: deleteError } = await supabaseAdmin
      .from("webhook_events")
      .delete({ count: "exact" })
      .eq("status", "completed")
      .lt("created_at", thirtyDaysAgo);

    if (deleteError) {
      console.error("[webhook-cleanup] クリーンアップ削除エラー:", deleteError);
    } else {
      cleanedCount = count ?? 0;
    }

    console.log(`[webhook-cleanup] 完了: stuck=${stuckCount}, cleaned=${cleanedCount}`);

    return NextResponse.json({
      ok: true,
      stuck: stuckCount,
      cleaned: cleanedCount,
    });
  } catch (err) {
    console.error("[webhook-cleanup] エラー:", err);
    notifyCronFailure("webhook-cleanup", err).catch(() => {});
    return serverError(err instanceof Error ? err.message : undefined);
  } finally {
    await lock.release();
  }
}
