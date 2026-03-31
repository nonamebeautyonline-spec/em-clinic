// app/api/admin/ad-platforms/logs/route.ts — 広告プラットフォーム連携ログ取得
import { NextRequest, NextResponse } from "next/server";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveTenantIdOrThrow } from "@/lib/tenant";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

// 広告プラットフォームのログ一覧取得（ページネーション対応）
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const { searchParams } = new URL(req.url);
  const platformId = searchParams.get("platformId");

  if (!platformId) {
    return badRequest("platformIdは必須です");
  }

  // プラットフォームの所有権確認
  const { data: platform, error: pError } = await supabaseAdmin
    .from("ad_platforms")
    .select("id")
    .eq("id", platformId)
    .eq("tenant_id", tenantId)
    .limit(1)
    .single();

  if (pError || !platform) {
    return badRequest("指定されたプラットフォームが見つかりません");
  }

  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, parseInt(searchParams.get("limit") || String(DEFAULT_LIMIT), 10)),
  );
  const offset = (page - 1) * limit;

  // ログ取得
  const { data, error, count } = await supabaseAdmin
    .from("ad_platform_logs")
    .select("*", { count: "exact" })
    .eq("platform_id", platformId)
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("[ad-platform-logs] GET error:", error);
    return serverError("ログの取得に失敗しました");
  }

  return NextResponse.json({
    ok: true,
    logs: data ?? [],
    total: count ?? 0,
    page,
    limit,
  });
}
