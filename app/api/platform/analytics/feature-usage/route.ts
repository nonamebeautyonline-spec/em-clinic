// app/api/platform/analytics/feature-usage/route.ts
// プラットフォーム管理: 機能利用分析API

import { NextRequest, NextResponse } from "next/server";
import { verifyPlatformAdmin } from "@/lib/platform-auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin)
    return NextResponse.json(
      { ok: false, error: "権限がありません" },
      { status: 403 },
    );

  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // 直近30日の監査ログを取得
    const { data: logs } = await supabaseAdmin
      .from("audit_logs")
      .select("action, tenant_id")
      .gte("created_at", thirtyDaysAgo);

    // カテゴリ別に集計（actionのドット区切り最初の部分）
    const categoryMap: Record<string, number> = {};
    const tenantFeatureMap: Record<string, Record<string, number>> = {};

    for (const log of logs || []) {
      const category = (log.action || "unknown").split(".")[0];
      categoryMap[category] = (categoryMap[category] || 0) + 1;

      if (log.tenant_id) {
        if (!tenantFeatureMap[log.tenant_id]) tenantFeatureMap[log.tenant_id] = {};
        tenantFeatureMap[log.tenant_id][category] =
          (tenantFeatureMap[log.tenant_id][category] || 0) + 1;
      }
    }

    // カテゴリ別集計を降順ソート
    const features = Object.entries(categoryMap)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);

    // テナント別のトップ機能（テナント名を取得）
    const tenantIds = Object.keys(tenantFeatureMap);
    let tenantUsage: { tenantId: string; tenantName: string; topFeatures: { category: string; count: number }[] }[] = [];

    if (tenantIds.length > 0) {
      const { data: tenants } = await supabaseAdmin
        .from("tenants")
        .select("id, name")
        .in("id", tenantIds);

      const tenantNameMap: Record<string, string> = {};
      for (const t of tenants || []) {
        tenantNameMap[t.id] = t.name;
      }

      tenantUsage = tenantIds.map((tid) => {
        const featureMap = tenantFeatureMap[tid];
        const topFeatures = Object.entries(featureMap)
          .map(([category, count]) => ({ category, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        return {
          tenantId: tid,
          tenantName: tenantNameMap[tid] || "不明",
          topFeatures,
        };
      });

      // 総利用回数順でソート
      tenantUsage.sort(
        (a, b) =>
          b.topFeatures.reduce((s, f) => s + f.count, 0) -
          a.topFeatures.reduce((s, f) => s + f.count, 0),
      );
    }

    return NextResponse.json({
      ok: true,
      features,
      tenantUsage: tenantUsage.slice(0, 20), // 上位20テナント
    });
  } catch (err) {
    console.error("[platform/analytics/feature-usage] GET error:", err);
    return NextResponse.json(
      { ok: false, error: "機能利用データの取得に失敗しました" },
      { status: 500 },
    );
  }
}
