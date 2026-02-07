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

  const oldLineMenuId = existing?.line_rich_menu_id || null;

  // 2. DB更新（まずDBだけ更新してレスポンスを速く返せるようにする）
  const { data, error } = await supabaseAdmin
    .from("rich_menus")
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq("id", Number(id))
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 3. 画像がある場合、LINE APIに新メニューを先に作成
  if (data.image_url) {
    const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_BASE_URL || "";
    const lineRichMenuId = await createLineRichMenu(data, origin);

    if (lineRichMenuId) {
      const imageOk = await uploadRichMenuImage(lineRichMenuId, data.image_url);

      if (imageOk) {
        // 新メニュー作成成功 → DB更新
        await supabaseAdmin
          .from("rich_menus")
          .update({ line_rich_menu_id: lineRichMenuId, is_active: true })
          .eq("id", data.id);

        data.line_rich_menu_id = lineRichMenuId;
        data.is_active = true;

        // selected=true の場合のみデフォルトメニューに設定
        if (data.selected) {
          await setDefaultRichMenu(lineRichMenuId);
        }

        // 4. 旧メニューを削除（新メニュー成功後に安全に削除）
        if (oldLineMenuId && oldLineMenuId !== lineRichMenuId) {
          await deleteLineRichMenu(oldLineMenuId).catch(() => {});
        }
      } else {
        // 画像アップロード失敗 → 作成したメニューを削除
        await deleteLineRichMenu(lineRichMenuId).catch(() => {});
        console.error("[Rich Menu PUT] Image upload failed, keeping old menu");
      }
    } else {
      console.error("[Rich Menu PUT] LINE menu create failed, keeping old menu");
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
