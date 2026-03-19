// app/api/cron/gcal-sync/route.ts — Google Calendar 定期同期Cron
// 15分ごとに全テナントのGCal変更をポーリング + push通知チャンネル更新
// Vercel Cron: schedule: "*/15 * * * *"

import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { withTenant } from "@/lib/tenant";
import { acquireLock } from "@/lib/distributed-lock";
import { processGcalChanges, setupWatchChannel } from "@/lib/google-calendar-sync";
import { notifyCronFailure } from "@/lib/notifications/cron-failure";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  // Vercel Cron認証
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return unauthorized();
  }

  // 分散ロック（同時実行防止）
  const lock = await acquireLock("cron:gcal-sync", 55);
  if (!lock.acquired) {
    return NextResponse.json({ ok: true, message: "別インスタンスで実行中" });
  }

  try {
    // 全アクティブテナントを取得
    const { data: tenants } = await supabaseAdmin
      .from("tenants")
      .select("id")
      .eq("is_active", true);

    if (!tenants?.length) {
      return NextResponse.json({ ok: true, message: "アクティブなテナントなし" });
    }

    let totalProcessed = 0;
    let totalErrors = 0;
    let channelsRenewed = 0;

    for (const tenant of tenants) {
      try {
        // 1. GCalからの変更をポーリング
        const result = await processGcalChanges(tenant.id);
        totalProcessed += result.processed;
        totalErrors += result.errors;

        // 2. push通知チャンネルの有効期限チェック → 期限切れなら再設定
        const { data: syncToken } = await withTenant(
          supabaseAdmin
            .from("google_calendar_sync_tokens")
            .select("channel_id, channel_expiration")
            .maybeSingle(),
          tenant.id
        );

        const needsRenewal =
          !syncToken?.channel_id ||
          !syncToken?.channel_expiration ||
          new Date(syncToken.channel_expiration) <=
            new Date(Date.now() + 24 * 60 * 60 * 1000); // 24時間以内に期限切れ

        if (needsRenewal) {
          const channel = await setupWatchChannel(tenant.id);
          if (channel) {
            channelsRenewed++;
          }
        }
      } catch (err) {
        console.error(
          `[cron:gcal-sync] tenant=${tenant.id} エラー:`,
          (err as Error).message
        );
        totalErrors++;
      }
    }

    console.log(
      `[cron:gcal-sync] 完了: テナント数=${tenants.length}, 処理=${totalProcessed}, エラー=${totalErrors}, チャンネル更新=${channelsRenewed}`
    );

    return NextResponse.json({
      ok: true,
      tenants: tenants.length,
      processed: totalProcessed,
      errors: totalErrors,
      channels_renewed: channelsRenewed,
    });
  } catch (err) {
    console.error("[cron:gcal-sync] 致命的エラー:", err);
    notifyCronFailure("gcal-sync", err).catch(() => {});
    return serverError((err as Error).message);
  } finally {
    await lock.release();
  }
}
