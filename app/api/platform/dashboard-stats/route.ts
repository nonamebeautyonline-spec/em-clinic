// app/api/platform/dashboard-stats/route.ts
// プラットフォーム管理ダッシュボード統計API

import { NextRequest, NextResponse } from "next/server";
import { verifyPlatformAdmin } from "@/lib/platform-auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin) {
    return NextResponse.json(
      { ok: false, error: "権限がありません" },
      { status: 403 }
    );
  }

  try {
    // 今月の範囲を計算
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split("T")[0];
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString()
      .split("T")[0];

    // 並列で全クエリを実行
    const [
      tenantsResult,
      patientsResult,
      revenueResult,
      activeTenantsResult,
      reservationsResult,
      lineFriendsResult,
      tenantRankingResult,
      monthlyTrendResult,
    ] = await Promise.all([
      // 1. 総テナント数（is_active かつ deleted_at IS NULL）
      supabaseAdmin
        .from("tenants")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true)
        .is("deleted_at", null),

      // 2. 総患者数（全テナント合計）
      supabaseAdmin
        .from("patients")
        .select("id", { count: "exact", head: true }),

      // 3. 今月の総売上（paid_at が今月のもの合計）
      supabaseAdmin
        .from("orders")
        .select("amount, tenant_id")
        .gte("paid_at", monthStart)
        .lte("paid_at", monthEnd + "T23:59:59.999Z")
        .not("paid_at", "is", null),

      // 4. アクティブテナント数（今月にordersがあるテナント数）
      supabaseAdmin
        .from("orders")
        .select("tenant_id")
        .gte("paid_at", monthStart)
        .lte("paid_at", monthEnd + "T23:59:59.999Z")
        .not("paid_at", "is", null)
        .not("tenant_id", "is", null),

      // 5. 総予約数
      supabaseAdmin
        .from("reservations")
        .select("id", { count: "exact", head: true }),

      // 6. 総LINE友だち数（line_id IS NOT NULLの数）
      supabaseAdmin
        .from("patients")
        .select("id", { count: "exact", head: true })
        .not("line_id", "is", null),

      // 7. テナント別ランキング用データ（テナント情報 + 患者数 + 今月売上）
      (async () => {
        // テナント一覧取得
        const { data: tenants } = await supabaseAdmin
          .from("tenants")
          .select("id, name, slug")
          .eq("is_active", true)
          .is("deleted_at", null);

        if (!tenants || tenants.length === 0) return [];

        // 各テナントの患者数を集計
        const patientCounts: Record<string, number> = {};
        for (const t of tenants) {
          const { count } = await supabaseAdmin
            .from("patients")
            .select("id", { count: "exact", head: true })
            .eq("tenant_id", t.id);
          patientCounts[t.id] = count || 0;
        }

        // 今月の売上を全テナント分取得
        const { data: monthOrders } = await supabaseAdmin
          .from("orders")
          .select("amount, tenant_id")
          .gte("paid_at", monthStart)
          .lte("paid_at", monthEnd + "T23:59:59.999Z")
          .not("paid_at", "is", null);

        const revenueBytenant: Record<string, number> = {};
        for (const o of monthOrders || []) {
          const tid = o.tenant_id || "unknown";
          revenueBytenant[tid] = (revenueBytenant[tid] || 0) + (o.amount || 0);
        }

        // テナント情報を合成してソート
        const ranking = tenants.map((t) => ({
          id: t.id,
          name: t.name,
          slug: t.slug,
          patientCount: patientCounts[t.id] || 0,
          monthlyRevenue: revenueBytenant[t.id] || 0,
        }));

        // 患者数 + 今月売上でソート（売上優先）
        ranking.sort(
          (a, b) =>
            b.monthlyRevenue - a.monthlyRevenue ||
            b.patientCount - a.patientCount
        );

        return ranking.slice(0, 10);
      })(),

      // 8. 月別推移（直近6ヶ月のテナント数と売上）
      (async () => {
        const months: {
          month: string;
          label: string;
          tenantCount: number;
          revenue: number;
        }[] = [];

        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const mStart = d.toISOString().split("T")[0];
          const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0)
            .toISOString()
            .split("T")[0];
          const label = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}`;

          // その月末時点でのテナント数（created_at がその月末以前）
          const { count: tCount } = await supabaseAdmin
            .from("tenants")
            .select("id", { count: "exact", head: true })
            .eq("is_active", true)
            .is("deleted_at", null)
            .lte("created_at", mEnd + "T23:59:59.999Z");

          // その月の売上合計
          const { data: mOrders } = await supabaseAdmin
            .from("orders")
            .select("amount")
            .gte("paid_at", mStart)
            .lte("paid_at", mEnd + "T23:59:59.999Z")
            .not("paid_at", "is", null);

          const mRevenue = (mOrders || []).reduce(
            (sum, o) => sum + (o.amount || 0),
            0
          );

          months.push({
            month: mStart,
            label,
            tenantCount: tCount || 0,
            revenue: mRevenue,
          });
        }

        return months;
      })(),
    ]);

    // 今月の総売上計算
    const totalRevenue = (revenueResult.data || []).reduce(
      (sum, o) => sum + (o.amount || 0),
      0
    );

    // アクティブテナント数（ユニークなtenant_id数）
    const uniqueTenantIds = new Set(
      (activeTenantsResult.data || []).map((o) => o.tenant_id)
    );

    return NextResponse.json({
      ok: true,
      stats: {
        totalTenants: tenantsResult.count || 0,
        totalPatients: patientsResult.count || 0,
        monthlyRevenue: totalRevenue,
        activeTenants: uniqueTenantIds.size,
        totalReservations: reservationsResult.count || 0,
        totalLineFriends: lineFriendsResult.count || 0,
        tenantRanking: tenantRankingResult,
        monthlyTrend: monthlyTrendResult,
      },
    });
  } catch (error) {
    console.error("ダッシュボード統計取得エラー:", error);
    return NextResponse.json(
      { ok: false, error: "統計データの取得に失敗しました" },
      { status: 500 }
    );
  }
}
