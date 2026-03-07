// app/api/platform/shared-templates/[id]/route.ts
// プラットフォーム管理者用: 共有テンプレート個別取得・更新・削除API

import { NextRequest, NextResponse } from "next/server";
import { forbidden, notFound, serverError, badRequest } from "@/lib/api-error";
import { verifyPlatformAdmin } from "@/lib/platform-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { logAudit } from "@/lib/audit";
import { parseBody } from "@/lib/validations/helpers";
import { updateSharedTemplateSchema } from "@/lib/validations/shared-template";

type Params = { params: Promise<{ id: string }> };

/**
 * GET: 共有テンプレート個別取得
 */
export async function GET(req: NextRequest, { params }: Params) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin) return forbidden("権限がありません");

  const { id } = await params;
  if (!id) return badRequest("IDが必要です");

  try {
    const { data, error } = await supabaseAdmin
      .from("shared_templates")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      return notFound("共有テンプレートが見つかりません");
    }

    return NextResponse.json({ ok: true, template: data });
  } catch (err) {
    console.error("[platform/shared-templates/[id]] GET error:", err);
    return serverError("予期しないエラーが発生しました");
  }
}

/**
 * PUT: 共有テンプレート更新
 */
export async function PUT(req: NextRequest, { params }: Params) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin) return forbidden("権限がありません");

  const { id } = await params;
  if (!id) return badRequest("IDが必要です");

  const parsed = await parseBody(req, updateSharedTemplateSchema);
  if (parsed.error) return parsed.error;

  const body = parsed.data;

  try {
    // 存在確認
    const { data: existing } = await supabaseAdmin
      .from("shared_templates")
      .select("id")
      .eq("id", id)
      .single();

    if (!existing) {
      return notFound("共有テンプレートが見つかりません");
    }

    // 更新データ構築（undefinedのフィールドは除外）
    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.content !== undefined) updateData.content = body.content;
    if (body.template_type !== undefined) updateData.template_type = body.template_type;
    if (body.tags !== undefined) updateData.tags = body.tags;
    if (body.is_active !== undefined) updateData.is_active = body.is_active;

    const { data, error } = await supabaseAdmin
      .from("shared_templates")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[platform/shared-templates/[id]] PUT error:", error);
      return serverError(`共有テンプレートの更新に失敗しました: ${error.message}`);
    }

    logAudit(req, "update_shared_template", "shared_template", id, {
      updatedFields: Object.keys(updateData),
    });

    return NextResponse.json({ ok: true, template: data });
  } catch (err) {
    console.error("[platform/shared-templates/[id]] PUT unexpected error:", err);
    return serverError("予期しないエラーが発生しました");
  }
}

/**
 * DELETE: 共有テンプレート削除
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  const admin = await verifyPlatformAdmin(req);
  if (!admin) return forbidden("権限がありません");

  const { id } = await params;
  if (!id) return badRequest("IDが必要です");

  try {
    const { error } = await supabaseAdmin
      .from("shared_templates")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("[platform/shared-templates/[id]] DELETE error:", error);
      return serverError(`共有テンプレートの削除に失敗しました: ${error.message}`);
    }

    logAudit(req, "delete_shared_template", "shared_template", id, {});

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[platform/shared-templates/[id]] DELETE unexpected error:", err);
    return serverError("予期しないエラーが発生しました");
  }
}
