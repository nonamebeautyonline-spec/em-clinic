import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { updateFormSchema } from "@/lib/validations/line-management";

// フォーム詳細取得
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);
  const { id } = await params;
  const { data, error } = await withTenant(
    supabaseAdmin
      .from("forms")
      .select("*")
      .eq("id", parseInt(id)),
    tenantId
  ).single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "フォームが見つかりません" }, { status: 404 });
  return NextResponse.json({ form: data });
}

// フォーム更新
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);
  const { id } = await params;
  const parsed = await parseBody(req, updateFormSchema);
  if ("error" in parsed) return parsed.error;
  const body = parsed.data;

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.name !== undefined) updates.name = body.name;
  if (body.title !== undefined) updates.title = body.title;
  if (body.description !== undefined) updates.description = body.description;
  if (body.folder_id !== undefined) updates.folder_id = body.folder_id || null;
  if (body.fields !== undefined) updates.fields = body.fields;
  if (body.settings !== undefined) updates.settings = body.settings;
  if (body.is_published !== undefined) updates.is_published = body.is_published;

  const { data, error } = await withTenant(
    supabaseAdmin
      .from("forms")
      .update(updates)
      .eq("id", parseInt(id)),
    tenantId
  ).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, form: data });
}

// フォーム削除
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);
  const { id } = await params;
  const { error } = await withTenant(
    supabaseAdmin
      .from("forms")
      .delete()
      .eq("id", parseInt(id)),
    tenantId
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
