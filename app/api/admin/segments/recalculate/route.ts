// app/api/admin/segments/recalculate/route.ts — セグメント再計算API
// POST: 全患者のRFMスコアを再計算してDBに保存

import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId } from "@/lib/tenant";
import {
  classifyPatients,
  saveSegments,
  ALL_SEGMENTS,
  type SegmentType,
} from "@/lib/patient-segments";

export async function POST(req: NextRequest) {
  const ok = await verifyAdminAuth(req);
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);

  try {
    // 全患者を分類
    const results = await classifyPatients(tenantId);

    // DBに保存
    await saveSegments(results, tenantId);

    // セグメント別のカウントを集計
    const segmentCounts: Record<string, number> = {};
    for (const seg of ALL_SEGMENTS) {
      segmentCounts[seg] = 0;
    }
    for (const r of results) {
      segmentCounts[r.segment] = (segmentCounts[r.segment] || 0) + 1;
    }

    return NextResponse.json({
      ok: true,
      processed: results.length,
      segments: segmentCounts,
    });
  } catch (err) {
    console.error("[segments/recalculate] エラー:", err);
    return NextResponse.json(
      { error: "セグメント再計算に失敗しました" },
      { status: 500 },
    );
  }
}
