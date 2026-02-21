// app/api/platform/analytics/churn/route.ts
// プラットフォーム管理: チャーンリスク分析API

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
    // 全テナント取得
    const { data: tenants } = await supabaseAdmin
      .from("tenants")
      .select("id, name, slug, is_active")
      .eq("is_active", true);

    if (!tenants || tenants.length === 0) {
      return NextResponse.json({ ok: true, tenants: [] });
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();

    // テナントメンバーのadmin_user_idを取得
    const { data: allMembers } = await supabaseAdmin
      .from("tenant_members")
      .select("tenant_id, admin_user_id");

    // テナントID → admin_user_id[] のマップ
    const tenantUserMap: Record<string, string[]> = {};
    for (const m of allMembers || []) {
      if (!tenantUserMap[m.tenant_id]) tenantUserMap[m.tenant_id] = [];
      tenantUserMap[m.tenant_id].push(m.admin_user_id);
    }

    // 直近30日のセッション（ログイン回数算出）
    const { data: recentSessions } = await supabaseAdmin
      .from("admin_sessions")
      .select("admin_user_id, created_at")
      .gte("created_at", thirtyDaysAgo);

    // admin_user_id → ログイン回数
    const loginCountMap: Record<string, number> = {};
    for (const s of recentSessions || []) {
      loginCountMap[s.admin_user_id] = (loginCountMap[s.admin_user_id] || 0) + 1;
    }

    // 直近30日の売上（テナント別）
    const { data: recentOrders } = await supabaseAdmin
      .from("orders")
      .select("tenant_id, amount, paid_at")
      .not("paid_at", "is", null)
      .gte("paid_at", thirtyDaysAgo);

    // 直近30-60日の売上（前月比用）
    const { data: prevOrders } = await supabaseAdmin
      .from("orders")
      .select("tenant_id, amount, paid_at")
      .not("paid_at", "is", null)
      .gte("paid_at", sixtyDaysAgo)
      .lt("paid_at", thirtyDaysAgo);

    // テナント別の売上集計
    const currentRevenueMap: Record<string, number> = {};
    for (const o of recentOrders || []) {
      if (o.tenant_id) {
        currentRevenueMap[o.tenant_id] = (currentRevenueMap[o.tenant_id] || 0) + (o.amount || 0);
      }
    }

    const prevRevenueMap: Record<string, number> = {};
    for (const o of prevOrders || []) {
      if (o.tenant_id) {
        prevRevenueMap[o.tenant_id] = (prevRevenueMap[o.tenant_id] || 0) + (o.amount || 0);
      }
    }

    // 未払い請求件数
    const { data: unpaidInvoices } = await supabaseAdmin
      .from("billing_invoices")
      .select("tenant_id, status")
      .or("status.eq.pending,status.eq.overdue");

    const unpaidCountMap: Record<string, number> = {};
    for (const inv of unpaidInvoices || []) {
      if (inv.tenant_id) {
        unpaidCountMap[inv.tenant_id] = (unpaidCountMap[inv.tenant_id] || 0) + 1;
      }
    }

    // テナントごとのリスクスコア算出
    const tenantRisks = tenants.map((t) => {
      const userIds = tenantUserMap[t.id] || [];
      const loginCount = userIds.reduce(
        (sum, uid) => sum + (loginCountMap[uid] || 0),
        0,
      );
      const currentRevenue = currentRevenueMap[t.id] || 0;
      const prevRevenue = prevRevenueMap[t.id] || 0;
      const unpaidCount = unpaidCountMap[t.id] || 0;

      // 売上変化率
      const revenueChangeRate = prevRevenue > 0
        ? ((currentRevenue - prevRevenue) / prevRevenue) * 100
        : 0;

      // リスクスコア算出
      let score = 0;
      if (loginCount === 0) score += 40;
      if (prevRevenue > 0 && revenueChangeRate <= -50) score += 30;
      if (unpaidCount > 0) score += 30;

      return {
        tenantId: t.id,
        tenantName: t.name,
        slug: t.slug,
        riskScore: score,
        loginCount,
        currentRevenue,
        prevRevenue,
        revenueChangeRate: Math.round(revenueChangeRate * 10) / 10,
        unpaidCount,
      };
    });

    // リスクスコア降順でソート
    tenantRisks.sort((a, b) => b.riskScore - a.riskScore);

    return NextResponse.json({ ok: true, tenants: tenantRisks });
  } catch (err) {
    console.error("[platform/analytics/churn] GET error:", err);
    return NextResponse.json(
      { ok: false, error: "チャーンデータの取得に失敗しました" },
      { status: 500 },
    );
  }
}
