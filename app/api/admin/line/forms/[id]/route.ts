import { NextRequest, NextResponse } from "next/server";
import { notFound, serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantIdOrThrow, strictWithTenant } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { updateFormSchema } from "@/lib/validations/line-management";
import { logAudit } from "@/lib/audit";

// フォーム詳細取得
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const { id } = await params;
  const { data, error } = await strictWithTenant(
    supabaseAdmin
      .from("forms")
      .select("*")
      .eq("id", parseInt(id)),
    tenantId
  ).single();

  if (error) return serverError(error.message);
  if (!data) return notFound("フォームが見つかりません");
  return NextResponse.json({ form: data });
}

// フォーム更新
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
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

  const { data, error } = await strictWithTenant(
    supabaseAdmin
      .from("forms")
      .update(updates)
      .eq("id", parseInt(id)),
    tenantId
  ).select().single();

  if (error) return serverError(error.message);
  logAudit(req, "form.update", "form", String(id));
  return NextResponse.json({ ok: true, form: data });
}

// フォーム削除
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantIdOrThrow(req);
  const { id } = await params;
  const { error } = await strictWithTenant(
    supabaseAdmin
      .from("forms")
      .delete()
      .eq("id", parseInt(id)),
    tenantId
  );

  if (error) return serverError(error.message);
  logAudit(req, "form.delete", "form", String(id));
  return NextResponse.json({ ok: true });
}
