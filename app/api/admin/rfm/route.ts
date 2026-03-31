// app/api/admin/rfm/route.ts — RFM分析API
import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized } from "@/lib/api-error";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveTenantIdOrThrow } from "@/lib/tenant";

/** 配列を5分位でスコアリング（1-5） */
function scoreQuintile(arr: number[], reverse = false): number[] {
  if (arr.length === 0) return [];
  const sorted = [...arr].sort((a, b) => a - b);
  const len = sorted.length;
  return arr.map((v) => {
    // 同値がある場合、最初のインデックスを使用
    let idx = sorted.indexOf(v);
    // パーセンタイル位置に基づくスコア
    const rank = idx / Math.max(len - 1, 1);
    const score = Math.min(5, Math.floor(rank * 5) + 1);
    return reverse ? 6 - score : score;
  });
}

/** RFMスコアからセグメント分類 */
function classifySegment(r: number, f: number): string {
  if (r >= 4 && f >= 4) return "VIP";
  if (r >= 4 && f >= 3) return "ロイヤル";
  if (r >= 3 && f >= 2) return "育成中";
  if (f === 1 && r >= 4) return "新規";
  if (r <= 2 && f >= 2) return "休眠";
  if (r <= 2 && f <= 1) return "離反";
  return "その他";
}

export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);

  try {
    // 直近1年の注文を取得
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const { data: orders, error } = await supabaseAdmin
      .from("orders")
      .select("patient_id, created_at, total_amount")
      .eq("tenant_id", tenantId)
      .gte("created_at", oneYearAgo.toISOString())
      .not("payment_status", "eq", "failed")
      .limit(100000);

    if (error) throw error;

    if (!orders?.length) {
      return NextResponse.json({ ok: true, customers: [], segmentCounts: {}, total: 0 });
    }

    // patient_idごとに集計
    const customerMap = new Map<number, { lastOrder: number; count: number; total: number }>();
    const now = Date.now();
    for (const order of orders) {
      const pid = order.patient_id;
      if (!pid) continue;
      if (!customerMap.has(pid)) {
        customerMap.set(pid, { lastOrder: 0, count: 0, total: 0 });
      }
      const c = customerMap.get(pid)!;
      const orderDate = new Date(order.created_at).getTime();
      c.lastOrder = Math.max(c.lastOrder, orderDate);
      c.count++;
      c.total += order.total_amount || 0;
    }

    // RFM値を計算
    const customers = [...customerMap.entries()].map(([pid, data]) => {
      const recencyDays = Math.floor((now - data.lastOrder) / (1000 * 60 * 60 * 24));
      return { patient_id: pid, recency: recencyDays, frequency: data.count, monetary: data.total };
    });

    // 5分位スコアリング
    const rScores = scoreQuintile(
      customers.map((c) => c.recency),
      true,
    ); // Recency: 低い日数=良い→reverse
    const fScores = scoreQuintile(customers.map((c) => c.frequency));
    const mScores = scoreQuintile(customers.map((c) => c.monetary));

    // セグメント分類
    const results = customers.map((c, i) => {
      const r = rScores[i],
        f = fScores[i],
        m = mScores[i];
      const segment = classifySegment(r, f);
      return { ...c, rScore: r, fScore: f, mScore: m, segment };
    });

    // セグメント別カウント
    const segmentCounts: Record<string, number> = {};
    for (const r of results) {
      segmentCounts[r.segment] = (segmentCounts[r.segment] || 0) + 1;
    }

    return NextResponse.json({
      ok: true,
      customers: results,
      segmentCounts,
      total: results.length,
    });
  } catch (err) {
    console.error("rfm GET error:", err);
    return serverError("RFM分析の取得に失敗しました");
  }
}
