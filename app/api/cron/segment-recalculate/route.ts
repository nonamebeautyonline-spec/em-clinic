// app/api/cron/segment-recalculate/route.ts — 日次セグメント再計算Cron
// Vercel Cronから呼び出し、全テナントのセグメントを再計算する
// vercel.json の cron 設定で毎日AM3:00実行を想定

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { withTenant } from "@/lib/tenant";
import { classifyPatients, saveSegments } from "@/lib/patient-segments";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Vercel Cron 認証
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();
  let totalProcessed = 0;
  const errors: string[] = [];

  try {
    // 全テナントを取得
    const { data: tenants } = await supabaseAdmin
      .from("tenants")
      .select("id")
      .eq("is_active", true);

    // テナントIDリスト（null = シングルテナント互換も含む）
    // classifyPatients/saveSegments 内部で tenant_id フィルター・ペイロードを適用
    const tenantIds: (string | null)[] = [null];
    if (tenants && tenants.length > 0) {
      for (const t of tenants) {
        tenantIds.push(t.id);
      }
    }

    // 各テナントのセグメントを再計算
    for (const tenantId of tenantIds) {
      try {
        const results = await classifyPatients(tenantId);
        if (results.length > 0) {
          await saveSegments(results, tenantId);
        }
        totalProcessed += results.length;
      } catch (err) {
        const msg = `テナント ${tenantId || "default"}: ${err instanceof Error ? err.message : String(err)}`;
        console.error("[cron/segment-recalculate]", msg);
        errors.push(msg);
      }
    }
  } catch (err) {
    console.error("[cron/segment-recalculate] 致命的エラー:", err);
    return NextResponse.json(
      { ok: false, error: "セグメント再計算に失敗しました" },
      { status: 500 },
    );
  }

  const elapsed = Date.now() - startTime;

  return NextResponse.json({
    ok: errors.length === 0,
    processed: totalProcessed,
    errors: errors.length > 0 ? errors : undefined,
    elapsedMs: elapsed,
  });
}
