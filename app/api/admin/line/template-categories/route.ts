import { NextRequest, NextResponse } from "next/server";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow, strictWithTenant, tenantPayload } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { createTemplateCategorySchema } from "@/lib/validations/line-management";

// テンプレートカテゴリ一覧
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);

  const { data, error } = await strictWithTenant(
    supabaseAdmin.from("template_categories").select("*").order("sort_order", { ascending: true }),
    tenantId
  );

  if (error) return serverError(error.message);
  return NextResponse.json({ categories: data });
}

// テンプレートカテゴリ作成
export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);

  const parsed = await parseBody(req, createTemplateCategorySchema);
  if ("error" in parsed) return parsed.error;
  const { name } = parsed.data;

  const { data: maxRow } = await strictWithTenant(
    supabaseAdmin.from("template_categories").select("sort_order").order("sort_order", { ascending: false }).limit(1),
    tenantId
  ).single();

  const nextOrder = (maxRow?.sort_order ?? 0) + 1;

  const { data, error } = await supabaseAdmin
    .from("template_categories")
    .insert({ ...tenantPayload(tenantId), name: name.trim(), sort_order: nextOrder })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return badRequest("同名のフォルダが既に存在します");
    }
    return serverError(error.message);
  }
  return NextResponse.json({ category: data });
}
