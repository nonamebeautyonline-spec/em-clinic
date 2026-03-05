import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { friendFieldUpdateSchema } from "@/lib/validations/admin-operations";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantId(req);
  const { id } = await params;
  const parsed = await parseBody(req, friendFieldUpdateSchema);
  if ("error" in parsed) return parsed.error;
  const { name, field_type, options, sort_order } = parsed.data;

  const { data, error } = await withTenant(
    supabaseAdmin
      .from("friend_field_definitions")
      .update({ name, field_type, options, sort_order })
      .eq("id", Number(id))
      .select(),
    tenantId
  ).single();

  if (error) return serverError(error.message);
  return NextResponse.json({ field: data });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return unauthorized();

  const tenantId = resolveTenantId(req);
  const { id } = await params;

  const { error } = await withTenant(
    supabaseAdmin
      .from("friend_field_definitions")
      .delete()
      .eq("id", Number(id)),
    tenantId
  );

  if (error) return serverError(error.message);
  return NextResponse.json({ ok: true });
}
