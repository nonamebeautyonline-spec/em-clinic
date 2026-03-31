// AI返信 Eval結果API（Phase 3-3）
// トレースデータの取得・比較

import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized } from "@/lib/api-error";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveTenantIdOrThrow, strictWithTenant } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// GET: トレース一覧（直近100件）
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const limit = Number(req.nextUrl.searchParams.get("limit")) || 50;

  try {
    const { data, error } = await strictWithTenant(
      supabaseAdmin
        .from("ai_reply_traces")
        .select(`
          id, draft_id, patient_id, rewritten_query,
          classification_result, policy_decision,
          candidate_examples, reranked_examples, candidate_chunks,
          tool_calls, patient_state_snapshot,
          prompt_hash, model_name, created_at
        `)
        .order("created_at", { ascending: false })
        .limit(limit),
      tenantId
    );

    if (error) {
      console.error("[Evals API] 取得エラー:", error);
      return serverError("トレースの取得に失敗しました");
    }

    // ドラフト情報も結合
    const draftIds = (data || []).map(t => t.draft_id).filter(Boolean);
    let draftsMap: Record<number, Record<string, unknown>> = {};

    if (draftIds.length > 0) {
      const { data: drafts } = await strictWithTenant(
        supabaseAdmin
          .from("ai_reply_drafts")
          .select("id, status, ai_category, confidence, original_message, draft_reply, model_used")
          .in("id", draftIds),
        tenantId
      );
      if (drafts) {
        draftsMap = Object.fromEntries(drafts.map(d => [d.id, d]));
      }
    }

    const traces = (data || []).map(t => ({
      ...t,
      draft: draftsMap[t.draft_id] || null,
    }));

    return NextResponse.json({ traces });
  } catch (err) {
    console.error("[Evals API] 例外:", err);
    return serverError("トレースの取得に失敗しました");
  }
}
