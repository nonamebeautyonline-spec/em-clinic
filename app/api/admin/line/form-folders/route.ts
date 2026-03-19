import { NextRequest, NextResponse } from "next/server";
import { badRequest, serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow, strictWithTenant, tenantPayload } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { createFolderSchema, updateFolderSchema } from "@/lib/validations/line-management";

// フォルダ一覧取得
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);

  const { data, error } = await strictWithTenant(
    supabaseAdmin
      .from("form_folders")
      .select("*, forms(count)")
      .order("sort_order", { ascending: true }),
    tenantId
  );

  if (error) return serverError(error.message);

  const folders = (data || []).map((f: Record<string, unknown>) => ({
    ...f,
    form_count: Array.isArray(f.forms) && f.forms.length > 0
      ? (f.forms[0] as Record<string, number>).count
      : 0,
  }));

  return NextResponse.json({ folders });
}

// フォルダ作成
export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const parsed = await parseBody(req, createFolderSchema);
  if ("error" in parsed) return parsed.error;
  const { name } = parsed.data;

  const { data, error } = await supabaseAdmin
    .from("form_folders")
    .insert({ ...tenantPayload(tenantId), name: name.trim() })
    .select()
    .single();

  if (error) return serverError(error.message);
  return NextResponse.json({ ok: true, folder: data });
}

// フォルダ名変更
export async function PUT(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const parsed = await parseBody(req, updateFolderSchema);
  if ("error" in parsed) return parsed.error;
  const { id, name } = parsed.data;

  const { data, error } = await strictWithTenant(
    supabaseAdmin
      .from("form_folders")
      .update({ name: name.trim() })
      .eq("id", id),
    tenantId
  ).select().single();

  if (error) return serverError(error.message);
  return NextResponse.json({ ok: true, folder: data });
}

// フォルダ削除
export async function DELETE(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return badRequest("IDは必須です");

  const { data: defaultFolder } = await strictWithTenant(
    supabaseAdmin
      .from("form_folders")
      .select("id")
      .eq("name", "未分類"),
    tenantId
  ).single();

  if (defaultFolder && parseInt(id) === defaultFolder.id) {
    return badRequest("未分類フォルダは削除できません");
  }

  if (defaultFolder) {
    await strictWithTenant(
      supabaseAdmin
        .from("forms")
        .update({ folder_id: defaultFolder.id })
        .eq("folder_id", parseInt(id)),
      tenantId
    );
  } else {
    await strictWithTenant(
      supabaseAdmin
        .from("forms")
        .update({ folder_id: null })
        .eq("folder_id", parseInt(id)),
      tenantId
    );
  }

  const { error } = await strictWithTenant(
    supabaseAdmin
      .from("form_folders")
      .delete()
      .eq("id", parseInt(id)),
    tenantId
  );

  if (error) return serverError(error.message);
  return NextResponse.json({ ok: true });
}
