import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant, tenantPayload } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { createFolderSchema, updateFolderSchema } from "@/lib/validations/line-management";

// フォルダ一覧取得
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);

  const { data, error } = await withTenant(
    supabaseAdmin
      .from("form_folders")
      .select("*, forms(count)")
      .order("sort_order", { ascending: true }),
    tenantId
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

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
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);
  const parsed = await parseBody(req, createFolderSchema);
  if ("error" in parsed) return parsed.error;
  const { name } = parsed.data;

  const { data, error } = await supabaseAdmin
    .from("form_folders")
    .insert({ ...tenantPayload(tenantId), name: name.trim() })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, folder: data });
}

// フォルダ名変更
export async function PUT(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);
  const parsed = await parseBody(req, updateFolderSchema);
  if ("error" in parsed) return parsed.error;
  const { id, name } = parsed.data;

  const { data, error } = await withTenant(
    supabaseAdmin
      .from("form_folders")
      .update({ name: name.trim() })
      .eq("id", id),
    tenantId
  ).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, folder: data });
}

// フォルダ削除
export async function DELETE(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "IDは必須です" }, { status: 400 });

  const { data: defaultFolder } = await withTenant(
    supabaseAdmin
      .from("form_folders")
      .select("id")
      .eq("name", "未分類"),
    tenantId
  ).single();

  if (defaultFolder && parseInt(id) === defaultFolder.id) {
    return NextResponse.json({ error: "未分類フォルダは削除できません" }, { status: 400 });
  }

  if (defaultFolder) {
    await withTenant(
      supabaseAdmin
        .from("forms")
        .update({ folder_id: defaultFolder.id })
        .eq("folder_id", parseInt(id)),
      tenantId
    );
  } else {
    await withTenant(
      supabaseAdmin
        .from("forms")
        .update({ folder_id: null })
        .eq("folder_id", parseInt(id)),
      tenantId
    );
  }

  const { error } = await withTenant(
    supabaseAdmin
      .from("form_folders")
      .delete()
      .eq("id", parseInt(id)),
    tenantId
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
