// app/api/platform/analytics/financial/route.ts
// プラットフォーム管理: 財務分析API

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
    // MRR: アクティブなプランの月額合計
    const { data: activePlans } = await supabaseAdmin
      .from("tenant_plans")
      .select("plan_name, monthly_fee, status")
      .eq("status", "active");

    const mrr = (activePlans || []).reduce((sum, p) => sum + (p.monthly_fee || 0), 0);
    const arr = mrr * 12;

    // プラン別構成比
    const planBreakdown: Record<string, { count: number; total: number }> = {};
    for (const p of activePlans || []) {
      const name = p.plan_name || "unknown";
      if (!planBreakdown[name]) planBreakdown[name] = { count: 0, total: 0 };
      planBreakdown[name].count += 1;
      planBreakdown[name].total += p.monthly_fee || 0;
    }
    const planDistribution = Object.entries(planBreakdown).map(([name, data]) => ({
      planName: name,
      count: data.count,
      monthlyTotal: data.total,
    }));

    // 月別請求額推移（直近12ヶ月）
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    const sinceDate = twelveMonthsAgo.toISOString().slice(0, 10);

    const { data: invoices } = await supabaseAdmin
      .from("billing_invoices")
      .select("amount, status, billing_period_start")
      .gte("billing_period_start", sinceDate);

    // 月別集計
    const monthlyBilling: Record<string, number> = {};
    let unpaidAmount = 0;

    for (const inv of invoices || []) {
      if (inv.billing_period_start) {
        const month = inv.billing_period_start.slice(0, 7);
        monthlyBilling[month] = (monthlyBilling[month] || 0) + (inv.amount || 0);
      }
      if (inv.status === "pending" || inv.status === "overdue") {
        unpaidAmount += inv.amount || 0;
      }
    }

    // 12ヶ月分の配列を生成
    const monthlyTrend: { month: string; amount: number }[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthlyTrend.push({ month: key, amount: monthlyBilling[key] || 0 });
    }

    return NextResponse.json({
      ok: true,
      mrr,
      arr,
      unpaidAmount,
      monthlyTrend,
      planDistribution,
    });
  } catch (err) {
    console.error("[platform/analytics/financial] GET error:", err);
    return NextResponse.json(
      { ok: false, error: "財務データの取得に失敗しました" },
      { status: 500 },
    );
  }
}
