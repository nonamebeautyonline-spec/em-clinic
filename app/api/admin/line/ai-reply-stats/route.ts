// app/api/admin/line/ai-reply-stats/route.ts — AI返信統計API
import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow, strictWithTenant } from "@/lib/tenant";

// トークンあたりの推定コスト（USD）— GPT-4o-mini 相当
const COST_PER_INPUT_TOKEN = 0.00000015;
const COST_PER_OUTPUT_TOKEN = 0.0000006;

export async function GET(req: NextRequest) {
  // 認証チェック
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) {
    return unauthorized();
  }

  const tenantId = resolveTenantIdOrThrow(req);
  const period = Number(req.nextUrl.searchParams.get("period")) || 30;
  const validPeriod = [7, 30, 90].includes(period) ? period : 30;

  // 期間開始日
  const periodStart = new Date();
  periodStart.setDate(periodStart.getDate() - validPeriod);
  const periodStartStr = periodStart.toISOString().slice(0, 10);

  // --- 1. 期間内の全ドラフトを取得 ---
  const { data: drafts, error: draftsError } = await strictWithTenant(
    supabaseAdmin
      .from("ai_reply_drafts")
      .select("id, status, ai_category, confidence, input_tokens, output_tokens, created_at, sent_at, original_message, draft_reply, model_used, reject_category")
      .gte("created_at", `${periodStartStr}T00:00:00Z`)
      .order("created_at", { ascending: false }),
    tenantId
  );

  if (draftsError) {
    console.error("[ai-reply-stats] fetch error:", draftsError);
    return serverError("データ取得に失敗しました");
  }

  const rows = drafts || [];

  // --- 2. KPI算出 ---
  const total = rows.length;
  const sentCount = rows.filter((r) => r.status === "sent").length;
  const rejectedCount = rows.filter((r) => r.status === "rejected").length;
  const approvalRate = total > 0 ? Number(((sentCount / total) * 100).toFixed(1)) : 0;
  const rejectionRate = total > 0 ? Number(((rejectedCount / total) * 100).toFixed(1)) : 0;

  // 平均信頼度（confidenceがnullでないもの）
  const confidenceRows = rows.filter((r) => r.confidence != null);
  const avgConfidence = confidenceRows.length > 0
    ? Number((confidenceRows.reduce((sum, r) => sum + (r.confidence ?? 0), 0) / confidenceRows.length).toFixed(3))
    : 0;

  // トークン消費
  const totalInputTokens = rows.reduce((sum, r) => sum + (r.input_tokens || 0), 0);
  const totalOutputTokens = rows.reduce((sum, r) => sum + (r.output_tokens || 0), 0);
  const totalTokens = totalInputTokens + totalOutputTokens;
  const estimatedCost = Number(
    (totalInputTokens * COST_PER_INPUT_TOKEN + totalOutputTokens * COST_PER_OUTPUT_TOKEN).toFixed(4)
  );

  // 平均応答時間（sent_at - created_at、sentのみ）
  const sentRows = rows.filter((r) => r.status === "sent" && r.sent_at && r.created_at);
  const avgResponseTimeSec = sentRows.length > 0
    ? Math.round(
        sentRows.reduce((sum, r) => {
          const diff = new Date(r.sent_at).getTime() - new Date(r.created_at).getTime();
          return sum + diff;
        }, 0) / sentRows.length / 1000
      )
    : 0;

  // --- 3. カテゴリ別件数 ---
  const categoryMap = new Map<string, number>();
  for (const r of rows) {
    const cat = r.ai_category || "other";
    categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
  }
  const categoryStats = Array.from(categoryMap.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);

  // --- 4. 日次推移 ---
  const dailyMap = new Map<string, {
    date: string;
    total: number;
    sent: number;
    rejected: number;
    expired: number;
    pending: number;
    inputTokens: number;
    outputTokens: number;
  }>();

  for (const r of rows) {
    const date = r.created_at.slice(0, 10);
    if (!dailyMap.has(date)) {
      dailyMap.set(date, {
        date,
        total: 0,
        sent: 0,
        rejected: 0,
        expired: 0,
        pending: 0,
        inputTokens: 0,
        outputTokens: 0,
      });
    }
    const day = dailyMap.get(date)!;
    day.total++;
    if (r.status === "sent") day.sent++;
    else if (r.status === "rejected") day.rejected++;
    else if (r.status === "expired") day.expired++;
    else day.pending++;
    day.inputTokens += r.input_tokens || 0;
    day.outputTokens += r.output_tokens || 0;
  }

  // 期間内の全日を埋める（データがない日も0で表示）
  const dailyTrend: typeof dailyMap extends Map<string, infer V> ? V[] : never = [];
  const cursor = new Date(periodStartStr);
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  while (cursor <= today) {
    const dateStr = cursor.toISOString().slice(0, 10);
    dailyTrend.push(
      dailyMap.get(dateStr) || {
        date: dateStr,
        total: 0,
        sent: 0,
        rejected: 0,
        expired: 0,
        pending: 0,
        inputTokens: 0,
        outputTokens: 0,
      }
    );
    cursor.setDate(cursor.getDate() + 1);
  }

  // --- 5. 却下理由分布 ---
  const rejectCategoryMap = new Map<string, number>();
  for (const r of rows) {
    if (r.status === "rejected" && r.reject_category) {
      const cat = r.reject_category;
      rejectCategoryMap.set(cat, (rejectCategoryMap.get(cat) || 0) + 1);
    }
  }
  const rejectCategoryStats = Array.from(rejectCategoryMap.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);

  // --- 6. 修正率（staff_editで送信された割合） ---
  // ai_reply_examplesのsource="staff_edit"かつ期間内のドラフトに紐づくものを集計
  // 簡易実装: sentの中でai_reply_examplesにstaff_editとして学習保存されたもの = 修正送信
  // ここではsent件数中のstaff_edit件数を取得
  const { count: staffEditCount } = await strictWithTenant(
    supabaseAdmin
      .from("ai_reply_examples")
      .select("id", { count: "exact", head: true })
      .eq("source", "staff_edit")
      .gte("created_at", `${periodStartStr}T00:00:00Z`),
    tenantId
  );
  const editCount = staffEditCount || 0;
  const editRate = sentCount > 0 ? Number(((editCount / sentCount) * 100).toFixed(1)) : 0;

  // --- 7. 学習例の統計（quality_score分布・総数・source別件数） ---
  const { data: examples } = await strictWithTenant(
    supabaseAdmin
      .from("ai_reply_examples")
      .select("id, quality_score, source"),
    tenantId
  );
  const exampleRows = examples || [];
  const examplesCount = exampleRows.length;

  // quality_score分布（4区間）
  const qualityBuckets = [
    { range: "0-0.5", min: 0, max: 0.5, count: 0 },
    { range: "0.5-1.0", min: 0.5, max: 1.0, count: 0 },
    { range: "1.0-1.5", min: 1.0, max: 1.5, count: 0 },
    { range: "1.5-2.0", min: 1.5, max: 2.0, count: 0 },
  ];
  for (const ex of exampleRows) {
    const score = ex.quality_score ?? 1.0;
    for (const bucket of qualityBuckets) {
      if (score >= bucket.min && (score < bucket.max || (bucket.max === 2.0 && score <= 2.0))) {
        bucket.count++;
        break;
      }
    }
  }
  const qualityDistribution = qualityBuckets.map(({ range, count }) => ({ range, count }));

  // --- 8. 直近ドラフト一覧（最新20件） ---
  const recentDrafts = rows.slice(0, 20).map((r) => ({
    id: r.id,
    status: r.status,
    category: r.ai_category,
    originalMessage: r.original_message?.slice(0, 80) || "",
    draftReply: r.draft_reply?.slice(0, 80) || "",
    confidence: r.confidence,
    modelUsed: r.model_used,
    createdAt: r.created_at,
    sentAt: r.sent_at,
  }));

  return NextResponse.json({
    kpi: {
      total,
      approvalRate,
      rejectionRate,
      avgConfidence,
      totalTokens,
      totalInputTokens,
      totalOutputTokens,
      estimatedCost,
      avgResponseTimeSec,
    },
    categoryStats,
    rejectCategoryStats,
    editRate,
    qualityDistribution,
    examplesCount,
    dailyTrend,
    recentDrafts,
    period: validPeriod,
  });
}
