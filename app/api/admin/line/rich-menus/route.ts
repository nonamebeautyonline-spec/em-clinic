import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { createLineRichMenu, uploadRichMenuImage, setDefaultRichMenu } from "@/lib/line-richmenu";

// リッチメニュー一覧
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("rich_menus")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ menus: data });
}

// リッチメニュー作成 + LINE API登録
export async function POST(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, chat_bar_text, selected, size_type, areas, image_url } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "タイトルは必須です" }, { status: 400 });
  }

  // 1. DBに保存
  const { data, error } = await supabaseAdmin
    .from("rich_menus")
    .insert({
      name: name.trim(),
      chat_bar_text: chat_bar_text || "メニュー",
      selected: selected ?? false,
      size_type: size_type || "full",
      areas: areas || [],
      image_url: image_url || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 2. 画像がある場合のみLINE APIに登録
  if (image_url) {
    const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_BASE_URL || "";
    const lineRichMenuId = await createLineRichMenu(data, origin);

    if (lineRichMenuId) {
      // 3. 画像アップロード
      const imageOk = await uploadRichMenuImage(lineRichMenuId, image_url);

      if (imageOk) {
        // 4. DB更新 (LINE ID + 有効化)
        await supabaseAdmin
          .from("rich_menus")
          .update({ line_rich_menu_id: lineRichMenuId, is_active: true })
          .eq("id", data.id);

        // 5. デフォルトメニューに設定
        await setDefaultRichMenu(lineRichMenuId);

        data.line_rich_menu_id = lineRichMenuId;
        data.is_active = true;
      }
    }
  }

  return NextResponse.json({ menu: data });
}
