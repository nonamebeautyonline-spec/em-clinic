// app/api/cron/refresh-metrics/route.ts — 日次メトリクス集計Cron
// 毎日深夜1:00(UTC)に実行。当日分 + 前日分をリフレッシュ
import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { acquireLock } from "@/lib/distributed-lock";
import { notifyCronFailure } from "@/lib/notifications/cron-failure";

export async function GET(req: NextRequest) {
  // Vercel Cron認証
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return unauthorized();
  }

  // 排他制御
  const lock = await acquireLock("cron:refresh-metrics", 120);
  if (!lock.acquired) {
    return NextResponse.json({ ok: true, skipped: "別のプロセスが実行中" });
  }

  try {
    // 全テナントを取得
    const { data: tenants, error: tenantError } = await supabaseAdmin
      .from("tenants")
      .select("id")
      .eq("status", "active");

    if (tenantError) {
      console.error("[refresh-metrics] テナント取得エラー:", tenantError.message);
      return serverError(tenantError.message);
    }

    // JST基準で当日・前日を算出
    const now = new Date();
    const jstOffset = 9 * 60 * 60 * 1000;
    const jstNow = new Date(now.getTime() + jstOffset);
    const today = jstNow.toISOString().slice(0, 10); // YYYY-MM-DD
    const yesterday = new Date(jstNow.getTime() - 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    let refreshed = 0;
    let failed = 0;

    for (const tenant of tenants ?? []) {
      for (const targetDate of [yesterday, today]) {
        try {
          const { error } = await supabaseAdmin.rpc("refresh_daily_metrics", {
            p_tenant_id: tenant.id,
            p_target_date: targetDate,
          });

          if (error) {
            console.error(
              `[refresh-metrics] tenant=${tenant.id} date=${targetDate} エラー:`,
              error.message,
            );
            failed++;
          } else {
            refreshed++;
          }
        } catch (err) {
          console.error(
            `[refresh-metrics] tenant=${tenant.id} date=${targetDate} 例外:`,
            err,
          );
          failed++;
        }
      }
    }

    console.log(
      `[refresh-metrics] 完了: refreshed=${refreshed}, failed=${failed}`,
    );
    return NextResponse.json({ ok: true, refreshed, failed });
  } catch (e) {
    console.error("[refresh-metrics] エラー:", e);
    notifyCronFailure("refresh-metrics", e).catch(() => {});
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 },
    );
  } finally {
    await lock.release();
  }
}
