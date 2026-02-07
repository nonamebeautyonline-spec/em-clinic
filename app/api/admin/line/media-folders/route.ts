import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";

// フォルダ一覧取得
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("media_folders")
    .select("*, media_files(count)")
    .order("sort_order", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const folders = (data || []).map((f: Record<string, unknown>) => ({
    ...f,
    file_count: Array.isArray(f.media_files) && f.media_files.length > 0
      ? (f.media_files[0] as Record<string, number>).count
      : 0,
  }));

  return NextResponse.json({ folders });
}

// フォルダ作成
export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "フォルダ名は必須です" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("media_folders")
    .insert({ name: name.trim() })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, folder: data });
}

// フォルダ名変更
export async function PUT(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, name } = await req.json();
  if (!id) return NextResponse.json({ error: "IDは必須です" }, { status: 400 });
  if (!name?.trim()) return NextResponse.json({ error: "フォルダ名は必須です" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("media_folders")
    .update({ name: name.trim() })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, folder: data });
}

// フォルダ削除（中のファイルは未分類に移動）
export async function DELETE(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "IDは必須です" }, { status: 400 });

  // 未分類フォルダを取得
  const { data: defaultFolder } = await supabaseAdmin
    .from("media_folders")
    .select("id")
    .eq("name", "未分類")
    .single();

  if (defaultFolder && parseInt(id) === defaultFolder.id) {
    return NextResponse.json({ error: "未分類フォルダは削除できません" }, { status: 400 });
  }

  // フォルダ内のファイルを未分類に移動
  if (defaultFolder) {
    await supabaseAdmin
      .from("media_files")
      .update({ folder_id: defaultFolder.id })
      .eq("folder_id", parseInt(id));
  } else {
    await supabaseAdmin
      .from("media_files")
      .update({ folder_id: null })
      .eq("folder_id", parseInt(id));
  }

  const { error } = await supabaseAdmin
    .from("media_folders")
    .delete()
    .eq("id", parseInt(id));

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
