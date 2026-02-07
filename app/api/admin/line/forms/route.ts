import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { nanoid } from "nanoid";

// フォーム一覧
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const folderId = searchParams.get("folder_id");

  let query = supabaseAdmin
    .from("forms")
    .select("id, name, folder_id, slug, title, is_published, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (folderId) query = query.eq("folder_id", parseInt(folderId));

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ forms: data || [] });
}

// フォーム新規作成
export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, folder_id } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "フォーム名は必須です" }, { status: 400 });

  const slug = nanoid(12);

  const { data, error } = await supabaseAdmin
    .from("forms")
    .insert({
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
