// AI Workforce Management API: WFMメトリクス取得
import { NextRequest, NextResponse } from "next/server";
import { verifyPlatformAdmin } from "@/lib/platform-auth";
import { serverError, unauthorized } from "@/lib/api-error";
import { calculateWFMMetrics } from "@/lib/ai-wfm-metrics";

/**
 * GET: WFMメトリクス
 * クエリ: days? (デフォルト7)
 */
export async function GET(req: NextRequest) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin) return unauthorized();

  try {
    const url = new URL(req.url);
    const days = parseInt(url.searchParams.get("days") || "7", 10);
    const safeDays = Math.min(Math.max(1, days), 90); // 1〜90日

    const metrics = await calculateWFMMetrics(safeDays);

    return NextResponse.json({ ok: true, days: safeDays, metrics });
  } catch (err) {
    console.error("[AI Workforce API] GET エラー:", err);
    return serverError("WFMメトリクスの取得に失敗しました");
  }
}
