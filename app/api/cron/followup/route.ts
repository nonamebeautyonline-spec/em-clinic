// app/api/cron/followup/route.ts — フォローアップ日次Cron
// Vercel Cron: 全テナント横断で scheduled_at <= now の pending ログを処理
import { NextRequest, NextResponse } from "next/server";
import { processFollowups } from "@/lib/followup";

export async function GET(req: NextRequest) {
  // Vercel Cron認証
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 全テナント横断で処理（tenantId未指定）
    const result = await processFollowups();
    console.log(`[Cron/Followup] 完了: sent=${result.sent}, failed=${result.failed}, skipped=${result.skipped}`);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[Cron/Followup] エラー:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
