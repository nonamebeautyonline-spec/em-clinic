// app/api/platform/shared-templates/route.ts
// プラットフォーム管理者用: 共有テンプレート一覧取得・作成API

import { NextRequest, NextResponse } from "next/server";
import { forbidden, serverError } from "@/lib/api-error";
import { verifyPlatformAdmin } from "@/lib/platform-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { logAudit } from "@/lib/audit";
import { parseBody } from "@/lib/validations/helpers";
import { createSharedTemplateSchema } from "@/lib/validations/shared-template";

/**
 * GET: 共有テンプレート一覧取得
 * クエリパラメータ:
 *   search - 名前で検索
 *   category - カテゴリフィルタ
 *   template_type - message|flex|workflow
 *   is_active - true|false
 *   page - ページ番号（1始まり）
 *   limit - 1ページあたりの件数
 */
export async function GET(req: NextRequest) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin) return forbidden("権限がありません");

  try {
    const url = new URL(req.url);
    const search = url.searchParams.get("search") || "";
    const category = url.searchParams.get("category") || "";
    const templateType = url.searchParams.get("template_type") || "";
    const isActive = url.searchParams.get("is_active");
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "25", 10)));
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from("shared_templates")
      .select("*", { count: "exact" });

    if (search) {
      query = query.ilike("name", `%${search}%`);
    }
    if (category) {
      query = query.eq("category", category);
    }
    if (templateType) {
      query = query.eq("template_type", templateType);
    }
    if (isActive !== null && isActive !== "") {
      query = query.eq("is_active", isActive === "true");
    }

    query = query.order("created_at", { ascending: false }).range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error("[platform/shared-templates] GET error:", error);
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
    console.error("[platform/shared-templates] GET unexpected error:", err);
    return serverError("予期しないエラーが発生しました");
  }
}

/**
 * POST: 共有テンプレート作成
 */
export async function POST(req: NextRequest) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin) return forbidden("権限がありません");

  const parsed = await parseBody(req, createSharedTemplateSchema);
  if (parsed.error) return parsed.error;

  const body = parsed.data;

  try {
    const { data, error } = await supabaseAdmin
      .from("shared_templates")
      .insert({
        name: body.name,
        description: body.description || "",
        category: body.category || "",
        content: body.content,
        template_type: body.template_type,
        tags: body.tags || [],
        created_by: admin.userId,
        is_active: body.is_active ?? true,
      })
      .select()
      .single();

    if (error) {
      console.error("[platform/shared-templates] POST error:", error);
      return serverError(`共有テンプレートの作成に失敗しました: ${error.message}`);
    }

    // 監査ログ（fire-and-forget）
    logAudit(req, "create_shared_template", "shared_template", data.id, {
      name: body.name,
      template_type: body.template_type,
    });

    return NextResponse.json({ ok: true, template: data }, { status: 201 });
  } catch (err) {
    console.error("[platform/shared-templates] POST unexpected error:", err);
    return serverError("予期しないエラーが発生しました");
  }
}
