// app/api/admin/segments/route.ts — セグメント一覧API
// GET: セグメント別の患者一覧とサマリーを返す

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant } from "@/lib/tenant";
import { ALL_SEGMENTS, SEGMENT_LABELS, type SegmentType } from "@/lib/patient-segments";

export async function GET(req: NextRequest) {
  const ok = await verifyAdminAuth(req);
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);

  // セグメントデータを患者情報と一緒に取得
  const { data: segmentData, error } = await withTenant(
    supabaseAdmin
      .from("patient_segments")
      .select("patient_id, segment, rfm_score, calculated_at"),
    tenantId,
  );

  if (error) {
    console.error("[segments] 取得エラー:", error);
    return NextResponse.json({ error: "セグメントデータの取得に失敗しました" }, { status: 500 });
  }

  if (!segmentData || segmentData.length === 0) {
    // データが空の場合、空のセグメント一覧を返す
    const emptySegments: Record<string, any[]> = {};
    const emptySummary: Record<string, number> = {};
    for (const seg of ALL_SEGMENTS) {
      emptySegments[seg] = [];
      emptySummary[seg] = 0;
    }
    return NextResponse.json({ segments: emptySegments, summary: emptySummary, total: 0 });
  }

  // 患者IDリストを取得して患者情報を一括取得
  const patientIds = segmentData.map((s: any) => s.patient_id);
  const { data: patients } = await withTenant(
    supabaseAdmin
      .from("patients")
      .select("patient_id, name, name_kana, tel, line_id, created_at")
      .in("patient_id", patientIds),
    tenantId,
  );

  // 患者情報をMapに変換
  const patientMap = new Map<string, any>();
  for (const p of patients || []) {
    patientMap.set(p.patient_id, p);
  }

  // セグメント別に分類
  const segments: Record<string, any[]> = {};
  const summary: Record<string, number> = {};

  for (const seg of ALL_SEGMENTS) {
    segments[seg] = [];
    summary[seg] = 0;
  }

  for (const row of segmentData) {
    const seg = row.segment as SegmentType;
    if (!segments[seg]) {
      segments[seg] = [];
      summary[seg] = 0;
    }

    const patient = patientMap.get(row.patient_id);
    segments[seg].push({
      patientId: row.patient_id,
      name: patient?.name || null,
      nameKana: patient?.name_kana || null,
      tel: patient?.tel || null,
      lineId: patient?.line_id || null,
      rfmScore: row.rfm_score,
      calculatedAt: row.calculated_at,
    });
    summary[seg] = (summary[seg] || 0) + 1;
  }

  return NextResponse.json({
    segments,
    summary,
    total: segmentData.length,
  });
}
