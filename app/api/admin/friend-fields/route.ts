import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { resolveTenantId, withTenant, tenantPayload } from "@/lib/tenant";

// 友達情報欄の定義一覧
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);

  const { data, error } = await withTenant(
    supabaseAdmin
      .from("friend_field_definitions")
      .select("*")
      .order("sort_order", { ascending: true }),
    tenantId
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ fields: data });
}

// 友達情報欄の定義を作成
export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);

  const { name, field_type, options, sort_order } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "名前は必須です" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("friend_field_definitions")
    .insert({ ...tenantPayload(tenantId), name: name.trim(), field_type: field_type || "text", options, sort_order: sort_order || 0 })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "同じ名前のフィールドが既に存在します" }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ field: data });
}
