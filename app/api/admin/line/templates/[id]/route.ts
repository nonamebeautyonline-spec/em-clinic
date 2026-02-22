import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { updateTemplateSchema } from "@/lib/validations/line-common";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);
  const { id } = await params;

  const parsed = await parseBody(req, updateTemplateSchema);
  if ("error" in parsed) return parsed.error;
  const { name, content, message_type, category, flex_content } = parsed.data;

  const { data, error } = await withTenant(
    supabaseAdmin.from("message_templates").update({ name, content, message_type, category, flex_content: flex_content || null, updated_at: new Date().toISOString() }).eq("id", Number(id)).select(),
    tenantId
  ).single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ template: data });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);
  const { id } = await params;

  const { error } = await withTenant(
    supabaseAdmin.from("message_templates").delete().eq("id", Number(id)),
    tenantId
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
