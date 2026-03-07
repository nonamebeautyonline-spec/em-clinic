import { NextRequest, NextResponse } from "next/server";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { z } from "zod";

/** カテゴリ更新スキーマ */
const updateTemplateCategorySchema = z
  .object({
    name: z.string().min(1, "フォルダ名は必須です").optional(),
    sort_order: z.number().int().optional(),
  })
  .passthrough();

/** カテゴリ並び替えスキーマ */
const reorderCategoriesSchema = z
  .object({
    orders: z.array(
      z.object({
        id: z.number().int(),
        sort_order: z.number().int(),
      })
    ),
  })
  .passthrough();

// テンプレートカテゴリ更新
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantId(req);
  const { id } = await params;

  // 並び替え一括更新の場合（id === "reorder"）
  if (id === "reorder") {
    const parsed = await parseBody(req, reorderCategoriesSchema);
    if ("error" in parsed) return parsed.error;
    const { orders } = parsed.data;

    for (const o of orders) {
      const { error } = await withTenant(
        supabaseAdmin
          .from("template_categories")
          .update({ sort_order: o.sort_order })
          .eq("id", o.id),
        tenantId
      );
      if (error) return serverError(error.message);
    }

    return NextResponse.json({ ok: true });
  }

  const parsed = await parseBody(req, updateTemplateCategorySchema);
  if ("error" in parsed) return parsed.error;
  const updates: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name.trim();
  if (parsed.data.sort_order !== undefined) updates.sort_order = parsed.data.sort_order;

  if (Object.keys(updates).length === 0) {
    return badRequest("更新するフィールドがありません");
  }

  const { data, error } = await withTenant(
    supabaseAdmin
      .from("template_categories")
      .update(updates)
      .eq("id", Number(id))
      .select(),
    tenantId
  ).single();

  if (error) {
    if (error.code === "23505") {
      return badRequest("同名のフォルダが既に存在します");
    }
    return serverError(error.message);
  }
  return NextResponse.json({ category: data });
}

// テンプレートカテゴリ削除
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantId(req);
  const { id } = await params;

  // 対象カテゴリの名前を取得
  const { data: cat, error: catError } = await withTenant(
    supabaseAdmin.from("template_categories").select("name").eq("id", Number(id)),
    tenantId
  ).single();

  if (catError || !cat) {
    return badRequest("カテゴリが見つかりません");
  }

  // 「未分類」は削除不可
  if (cat.name === "未分類") {
    return badRequest("「未分類」フォルダは削除できません");
  }

  // このカテゴリのテンプレートを「未分類」に移動
  await withTenant(
    supabaseAdmin
      .from("message_templates")
      .update({ category: "未分類" })
      .eq("category", cat.name),
    tenantId
  );

  // カテゴリを削除
  const { error } = await withTenant(
    supabaseAdmin.from("template_categories").delete().eq("id", Number(id)),
    tenantId
  );

  if (error) return serverError(error.message);
  return NextResponse.json({ ok: true });
}
