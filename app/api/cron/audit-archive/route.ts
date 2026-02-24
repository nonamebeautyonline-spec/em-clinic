// app/api/cron/audit-archive/route.ts
// 監査ログアーカイブ: 3年超のログをアーカイブ、5年超のアーカイブを削除
// Vercel Cronから毎日03:00 UTCに実行

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { acquireLock } from "@/lib/distributed-lock";

export const dynamic = "force-dynamic";

// バッチサイズ
const BATCH_SIZE = 1000;

export async function GET(req: NextRequest) {
  // Vercel Cron認証
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 排他制御: 同時実行を防止
  const lock = await acquireLock("cron:audit-archive", 300);
  if (!lock.acquired) {
    return NextResponse.json({ ok: true, skipped: "別のプロセスが実行中" });
  }

  try {
    let archivedCount = 0;
    let deletedCount = 0;

    // 3年前の日時
    const threeYearsAgo = new Date();
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
    const threeYearsAgoIso = threeYearsAgo.toISOString();

    // 5年前の日時
    const fiveYearsAgo = new Date();
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
    const fiveYearsAgoIso = fiveYearsAgo.toISOString();

    // === ステップ1: 3年超のaudit_logsをアーカイブ ===
    let hasMore = true;
    while (hasMore) {
      // 3年超のレコードを1000件取得
      const { data: oldLogs, error: selectError } = await supabaseAdmin
        .from("audit_logs")
        .select("*")
        .lt("created_at", threeYearsAgoIso)
        .order("created_at", { ascending: true })
        .limit(BATCH_SIZE);

      if (selectError) {
        console.error("[audit-archive] SELECT error:", selectError.message);
        break;
      }

      if (!oldLogs || oldLogs.length === 0) {
        hasMore = false;
        break;
      }

      // アーカイブテーブルにINSERT
      const { error: insertError } = await supabaseAdmin
        .from("audit_logs_archive")
        .insert(oldLogs);

      if (insertError) {
        console.error("[audit-archive] INSERT error:", insertError.message);
        break;
      }

      // 元テーブルからDELETE
      const ids = oldLogs.map((log) => log.id);
      const { error: deleteError } = await supabaseAdmin
        .from("audit_logs")
        .delete()
        .in("id", ids);

      if (deleteError) {
        console.error("[audit-archive] DELETE error:", deleteError.message);
        break;
      }

      archivedCount += oldLogs.length;

      // バッチサイズ未満なら終了
      if (oldLogs.length < BATCH_SIZE) {
        hasMore = false;
      }
    }

    // === ステップ2: 5年超のaudit_logs_archiveを削除 ===
    const { data: expiredArchive, error: expiredError } = await supabaseAdmin
      .from("audit_logs_archive")
      .delete()
      .lt("created_at", fiveYearsAgoIso)
      .select("id");

    if (expiredError) {
      console.error("[audit-archive] Archive DELETE error:", expiredError.message);
    } else if (expiredArchive) {
      deletedCount = expiredArchive.length;
    }

    console.log(
      `[audit-archive] 完了: ${archivedCount}件アーカイブ, ${deletedCount}件の古いアーカイブを削除`,
    );

    return NextResponse.json({
      ok: true,
      archivedCount,
      deletedCount,
    });
  } catch (err) {
    console.error("[audit-archive] Error:", err);
    return NextResponse.json(
      { error: "サーバーエラー" },
      { status: 500 },
    );
  } finally {
    await lock.release();
  }
}
