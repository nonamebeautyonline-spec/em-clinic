// app/api/admin/ehr/sync-logs/route.ts — EHR同期ログ一覧API（ページネーション対応）
import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized } from "@/lib/api-error";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase";
import { ehrSyncLogsQuerySchema } from "@/lib/validations/ehr";

/**
 * GET: EHR同期ログ一覧取得
 * クエリパラメータ: limit, offset, status, provider
 * ページネーション対応（offset + limit）
 */
export async function GET(req: NextRequest) {
  // 管理者認証
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) {
    return unauthorized();
  }

  const tenantId = resolveTenantIdOrThrow(req);

  // クエリパラメータのバリデーション
  const url = new URL(req.url);
  const rawQuery = {
    limit: url.searchParams.get("limit") || undefined,
    offset: url.searchParams.get("offset") || undefined,
    status: url.searchParams.get("status") || undefined,
    provider: url.searchParams.get("provider") || undefined,
  };

  const parseResult = ehrSyncLogsQuerySchema.safeParse(rawQuery);
  if (!parseResult.success) {
    const messages = parseResult.error.issues.map(
      (e) => `${e.path.join(".")}: ${e.message}`,
    );
    return NextResponse.json(
      { ok: false, error: "パラメータが不正です", details: messages },
      { status: 400 },
    );
  }

  const { limit, offset, status, provider } = parseResult.data;

  try {
    // Supabaseクエリを構築
    let query = supabaseAdmin
      .from("ehr_sync_logs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // テナントフィルタ
    if (tenantId) {
      query = query.eq("tenant_id", tenantId);
    }

    // ステータスフィルタ（"all" の場合はフィルタなし）
    if (status) {
      query = query.eq("status", status);
    }

    // プロバイダーフィルタ
    if (provider) {
      query = query.eq("provider", provider);
    }

    const { data, error, count } = await query;

    if (error) {
      return serverError(`ログ取得に失敗しました: ${error.message}`);
    }

    return NextResponse.json({
      ok: true,
      logs: data || [],
      total: count ?? 0,
      limit,
      offset,
      hasMore: (count ?? 0) > offset + limit,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "ログ取得に失敗しました";
    return serverError(message);
  }
}
