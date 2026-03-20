// app/api/admin/segments/route.ts — セグメント一覧API（ページネーション対応）
// GET パラメータなし: 各セグメントの件数(summary)のみ返す
// GET ?segment=vip&page=1&limit=20: 指定セグメントの患者リストをページ単位で返す

import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow } from "@/lib/tenant";
import { ALL_SEGMENTS, type SegmentType } from "@/lib/patient-segments";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export async function GET(req: NextRequest) {
  const ok = await verifyAdminAuth(req);
  if (!ok) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const { searchParams } = new URL(req.url);
  const segment = searchParams.get("segment") as SegmentType | null;

  // セグメント指定なし → サマリー（件数）のみ返す
  if (!segment) {
    return handleSummary(tenantId);
  }

  // セグメント指定あり → 患者リストをページネーション付きで返す
  if (!ALL_SEGMENTS.includes(segment)) {
    return NextResponse.json(
      { error: "無効なセグメント種別です" },
      { status: 400 },
    );
  }

  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, parseInt(searchParams.get("limit") || String(DEFAULT_LIMIT), 10)),
  );

  return handleSegmentPatients(tenantId, segment, page, limit);
}

// サマリー（件数のみ）を返す
async function handleSummary(tenantId: string) {
  // セグメント別件数をDBから直接集計（患者リストは返さない）
  const { data, error } = await supabaseAdmin
    .from("patient_segments")
    .select("segment", { count: "exact" })
    .eq("tenant_id", tenantId);

  if (error) {
    console.error("[segments] サマリー取得エラー:", error);
    return serverError("セグメントデータの取得に失敗しました");
  }

  // セグメント別にカウント
  const summary: Record<string, number> = {};
  let total = 0;
  for (const seg of ALL_SEGMENTS) {
    summary[seg] = 0;
  }
  if (data) {
    for (const row of data) {
      const seg = row.segment as string;
      if (seg in summary) {
        summary[seg]++;
        total++;
      }
    }
  }

  return NextResponse.json({ summary, total });
}

// 指定セグメントの患者リストをページネーション付きで返す
async function handleSegmentPatients(
  tenantId: string,
  segment: SegmentType,
  page: number,
  limit: number,
) {
  const offset = (page - 1) * limit;

  // 件数を取得
  const { count, error: countError } = await supabaseAdmin
    .from("patient_segments")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("segment", segment);

  if (countError) {
    console.error("[segments] 件数取得エラー:", countError);
    return serverError("セグメントデータの取得に失敗しました");
  }

  // 患者リストを取得（ページ単位）
  const { data: segData, error: segError } = await supabaseAdmin
    .from("patient_segments")
    .select("patient_id, segment, rfm_score, calculated_at")
    .eq("tenant_id", tenantId)
    .eq("segment", segment)
    .order("calculated_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (segError) {
    console.error("[segments] 患者リスト取得エラー:", segError);
    return serverError("セグメントデータの取得に失敗しました");
  }

  // 患者IDで patients テーブルから氏名・電話番号を取得
  const patientIds = (segData || []).map((r) => r.patient_id);
  let patientsMap: Record<string, { name: string | null; name_kana: string | null; tel: string | null; line_id: string | null }> = {};

  if (patientIds.length > 0) {
    const { data: pData } = await supabaseAdmin
      .from("patients")
      .select("patient_id, name, name_kana, tel, line_id")
      .eq("tenant_id", tenantId)
      .in("patient_id", patientIds);

    if (pData) {
      for (const p of pData) {
        patientsMap[p.patient_id] = {
          name: p.name,
          name_kana: p.name_kana,
          tel: p.tel,
          line_id: p.line_id,
        };
      }
    }
  }

  // レスポンス形成
  const patients = (segData || []).map((row) => {
    const p = patientsMap[row.patient_id] || {};
    return {
      patientId: row.patient_id,
      name: p.name || null,
      nameKana: p.name_kana || null,
      tel: p.tel || null,
      lineId: p.line_id || null,
      rfmScore: row.rfm_score || { recency: 0, frequency: 0, monetary: 0 },
      calculatedAt: row.calculated_at,
    };
  });

  const totalCount = count || 0;
  const totalPages = Math.ceil(totalCount / limit);

  return NextResponse.json({
    segment,
    patients,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages,
    },
  });
}
