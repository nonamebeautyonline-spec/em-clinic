// app/api/admin/line/nps/[id]/route.ts — NPS統計・回答一覧
import { NextRequest, NextResponse } from "next/server";
import { notFound, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow, strictWithTenant } from "@/lib/tenant";

interface NpsResponse {
  score: number;
  created_at: string;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const { id } = await params;
  const surveyId = parseInt(id);

  // 調査情報
  const { data: survey } = await strictWithTenant(
    supabaseAdmin.from("nps_surveys").select("*").eq("id", surveyId).single(),
    tenantId
  );

  if (!survey) {
    return notFound("調査が見つかりません");
  }

  // 全回答取得
  const { data: responses } = await strictWithTenant(
    supabaseAdmin.from("nps_responses")
      .select("*")
      .eq("survey_id", surveyId)
      .order("created_at", { ascending: false }),
    tenantId
  );

  const allResponses = (responses || []) as NpsResponse[];

  // NPSスコア算出
  const promoters = allResponses.filter((r) => r.score >= 9).length;
  const passives = allResponses.filter((r) => r.score >= 7 && r.score <= 8).length;
  const detractors = allResponses.filter((r) => r.score <= 6).length;
  const total = allResponses.length;

  const npsScore = total > 0
    ? Math.round(((promoters - detractors) / total) * 100)
    : null;

  // 月次推移
  const monthlyMap = new Map<string, { promoters: number; passives: number; detractors: number; total: number }>();
  for (const r of allResponses) {
    const month = r.created_at?.slice(0, 7) || "unknown";
    if (!monthlyMap.has(month)) {
      monthlyMap.set(month, { promoters: 0, passives: 0, detractors: 0, total: 0 });
    }
    const m = monthlyMap.get(month)!;
    m.total++;
    if (r.score >= 9) m.promoters++;
    else if (r.score >= 7) m.passives++;
    else m.detractors++;
  }

  const monthly = Array.from(monthlyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month,
      ...data,
      nps: Math.round(((data.promoters - data.detractors) / data.total) * 100),
    }));

  // スコア分布
  const distribution = Array.from({ length: 11 }, (_, i) => ({
    score: i,
    count: allResponses.filter((r) => r.score === i).length,
  }));

  return NextResponse.json({
    survey,
    stats: {
      total,
      npsScore,
      promoters,
      passives,
      detractors,
      promoterRate: total > 0 ? Math.round((promoters / total) * 100) : 0,
      detractorRate: total > 0 ? Math.round((detractors / total) * 100) : 0,
    },
    distribution,
    monthly,
    responses: allResponses.slice(0, 100), // 最新100件
  });
}
