import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { createLineRichMenu, uploadRichMenuImage, deleteLineRichMenu, setDefaultRichMenu } from "@/lib/line-richmenu";

// リッチメニュー更新 + LINE API再登録
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  // 1. 既存メニューを取得（LINE側IDチェック用）
  const { data: existing } = await supabaseAdmin
    .from("rich_menus")
    .select("line_rich_menu_id")
    .eq("id", Number(id))
    .single();

  // 2. 旧LINE側リッチメニューを削除
  if (existing?.line_rich_menu_id) {
    await deleteLineRichMenu(existing.line_rich_menu_id);
  }

  // 3. DB更新
  const { data, error } = await supabaseAdmin
    .from("rich_menus")
    .update({ ...body, line_rich_menu_id: null, is_active: false, updated_at: new Date().toISOString() })
    .eq("id", Number(id))
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 4. 画像がある場合、LINE APIに再登録
  if (data.image_url) {
    const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_BASE_URL || "";
    const lineRichMenuId = await createLineRichMenu(data, origin);

    if (lineRichMenuId) {
      const imageOk = await uploadRichMenuImage(lineRichMenuId, data.image_url);

      if (imageOk) {
        await supabaseAdmin
          .from("rich_menus")
          .update({ line_rich_menu_id: lineRichMenuId, is_active: true })
          .eq("id", data.id);

        await setDefaultRichMenu(lineRichMenuId);

        data.line_rich_menu_id = lineRichMenuId;
        data.is_active = true;
      }
    }
  }

  return NextResponse.json({ menu: data });
}

// リッチメニュー削除 + LINE API削除
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // 1. LINE側のIDを取得
  const { data: existing } = await supabaseAdmin
    .from("rich_menus")
    .select("line_rich_menu_id")
    .eq("id", Number(id))
    .single();

  // 2. LINE側から削除
  if (existing?.line_rich_menu_id) {
    await deleteLineRichMenu(existing.line_rich_menu_id);
  }

  // 3. DB削除
  const { error } = await supabaseAdmin
    .from("rich_menus")
    .delete()
    .eq("id", Number(id));

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
