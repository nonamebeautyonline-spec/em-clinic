// app/api/cron/usage-check/route.ts
// 使用量チェックCronジョブ（6時間おきに実行）
// 全アクティブテナントの使用量をチェックし、閾値到達時にアラートメールを送信

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { acquireLock } from "@/lib/distributed-lock";
import { checkAndSendUsageAlerts } from "@/lib/usage-alerts";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Vercel Cron 認証
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 排他制御（同時実行防止）
  const lock = await acquireLock("cron:usage-check", 300);
  if (!lock.acquired) {
    return NextResponse.json({
      ok: true,
      message: "別のインスタンスが実行中です",
      skipped: true,
    });
  }

  try {
    // 全アクティブテナントを取得
    const { data: tenants } = await supabaseAdmin
      .from("tenants")
      .select("id")
      .eq("is_active", true)
      .is("deleted_at", null);

    if (!tenants || tenants.length === 0) {
      return NextResponse.json({
        ok: true,
        processed: 0,
        errors: [],
      });
    }

    const errors: string[] = [];
    let processed = 0;

    for (const tenant of tenants) {
      try {
        await checkAndSendUsageAlerts(tenant.id);
        processed++;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push(`${tenant.id}: ${message}`);
        console.error(
          `[cron/usage-check] テナント ${tenant.id} の処理エラー:`,
          err,
        );
      }
    }

    console.log(
      `[cron/usage-check] 完了: ${processed}テナント処理, ${errors.length}エラー`,
    );

    return NextResponse.json({
      ok: errors.length === 0,
      processed,
      errors,
      checkedAt: new Date().toISOString(),
    });
  } finally {
    await lock.release();
  }
}
