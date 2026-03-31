import { NextRequest, NextResponse } from "next/server";
import { unauthorized, serverError } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { pushMessage } from "@/lib/line-push";
import { tenantPayload } from "@/lib/tenant";
import { acquireLock } from "@/lib/distributed-lock";
import { notifyCronFailure } from "@/lib/notifications/cron-failure";
import { buildCartReminderMessage } from "@/lib/cart-abandonment";

// Vercel Cron: カゴ落ちリマインド送信（5分おき）
// 段階的リマインド:
//   Step 1: abandoned_at から1時間後 (reminder_count=0)
//   Step 2: abandoned_at から24時間後 (reminder_count=1)
//   Step 3: abandoned_at から72時間後 (reminder_count=2)
export async function GET(req: NextRequest) {
  // Vercel Cron認証
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return unauthorized();
  }

  // 排他制御: 同時実行を防止
  const lock = await acquireLock("cron:cart-reminder", 55);
  if (!lock.acquired) {
    return NextResponse.json({ ok: true, skipped: "別のプロセスが実行中" });
  }

  try {
    const now = new Date();

    // Step 1: 1時間以上経過 & reminder_count=0 & 未回収
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const { data: step1, error: err1 } = await supabaseAdmin
      .from("abandoned_carts")
      .select("*")
      .eq("reminder_count", 0)
      .is("recovered_at", null)
      .lte("abandoned_at", oneHourAgo.toISOString())
      .limit(50);

    // Step 2: 24時間以上経過 & reminder_count=1 & 未回収
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const { data: step2, error: err2 } = await supabaseAdmin
      .from("abandoned_carts")
      .select("*")
      .eq("reminder_count", 1)
      .is("recovered_at", null)
      .lte("abandoned_at", twentyFourHoursAgo.toISOString())
      .limit(50);

    // Step 3: 72時間以上経過 & reminder_count=2 & 未回収
    const seventyTwoHoursAgo = new Date(now.getTime() - 72 * 60 * 60 * 1000);
    const { data: step3, error: err3 } = await supabaseAdmin
      .from("abandoned_carts")
      .select("*")
      .eq("reminder_count", 2)
      .is("recovered_at", null)
      .lte("abandoned_at", seventyTwoHoursAgo.toISOString())
      .limit(50);

    const dbError = err1 || err2 || err3;
    if (dbError) {
      console.error("[cart-reminder] DB error:", dbError.message);
      notifyCronFailure("cart-reminder", dbError).catch(() => {});
      return serverError(dbError.message);
    }

    const allCarts = [...(step1 || []), ...(step2 || []), ...(step3 || [])];
    if (!allCarts.length) {
      return NextResponse.json({ ok: true, processed: 0 });
    }

    let sent = 0;
    let failed = 0;

    // 10件ずつバッチで並列送信
    const BATCH_SIZE = 10;
    for (let i = 0; i < allCarts.length; i += BATCH_SIZE) {
      const batch = allCarts.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (cart) => {
          // LINE UIDがなければスキップ
          if (!cart.line_uid) {
            failed++;
            return;
          }

          const step = cart.reminder_count + 1;
          const message = buildCartReminderMessage(cart, step);
          const res = await pushMessage(cart.line_uid, [message], cart.tenant_id);

          if (res?.ok) {
            // メッセージログINSERT（必須）
            await supabaseAdmin.from("message_log").insert({
              ...tenantPayload(cart.tenant_id),
              patient_id: cart.patient_id,
              line_uid: cart.line_uid,
              message_type: "cart_reminder",
              content: `カゴ落ちリマインド(Step ${step})`,
              status: "sent",
              direction: "outgoing",
            });

            // reminder_count更新
            await supabaseAdmin
              .from("abandoned_carts")
              .update({ reminder_count: step })
              .eq("id", cart.id);

            sent++;
          } else {
            failed++;
          }
        }),
      );

      // Promise.allSettledのrejectedもカウント
      for (const r of results) {
        if (r.status === "rejected") {
          console.error("[cart-reminder] Send error:", r.reason);
          failed++;
        }
      }
    }

    console.log(`[cart-reminder] Processed: sent=${sent}, failed=${failed}`);
    return NextResponse.json({ ok: true, processed: allCarts.length, sent, failed });
  } finally {
    await lock.release();
  }
}
