// app/api/admin/line/nps/stats/route.ts — NPS推移トレンド比較API
// 全調査横断 or 調査指定で月別NPS推移を返す
import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant } from "@/lib/tenant";

interface NpsResponseRow {
  survey_id: number;
  score: number;
  created_at: string;
}

interface MonthlyBucket {
  promoters: number;
  passives: number;
  detractors: number;
  total: number;
}

function classifyScore(score: number): "promoters" | "passives" | "detractors" {
  if (score >= 9) return "promoters";
  if (score >= 7) return "passives";
  return "detractors";
}

function calcNps(bucket: MonthlyBucket): number {
  if (bucket.total === 0) return 0;
  return Math.round(((bucket.promoters - bucket.detractors) / bucket.total) * 100);
}

export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantId(req);
  const { searchParams } = new URL(req.url);

  // survey_ids: カンマ区切り（空なら全調査）
  const surveyIdsParam = searchParams.get("survey_ids");
  const surveyIds = surveyIdsParam
    ? surveyIdsParam.split(",").map(Number).filter((n) => !isNaN(n))
    : [];

  // 期間フィルタ（任意）
  const from = searchParams.get("from"); // YYYY-MM
  const to = searchParams.get("to"); // YYYY-MM

  // 調査一覧取得（名前表示用）
  const { data: surveys } = await withTenant(
    supabaseAdmin.from("nps_surveys").select("id, title"),
    tenantId,
  );

  // 回答取得
  let query = withTenant(
    supabaseAdmin
      .from("nps_responses")
      .select("survey_id, score, created_at")
      .order("created_at", { ascending: true }),
    tenantId,
  );

  if (surveyIds.length > 0) {
    query = query.in("survey_id", surveyIds);
  }
  if (from) {
    query = query.gte("created_at", `${from}-01T00:00:00Z`);
  }
  if (to) {
    // to月の末日まで含める
    const [y, m] = to.split("-").map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    query = query.lte("created_at", `${to}-${String(lastDay).padStart(2, "0")}T23:59:59Z`);
  }

  const { data: responses, error } = await query;
  if (error) return serverError(error.message);

  const allResponses = (responses || []) as NpsResponseRow[];

  // ---------- 全調査統合の月別推移 ----------
  const overallMonthly = new Map<string, MonthlyBucket>();
  for (const r of allResponses) {
    const month = r.created_at?.slice(0, 7) || "unknown";
    if (!overallMonthly.has(month)) {
      overallMonthly.set(month, { promoters: 0, passives: 0, detractors: 0, total: 0 });
    }
    const b = overallMonthly.get(month)!;
    b.total++;
    b[classifyScore(r.score)]++;
  }

  const overall = Array.from(overallMonthly.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month,
      ...data,
      nps: calcNps(data),
    }));

  // ---------- 調査別の月別推移（トレンド比較用） ----------
  const bySurveyMonthly = new Map<number, Map<string, MonthlyBucket>>();
  for (const r of allResponses) {
    if (!bySurveyMonthly.has(r.survey_id)) {
      bySurveyMonthly.set(r.survey_id, new Map());
    }
    const surveyMap = bySurveyMonthly.get(r.survey_id)!;
    const month = r.created_at?.slice(0, 7) || "unknown";
    if (!surveyMap.has(month)) {
      surveyMap.set(month, { promoters: 0, passives: 0, detractors: 0, total: 0 });
    }
    const b = surveyMap.get(month)!;
    b.total++;
    b[classifyScore(r.score)]++;
  }

  const surveyMap = new Map((surveys || []).map((s: { id: number; title: string }) => [s.id, s.title]));

  const bySurvey = Array.from(bySurveyMonthly.entries()).map(([surveyId, monthMap]) => ({
    survey_id: surveyId,
    survey_title: surveyMap.get(surveyId) || `調査 #${surveyId}`,
    monthly: Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month,
        ...data,
        nps: calcNps(data),
      })),
  }));

  // ---------- 全体サマリー ----------
  const totalResponses = allResponses.length;
  const totalPromoters = allResponses.filter((r) => r.score >= 9).length;
  const totalDetractors = allResponses.filter((r) => r.score <= 6).length;
  const overallNps =
    totalResponses > 0
      ? Math.round(((totalPromoters - totalDetractors) / totalResponses) * 100)
      : null;

  return NextResponse.json({
    summary: {
      total: totalResponses,
      nps: overallNps,
      promoters: totalPromoters,
      passives: totalResponses - totalPromoters - totalDetractors,
      detractors: totalDetractors,
    },
    overall,
    bySurvey,
  });
}
