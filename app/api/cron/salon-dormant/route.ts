// app/api/cron/salon-dormant/route.ts — 休眠顧客リマインド Cron（日次実行）
// SALONテナントの休眠顧客を3段階（30日/60日/90日）で検出し、LINEリマインド送信
import { NextRequest, NextResponse } from "next/server";
import { unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { pushMessage } from "@/lib/line-push";
import { tenantPayload } from "@/lib/tenant";
import { acquireLock } from "@/lib/distributed-lock";
import { notifyCronFailure } from "@/lib/notifications/cron-failure";
import {
  DORMANT_THRESHOLDS,
  DormantLevel,
  findDormantCustomers,
  buildDormantReminderMessage,
} from "@/lib/salon-lifecycle";

const BATCH_SIZE = 10;

export async function GET(req: NextRequest) {
  // Vercel Cron認証
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return unauthorized();
  }

  // 排他制御
  const lock = await acquireLock("cron:salon-dormant", 120);
  if (!lock.acquired) {
    return NextResponse.json({ ok: true, skipped: "別のプロセスが実行中" });
  }

  try {
    // SALONテナント一覧を取得
    const { data: salonTenants, error: tenantErr } = await supabaseAdmin
      .from("tenants")
      .select("id")
      .eq("industry", "salon")
      .eq("is_active", true);

    if (tenantErr) {
      console.error("[Cron/salon-dormant] テナント取得エラー:", tenantErr.message);
      return NextResponse.json({ ok: false, error: tenantErr.message }, { status: 500 });
    }

    if (!salonTenants?.length) {
      return NextResponse.json({ ok: true, sent: 0, message: "SALONテナントなし" });
    }

    let totalSent = 0;
    let totalErrors = 0;

    for (const tenant of salonTenants) {
      // 各閾値で休眠顧客を検出・送信（warning → alert → critical の順）
      for (const [level, days] of Object.entries(DORMANT_THRESHOLDS) as [DormantLevel, number][]) {
        try {
          const customers = await findDormantCustomers(tenant.id, days, level);
          if (customers.length === 0) continue;

          console.log(
            `[Cron/salon-dormant] tenant=${tenant.id} level=${level} 対象=${customers.length}件`
          );

          // バッチ送信（10件ずつ Promise.allSettled）
          for (let i = 0; i < customers.length; i += BATCH_SIZE) {
            const batch = customers.slice(i, i + BATCH_SIZE);
            const results = await Promise.allSettled(
              batch.map(async (c) => {
                const msg = buildDormantReminderMessage(
                  c.daysSinceVisit,
                  c.name,
                  level
                );

                if (msg.type !== "text") return;

                const pushRes = await pushMessage(c.lineId, [msg], tenant.id);
                if (pushRes?.ok) {
                  // message_log に記録
                  await supabaseAdmin.from("message_log").insert({
                    ...tenantPayload(tenant.id),
                    patient_id: c.patientId,
                    line_uid: c.lineId,
                    direction: "outgoing",
                    event_type: "message",
                    message_type: "text",
                    content: msg.text,
                    status: "sent",
                  });
                  totalSent++;
                }
              })
            );

            // エラー集計
            for (const r of results) {
              if (r.status === "rejected") {
                totalErrors++;
                console.error("[Cron/salon-dormant] 送信エラー:", r.reason);
              }
            }
          }
        } catch (err) {
          console.error(
            `[Cron/salon-dormant] tenant=${tenant.id} level=${level} エラー:`,
            err
          );
          totalErrors++;
        }
      }
    }

    console.log(
      `[Cron/salon-dormant] 完了: sent=${totalSent}, errors=${totalErrors}`
    );

    return NextResponse.json({
      ok: true,
      tenants: salonTenants.length,
      sent: totalSent,
      errors: totalErrors,
    });
  } catch (e) {
    console.error("[Cron/salon-dormant] エラー:", e);
    notifyCronFailure("salon-dormant", e).catch(() => {});
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 }
    );
  } finally {
    await lock.release();
  }
}
