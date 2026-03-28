// プラットフォーム管理: AI Insights API
// 全テナント横断のAI返信統計・却下分析・学習例ランキング

import { NextRequest, NextResponse } from "next/server";
import { forbidden, badRequest, serverError } from "@/lib/api-error";
import { verifyPlatformAdmin } from "@/lib/platform-auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin) return forbidden("権限がありません");

  const section = req.nextUrl.searchParams.get("section") || "stats";

  try {
    switch (section) {
      case "stats":
        return await getOverallStats();
      case "reject-analysis":
        return await getRejectAnalysis();
      case "quality-ranking":
        return await getQualityRanking();
      case "tenant-comparison":
        return await getTenantComparison();
      default:
        return badRequest("不正なsectionパラメータ");
    }
  } catch (error) {
    console.error("[ai-insights] Error:", error);
    return serverError("AI Insightsデータの取得に失敗しました");
  }
}

// 1. 全体統計（KPIカード + 月別トレンド）
async function getOverallStats() {
  // 全テナントのAI返信ドラフトを集計
  const { data: drafts } = await supabaseAdmin
    .from("ai_reply_drafts")
    .select("status, created_at, tenant_id")
    .limit(100000);

  const allDrafts = drafts || [];
  const totalDrafts = allDrafts.length;
  const sentCount = allDrafts.filter(d => d.status === "sent").length;
  const rejectedCount = allDrafts.filter(d => d.status === "rejected").length;
  const expiredCount = allDrafts.filter(d => d.status === "expired").length;
  const approvalRate = totalDrafts > 0 ? Math.round((sentCount / totalDrafts) * 100 * 10) / 10 : 0;
  const rejectionRate = totalDrafts > 0 ? Math.round((rejectedCount / totalDrafts) * 100 * 10) / 10 : 0;

  // 月別トレンド（直近6ヶ月）
  const now = new Date();
  const monthlyTrend: { month: string; total: number; sent: number; rejected: number; approvalRate: number }[] = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1);

    const monthDrafts = allDrafts.filter(draft => {
      const created = new Date(draft.created_at);
      return created >= d && created < nextMonth;
    });

    const mTotal = monthDrafts.length;
    const mSent = monthDrafts.filter(dd => dd.status === "sent").length;
    const mRejected = monthDrafts.filter(dd => dd.status === "rejected").length;

    monthlyTrend.push({
      month: monthStr,
      total: mTotal,
      sent: mSent,
      rejected: mRejected,
      approvalRate: mTotal > 0 ? Math.round((mSent / mTotal) * 100 * 10) / 10 : 0,
    });
  }

  // 学習例の総数
  const { count: exampleCount } = await supabaseAdmin
    .from("ai_reply_examples")
    .select("id", { count: "exact", head: true });

  return NextResponse.json({
    ok: true,
    stats: {
      totalDrafts,
      sentCount,
      rejectedCount,
      expiredCount,
      approvalRate,
      rejectionRate,
      exampleCount: exampleCount || 0,
    },
    monthlyTrend,
  });
}

// 2. 却下理由分析
async function getRejectAnalysis() {
  const { data: rejected } = await supabaseAdmin
    .from("ai_reply_drafts")
    .select("reject_category, tenant_id")
    .eq("status", "rejected")
    .limit(100000);

  const allRejected = rejected || [];

  // カテゴリ別集計
  const categoryMap: Record<string, number> = {};
  for (const d of allRejected) {
    const cat = d.reject_category || "未分類";
    categoryMap[cat] = (categoryMap[cat] || 0) + 1;
  }

  const categories = Object.entries(categoryMap)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);

  // テナント別却下数
  const { data: tenants } = await supabaseAdmin
    .from("tenants")
    .select("id, name")
    .eq("is_active", true)
    .is("deleted_at", null);

  const tenantMap = new Map((tenants || []).map(t => [t.id, t.name]));

  const tenantRejectMap: Record<string, Record<string, number>> = {};
  for (const d of allRejected) {
    const tid = d.tenant_id;
    if (!tenantRejectMap[tid]) tenantRejectMap[tid] = {};
    const cat = d.reject_category || "未分類";
    tenantRejectMap[tid][cat] = (tenantRejectMap[tid][cat] || 0) + 1;
  }

  const tenantRejects = Object.entries(tenantRejectMap).map(([tenantId, cats]) => ({
    tenantId,
    tenantName: tenantMap.get(tenantId) || tenantId,
    total: Object.values(cats).reduce((s, v) => s + v, 0),
    categories: cats,
  })).sort((a, b) => b.total - a.total);

  return NextResponse.json({
    ok: true,
    categories,
    tenantRejects,
  });
}

// 3. 学習例品質ランキング
async function getQualityRanking() {
  const { data: examples } = await supabaseAdmin
    .from("ai_reply_examples")
    .select("id, question, answer, source, used_count, tenant_id, created_at")
    .order("used_count", { ascending: false })
    .limit(100);

  // テナント名を付与
  const tenantIds = [...new Set((examples || []).map(e => e.tenant_id).filter(Boolean))];
  const { data: tenants } = await supabaseAdmin
    .from("tenants")
    .select("id, name")
    .in("id", tenantIds.length > 0 ? tenantIds : ["00000000-0000-0000-0000-000000000000"]);

  const tenantMap = new Map((tenants || []).map(t => [t.id, t.name]));

  const ranked = (examples || []).map(e => ({
    id: e.id,
    question: e.question,
    answer: e.answer,
    source: e.source,
    usedCount: e.used_count,
    tenantName: e.tenant_id ? (tenantMap.get(e.tenant_id) || "不明") : "グローバル",
    createdAt: e.created_at,
  }));

  return NextResponse.json({ ok: true, examples: ranked });
}

// 4. テナント別AI返信比較
async function getTenantComparison() {
  const { data: tenants } = await supabaseAdmin
    .from("tenants")
    .select("id, name, slug")
    .eq("is_active", true)
    .is("deleted_at", null);

  if (!tenants || tenants.length === 0) {
    return NextResponse.json({ ok: true, tenants: [] });
  }

  // 各テナントのAI返信統計を並列取得
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const tenantStats = await Promise.all(
    tenants.map(async (tenant) => {
      const [draftResult, exampleResult] = await Promise.all([
        supabaseAdmin
          .from("ai_reply_drafts")
          .select("status")
          .eq("tenant_id", tenant.id)
          .gte("created_at", thirtyDaysAgo),
        supabaseAdmin
          .from("ai_reply_examples")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenant.id),
      ]);

      const drafts = draftResult.data || [];
      const total = drafts.length;
      const sent = drafts.filter(d => d.status === "sent").length;
      const rejected = drafts.filter(d => d.status === "rejected").length;

      return {
        tenantId: tenant.id,
        tenantName: tenant.name,
        slug: tenant.slug,
        totalDrafts: total,
        sentCount: sent,
        rejectedCount: rejected,
        approvalRate: total > 0 ? Math.round((sent / total) * 100 * 10) / 10 : 0,
        exampleCount: exampleResult.count || 0,
      };
    })
  );

  return NextResponse.json({
    ok: true,
    tenants: tenantStats.sort((a, b) => b.totalDrafts - a.totalDrafts),
  });
}
