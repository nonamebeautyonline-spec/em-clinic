// プラットフォーム管理: クリニック間ベンチマークAPI
// 全テナントのKPIを収集し、平均・上位20%・下位20%を算出

import { NextRequest, NextResponse } from "next/server";
import { forbidden, serverError } from "@/lib/api-error";
import { verifyPlatformAdmin } from "@/lib/platform-auth";
import { supabaseAdmin } from "@/lib/supabase";

interface TenantKPI {
  id: string;
  name: string;
  slug: string;
  funnel: {
    intakeToReservation: number;
    reservationToConsultation: number;
    consultationToPayment: number;
  };
  aiReply: {
    approvalRate: number;
    editRate: number;
    totalDrafts: number;
  };
  line: {
    blockRate: number;
    followers: number;
  };
  revenue: {
    monthlyRevenue: number;
    avgOrderAmount: number;
    reorderRate: number;
    orderCount: number;
  };
}

interface BenchmarkValues {
  avg: number;
  top20: number;
  bottom20: number;
}

export async function GET(req: NextRequest) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin) return forbidden("権限がありません");

  try {
    // アクティブテナント一覧
    const { data: tenants } = await supabaseAdmin
      .from("tenants")
      .select("id, name, slug")
      .eq("is_active", true)
      .is("deleted_at", null);

    if (!tenants || tenants.length === 0) {
      return NextResponse.json({ ok: true, tenants: [], benchmarks: null });
    }

    // 今月の範囲（JST）
    const now = new Date();
    const jstOffset = 9 * 60 * 60 * 1000;
    const jstNow = new Date(now.getTime() + jstOffset);
    const year = jstNow.getUTCFullYear();
    const month = jstNow.getUTCMonth();
    const monthStart = new Date(Date.UTC(year, month, 1, 0, 0, 0) - jstOffset);
    const monthEnd = new Date(Date.UTC(year, month + 1, 1, 0, 0, 0) - jstOffset);
    const startISO = monthStart.toISOString();
    const endISO = monthEnd.toISOString();

    // RPC用の日付パラメータ
    const jstStartForDate = new Date(monthStart.getTime() + jstOffset);
    const jstEndForDate = new Date(monthEnd.getTime() + jstOffset);
    const reservationStartDate = jstStartForDate.toISOString().split("T")[0];
    const reservationEndDate = jstEndForDate.toISOString().split("T")[0];

    // 前月の範囲
    const prevMonthStart = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0) - jstOffset);
    const prevStartISO = prevMonthStart.toISOString();

    // 配送日付
    const shippingStartDate = reservationStartDate;
    const shippingEndDate = reservationEndDate;

    // 30日前
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // 各テナントのKPIを並列収集
    const tenantKPIs: TenantKPI[] = await Promise.all(
      tenants.map(async (tenant) => {
        const [rpcResult, aiResult, lineResult, revenueResult] = await Promise.all([
          // 1. ファネル転換率（RPC）
          supabaseAdmin.rpc("dashboard_enhanced_stats", {
            p_tenant_id: tenant.id,
            p_start_iso: startISO,
            p_end_iso: endISO,
            p_prev_start_iso: prevStartISO,
            p_prev_end_iso: startISO,
            p_reservation_start_date: reservationStartDate,
            p_reservation_end_date: reservationEndDate,
            p_shipping_start_date: shippingStartDate,
            p_shipping_end_date: shippingEndDate,
          }),

          // 2. AI返信統計
          supabaseAdmin
            .from("ai_reply_drafts")
            .select("status")
            .eq("tenant_id", tenant.id)
            .gte("created_at", thirtyDaysAgo),

          // 3. LINE統計（最新の日次データ）
          supabaseAdmin
            .from("line_daily_stats")
            .select("followers, blocks")
            .eq("tenant_id", tenant.id)
            .order("stat_date", { ascending: false })
            .limit(1),

          // 4. 今月の売上
          supabaseAdmin
            .from("orders")
            .select("amount, patient_id")
            .eq("tenant_id", tenant.id)
            .not("paid_at", "is", null)
            .gte("paid_at", startISO)
            .lt("paid_at", endISO),
        ]);

        // ファネル転換率
        const rpc = rpcResult.data as { kpi?: { reservationRateAfterIntake?: number; consultationCompletionRate?: number; paymentRateAfterConsultation?: number }; shipping?: { total?: number; reorder?: number } } | null;
        const funnel = {
          intakeToReservation: rpc?.kpi?.reservationRateAfterIntake ?? 0,
          reservationToConsultation: rpc?.kpi?.consultationCompletionRate ?? 0,
          consultationToPayment: rpc?.kpi?.paymentRateAfterConsultation ?? 0,
        };

        // AI返信統計
        const drafts = aiResult.data || [];
        const totalDrafts = drafts.length;
        const sentCount = drafts.filter((d: { status: string }) => d.status === "sent").length;
        const approvalRate = totalDrafts > 0 ? Math.round((sentCount / totalDrafts) * 100) : 0;
        // 修正率は簡易計算（staff_edit数はここでは取得しない）
        const editRate = 0; // Phase2で詳細実装

        // LINE統計
        const lineData = lineResult.data?.[0];
        const followers = lineData?.followers ?? 0;
        const blocks = lineData?.blocks ?? 0;
        const blockRate = followers > 0 ? Math.round((blocks / followers) * 1000) / 10 : 0;

        // 売上統計
        const orders = revenueResult.data || [];
        const monthlyRevenue = orders.reduce((sum: number, o: { amount?: number }) => sum + (o.amount || 0), 0);
        const orderCount = orders.length;
        const avgOrderAmount = orderCount > 0 ? Math.round(monthlyRevenue / orderCount) : 0;
        const reorderRate = rpc?.shipping?.total && rpc.shipping.total > 0
          ? Math.round(((rpc.shipping.reorder ?? 0) / rpc.shipping.total) * 100)
          : 0;

        return {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          funnel,
          aiReply: { approvalRate, editRate, totalDrafts },
          line: { blockRate, followers },
          revenue: { monthlyRevenue, avgOrderAmount, reorderRate, orderCount },
        };
      })
    );

    // ベンチマーク値を算出
    const calcBenchmark = (values: number[]): BenchmarkValues => {
      const sorted = [...values].sort((a, b) => a - b);
      const len = sorted.length;
      if (len === 0) return { avg: 0, top20: 0, bottom20: 0 };
      const avg = Math.round((sorted.reduce((s, v) => s + v, 0) / len) * 10) / 10;
      const top20Idx = Math.max(0, Math.ceil(len * 0.8) - 1);
      const bottom20Idx = Math.max(0, Math.floor(len * 0.2));
      return {
        avg,
        top20: sorted[top20Idx],
        bottom20: sorted[bottom20Idx],
      };
    };

    const benchmarks = {
      funnel: {
        intakeToReservation: calcBenchmark(tenantKPIs.map(t => t.funnel.intakeToReservation)),
        reservationToConsultation: calcBenchmark(tenantKPIs.map(t => t.funnel.reservationToConsultation)),
        consultationToPayment: calcBenchmark(tenantKPIs.map(t => t.funnel.consultationToPayment)),
      },
      aiReply: {
        approvalRate: calcBenchmark(tenantKPIs.map(t => t.aiReply.approvalRate)),
      },
      line: {
        blockRate: calcBenchmark(tenantKPIs.map(t => t.line.blockRate)),
      },
      revenue: {
        monthlyRevenue: calcBenchmark(tenantKPIs.map(t => t.revenue.monthlyRevenue)),
        avgOrderAmount: calcBenchmark(tenantKPIs.map(t => t.revenue.avgOrderAmount)),
        reorderRate: calcBenchmark(tenantKPIs.map(t => t.revenue.reorderRate)),
      },
    };

    return NextResponse.json({ ok: true, tenants: tenantKPIs, benchmarks });
  } catch (error) {
    console.error("[benchmark] Error:", error);
    return serverError("ベンチマークデータの取得に失敗しました");
  }
}
