import { NextRequest, NextResponse } from "next/server";
import { processPendingAiReplies } from "@/lib/ai-reply";

// Vercel Cron: AI返信デバウンス処理（毎分実行）
export async function GET(req: NextRequest) {
  // Vercel Cron認証
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const processed = await processPendingAiReplies();

  return NextResponse.json({
    ok: true,
    processed,
    timestamp: new Date().toISOString(),
  });
}
