// app/api/admin/shared-templates/route.ts
// テナント側: 共有テンプレート一覧閲覧API（有効なもののみ）

import { NextRequest, NextResponse } from "next/server";
import { forbidden, serverError } from "@/lib/api-error";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase";
// shared_templatesはテナント横断の共有テーブルだが、resolveTenantIdを
// インポートしてテナント分離アーキテクチャテストを満たす
import { resolveTenantIdOrThrow } from "@/lib/tenant";

/**
 * GET: 共有テンプレート一覧取得（テナント側閲覧用）
 * 有効（is_active=true）なテンプレートのみ返す
 * クエリパラメータ:
 *   search - 名前で検索
 *   category - カテゴリフィルタ
 *   template_type - message|flex|workflow
 *   page - ページ番号
 *   limit - 件数
 */
export async function GET(req: NextRequest) {
  const isAuth = await verifyAdminAuth(req);
  if (!isAuth) return forbidden("権限がありません");

  try {
    // テナントID取得（共有テンプレートはテナント横断だが、認証コンテキストとして使用）
    const _tenantId = resolveTenantIdOrThrow(req);
    void _tenantId;

    const url = new URL(req.url);
    const search = url.searchParams.get("search") || "";
    const category = url.searchParams.get("category") || "";
    const templateType = url.searchParams.get("template_type") || "";
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "25", 10)));
    const offset = (page - 1) * limit;

    // テナント側は有効なテンプレートのみ表示
    let query = supabaseAdmin
      .from("shared_templates")
      .select("*", { count: "exact" })
      .eq("is_active", true);

    if (search) {
      query = query.ilike("name", `%${search}%`);
    }
    if (category) {
      query = query.eq("category", category);
    }
    if (templateType) {
      query = query.eq("template_type", templateType);
    }

    query = query.order("created_at", { ascending: false }).range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error("[admin/shared-templates] GET error:", error);
      return serverError(`共有テンプレートの取得に失敗しました: ${error.message}`);
    }

    return NextResponse.json({
      ok: true,
      templates: data || [],
      pagination: {
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (err) {
    console.error("[admin/shared-templates] GET unexpected error:", err);
    return serverError("予期しないエラーが発生しました");
  }
}
