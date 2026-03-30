// app/api/admin/line/ai-reply-review/route.ts — Failure Review Console用API
import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow, strictWithTenant } from "@/lib/tenant";

/**
 * GET: 却下・修正済みドラフト一覧取得（フィルタ・ページネーション対応）
 */
export async function GET(req: NextRequest) {
  // 認証チェック
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) {
    return unauthorized();
  }

  const tenantId = resolveTenantIdOrThrow(req);
  const sp = req.nextUrl.searchParams;

  // クエリパラメータ
  const rejectCategory = sp.get("reject_category") || "";
  const aiCategory = sp.get("ai_category") || "";
  const modelUsed = sp.get("model_used") || "";
  const period = Number(sp.get("period")) || 30;
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const limit = 50;
  const offset = (page - 1) * limit;

  // 期間開始日
  const periodStart = new Date();
  periodStart.setDate(periodStart.getDate() - period);
  const periodStartStr = periodStart.toISOString().slice(0, 10);

  try {
    // ベースクエリ: 却下 OR (送信済み かつ 修正あり)
    let query = supabaseAdmin
      .from("ai_reply_drafts")
      .select(
        "id, patient_id, original_message, draft_reply, reject_category, reject_reason, modified_reply, model_used, ai_category, created_at, rejected_at, sent_at, review_note, status",
        { count: "exact" }
      )
      .gte("created_at", `${periodStartStr}T00:00:00Z`)
      .or("status.eq.rejected,and(status.eq.sent,modified_reply.not.is.null)");

    // 追加フィルタ
    if (rejectCategory) {
      query = query.eq("reject_category", rejectCategory);
    }
    if (aiCategory) {
      query = query.eq("ai_category", aiCategory);
    }
    if (modelUsed) {
      query = query.ilike("model_used", `%${modelUsed}%`);
    }

    // テナントフィルタ + ソート + ページネーション
    const { data, count, error } = await strictWithTenant(
      query
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1),
      tenantId
    );

    if (error) {
      console.error("[ai-reply-review] GET error:", error);
      return serverError("データ取得に失敗しました");
    }

    return NextResponse.json({
      drafts: data || [],
      total: count ?? 0,
      page,
      limit,
    });
  } catch (err) {
    console.error("[ai-reply-review] GET unexpected error:", err);
    return serverError("予期しないエラーが発生しました");
  }
}

/**
 * POST: ドラフトにレビューノートを追加
 */
export async function POST(req: NextRequest) {
  // 認証チェック
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) {
    return unauthorized();
  }

  const tenantId = resolveTenantIdOrThrow(req);

  try {
    const body = await req.json();
    const { draft_id, review_note } = body;

    // 必須チェック
    if (!draft_id) {
      return NextResponse.json({ error: "draft_id は必須です" }, { status: 400 });
    }

    // レビューノート更新
    const { error } = await strictWithTenant(
      supabaseAdmin
        .from("ai_reply_drafts")
        .update({ review_note })
        .eq("id", draft_id),
      tenantId
    );

    if (error) {
      console.error("[ai-reply-review] POST error:", error);
      return serverError("更新に失敗しました");
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[ai-reply-review] POST unexpected error:", err);
    return serverError("予期しないエラーが発生しました");
  }
}
