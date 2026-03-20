// app/api/admin/segments/route.ts — セグメント一覧API（RPC版）
// GET: セグメント別の患者一覧とサマリーを返す（DB側集計）

import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow } from "@/lib/tenant";
import { ALL_SEGMENTS } from "@/lib/patient-segments";

export async function GET(req: NextRequest) {
  const ok = await verifyAdminAuth(req);
  if (!ok) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);

  // RPC で DB側集計
  const { data, error } = await supabaseAdmin.rpc("segments_summary", {
    p_tenant_id: tenantId,
  });

  if (error) {
    console.error("[segments] RPC エラー:", error);
    return serverError("セグメントデータの取得に失敗しました");
  }

  // RPC結果にすべてのセグメントキーが含まれるよう補完
  const segments: Record<string, unknown[]> = {};
  const summary: Record<string, number> = {};

  for (const seg of ALL_SEGMENTS) {
    segments[seg] = data?.segments?.[seg] || [];
    summary[seg] = data?.summary?.[seg] || 0;
  }

  return NextResponse.json({
    segments,
    summary,
    total: data?.total || 0,
  });
}
