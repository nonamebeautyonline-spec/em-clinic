// app/api/admin/line/ai-reply-stats/route.ts — AI返信統計API
import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow, strictWithTenant } from "@/lib/tenant";

import {
  ESTIMATED_COST_PER_INPUT_TOKEN,
  ESTIMATED_COST_PER_OUTPUT_TOKEN,
} from "@/lib/ai-cost-constants";
import { getBlockCounts } from "@/lib/ai-cost-guard";

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
      .select("id, status, ai_category, confidence, input_tokens, output_tokens, created_at, sent_at, original_message, draft_reply, model_used, reject_category, modified_reply, retrieved_example_ids, message_received_at, routing_reason, reuse_source_example_id, patient_id")
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
    (totalInputTokens * ESTIMATED_COST_PER_INPUT_TOKEN + totalOutputTokens * ESTIMATED_COST_PER_OUTPUT_TOKEN).toFixed(4)
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

  // --- 8. 新メトリクス（Phase 1-2 Evals基盤） ---
  // スタッフ修正率（modified_replyが存在するsentドラフトの割合）
  const modifiedSentCount = rows.filter((r) => r.status === "sent" && r.modified_reply).length;
  const modificationRate = sentCount > 0 ? Number(((modifiedSentCount / sentCount) * 100).toFixed(1)) : 0;

  // retrieval活用率（retrieved_example_idsが空でないドラフトの割合）
  const retrievalUsedCount = rows.filter((r) => r.retrieved_example_ids && r.retrieved_example_ids.length > 0).length;
  const retrievalUsageRate = total > 0 ? Number(((retrievalUsedCount / total) * 100).toFixed(1)) : 0;

  // hallucination率（却下理由がwrong_infoの割合）
  const wrongInfoCount = rows.filter((r) => r.status === "rejected" && r.reject_category === "wrong_info").length;
  const hallucinationRate = rejectedCount > 0 ? Number(((wrongInfoCount / rejectedCount) * 100).toFixed(1)) : 0;

  // 平均生成時間（message_received_at → created_at）
  const genTimeRows = rows.filter((r) => r.message_received_at && r.created_at);
  const avgGenerationTimeSec = genTimeRows.length > 0
    ? Math.round(
        genTimeRows.reduce((sum, r) => {
          const diff = new Date(r.created_at).getTime() - new Date(r.message_received_at).getTime();
          return sum + Math.max(0, diff);
        }, 0) / genTimeRows.length / 1000
      )
    : 0;

  // --- 9. 直近ドラフト一覧（最新20件） ---
  const recentDrafts = rows.slice(0, 20).map((r) => ({
    id: r.id,
    status: r.status,
    category: r.ai_category,
    originalMessage: r.original_message?.slice(0, 80) || "",
    draftReply: r.draft_reply?.slice(0, 80) || "",
    confidence: r.confidence,
    modelUsed: r.model_used,
    routingReason: r.routing_reason || null,
    createdAt: r.created_at,
    sentAt: r.sent_at,
  }));

  // --- 10. モデル別統計（Case Routing） ---
  const modelUsageMap = new Map<string, { total: number; sent: number; rejected: number }>();
  for (const r of rows) {
    const model = r.model_used || "unknown";
    if (!modelUsageMap.has(model)) {
      modelUsageMap.set(model, { total: 0, sent: 0, rejected: 0 });
    }
    const entry = modelUsageMap.get(model)!;
    entry.total++;
    if (r.status === "sent") entry.sent++;
    if (r.status === "rejected") entry.rejected++;
  }
  const modelStats = Array.from(modelUsageMap.entries()).map(([model, stats]) => ({
    model,
    total: stats.total,
    sent: stats.sent,
    rejected: stats.rejected,
    approvalRate: stats.total > 0 ? Number(((stats.sent / stats.total) * 100).toFixed(1)) : 0,
  }));

  // Haiku/Sonnet使用比率
  const haikuCount = rows.filter(r => r.model_used?.includes("haiku")).length;
  const modelUsageRatio = {
    haiku: haikuCount,
    sonnet: total - haikuCount,
    haikuPercent: total > 0 ? Number(((haikuCount / total) * 100).toFixed(1)) : 0,
  };

  // ルーティング理由分布
  const routingReasonMap = new Map<string, number>();
  for (const r of rows) {
    if (r.routing_reason) {
      routingReasonMap.set(r.routing_reason, (routingReasonMap.get(r.routing_reason) || 0) + 1);
    }
  }
  const routingReasonStats = Array.from(routingReasonMap.entries())
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count);

  // --- 12. Outcome Evals ---
  // 再利用率
  const reuseCount = rows.filter(r => r.reuse_source_example_id != null).length;
  const reuseRate = total > 0 ? Number(((reuseCount / total) * 100).toFixed(1)) : 0;

  // 人手介入率
  const humanInterventionCount = rows.filter(r =>
    r.status === "rejected" || (r.status === "sent" && r.modified_reply)
  ).length;
  const humanInterventionRate = total > 0 ? Number(((humanInterventionCount / total) * 100).toFixed(1)) : 0;

  // 解決率（sent後24h経過したドラフトのみ対象）
  // パフォーマンス考慮: patient_idを50件バッチで確認
  const evalCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const evalEligible = rows.filter(r => r.status === "sent" && r.sent_at && r.sent_at < evalCutoff);

  let resolvedCount = 0;
  if (evalEligible.length > 0) {
    // patient_id + sent_at のペアを収集
    const patientSentPairs = evalEligible.map(r => ({ patientId: r.patient_id, sentAt: r.sent_at }));

    // バッチで message_log を確認
    const uniquePatientIds = Array.from(new Set(patientSentPairs.map(p => p.patientId)));
    const batchSize = 50;
    const followUpMap = new Map<string, string[]>(); // patient_id → incoming sent_at[]

    for (let i = 0; i < uniquePatientIds.length; i += batchSize) {
      const batch = uniquePatientIds.slice(i, i + batchSize);
      const { data: msgs } = await strictWithTenant(
        supabaseAdmin
          .from("message_log")
          .select("patient_id, sent_at")
          .in("patient_id", batch)
          .eq("direction", "incoming")
          .gte("sent_at", evalCutoff),
        tenantId
      );
      if (msgs) {
        for (const m of msgs) {
          if (!followUpMap.has(m.patient_id)) followUpMap.set(m.patient_id, []);
          followUpMap.get(m.patient_id)!.push(m.sent_at);
        }
      }
    }

    // 各evalEligibleドラフトについて解決判定
    for (const draft of evalEligible) {
      const incomings = followUpMap.get(draft.patient_id) || [];
      const draftSentAt = new Date(draft.sent_at).getTime();
      const cutoff24h = draftSentAt + 24 * 60 * 60 * 1000;
      const hasFollowUp = incomings.some(t => {
        const inTime = new Date(t).getTime();
        return inTime > draftSentAt && inTime <= cutoff24h;
      });
      if (!hasFollowUp) resolvedCount++;
    }
  }

  const resolutionRate = evalEligible.length > 0
    ? Number(((resolvedCount / evalEligible.length) * 100).toFixed(1))
    : 0;

  // ブロック件数（Redis、本日分）
  const blockCounts = await getBlockCounts(tenantId);

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
    modificationRate,
    retrievalUsageRate,
    hallucinationRate,
    avgGenerationTimeSec,
    qualityDistribution,
    examplesCount,
    dailyTrend,
    recentDrafts,
    blockCounts,
    modelStats,
    modelUsageRatio,
    routingReasonStats,
    reuseRate,
    humanInterventionRate,
    resolutionRate,
    evalEligibleCount: evalEligible.length,
    period: validPeriod,
  });
}
