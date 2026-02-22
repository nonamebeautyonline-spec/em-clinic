// app/api/admin/ehr/logs/route.ts — 同期ログ取得
import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase";
import { ehrLogsQuerySchema } from "@/lib/validations/ehr";

/**
 * GET: EHR同期ログを取得
 * クエリパラメータ: limit, provider, status
 * provider/statusが指定された場合はSupabaseクエリで直接フィルタする
 */
export async function GET(req: NextRequest) {
  // 管理者認証
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = resolveTenantId(req);

  // クエリパラメータのバリデーション
  const url = new URL(req.url);
  const rawQuery = {
    limit: url.searchParams.get("limit") || undefined,
    provider: url.searchParams.get("provider") || undefined,
    status: url.searchParams.get("status") || undefined,
  };

  const parseResult = ehrLogsQuerySchema.safeParse(rawQuery);
  if (!parseResult.success) {
    const messages = parseResult.error.issues.map(
      (e) => `${e.path.join(".")}: ${e.message}`,
    );
    return NextResponse.json(
      { error: "パラメータが不正です", details: messages },
      { status: 400 },
    );
  }

  const { limit, provider, status } = parseResult.data;

  try {
    // Supabaseクエリを構築
    let query = supabaseAdmin
      .from("ehr_sync_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    // テナントフィルタ
    if (tenantId) {
      query = query.eq("tenant_id", tenantId);
    }

    // プロバイダーフィルタ
    if (provider) {
      query = query.eq("provider", provider);
    }

    // ステータスフィルタ
    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: `ログ取得に失敗しました: ${error.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json({ logs: data || [] });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "ログ取得に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
