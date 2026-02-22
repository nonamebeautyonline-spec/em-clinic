import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { publishFormSchema } from "@/lib/validations/line-management";

// 公開/非公開切替
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);
  const { id } = await params;
  const parsed = await parseBody(req, publishFormSchema);
  if ("error" in parsed) return parsed.error;
  const { is_published } = parsed.data;

  const { data, error } = await withTenant(
    supabaseAdmin
      .from("forms")
      .update({ is_published: !!is_published, updated_at: new Date().toISOString() })
      .eq("id", parseInt(id)),
    tenantId
  ).select("id, is_published").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, form: data });
}
