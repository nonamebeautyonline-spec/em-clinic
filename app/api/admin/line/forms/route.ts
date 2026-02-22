import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { nanoid } from "nanoid";
import { resolveTenantId, withTenant, tenantPayload } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { createFormSchema } from "@/lib/validations/line-common";

// フォーム一覧
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);
  const { searchParams } = new URL(req.url);
  const folderId = searchParams.get("folder_id");

  let query = supabaseAdmin
    .from("forms")
    .select("id, name, folder_id, slug, title, is_published, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (folderId) query = query.eq("folder_id", parseInt(folderId));

  const { data, error } = await withTenant(query, tenantId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ forms: data || [] });
}

// フォーム新規作成
export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);

  const parsed = await parseBody(req, createFormSchema);
  if ("error" in parsed) return parsed.error;
  const { name, folder_id } = parsed.data;

  const slug = nanoid(12);

  const { data, error } = await supabaseAdmin
    .from("forms")
    .insert({
      ...tenantPayload(tenantId),
      name: name.trim(),
      title: name.trim(),
      folder_id: folder_id || null,
      slug,
      fields: [],
      settings: {},
      is_published: false,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, form: data });
}
