import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { createLineRichMenu, uploadRichMenuImage, setDefaultRichMenu } from "@/lib/line-richmenu";

// リッチメニュー一覧
export async function GET(req: NextRequest) {
  try {
    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabaseAdmin
      .from("rich_menus")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ menus: data });
  } catch (e: any) {
    console.error("[Rich Menu GET] Unhandled error:", e?.message || e);
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }
}

// リッチメニュー作成 + LINE API登録
export async function POST(req: NextRequest) {
  try {
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

    // 2. 画像がある場合、LINE API登録をバックグラウンドで実行
    if (image_url) {
      const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_BASE_URL || "";
      after(async () => {
        try {
          const lineRichMenuId = await createLineRichMenu(data, origin);
          if (!lineRichMenuId) {
            console.error("[Rich Menu POST after] LINE menu create failed");
            return;
          }

          const imageOk = await uploadRichMenuImage(lineRichMenuId, image_url);
          if (!imageOk) {
            console.error("[Rich Menu POST after] Image upload failed");
            return;
          }

          await supabaseAdmin
            .from("rich_menus")
            .update({ line_rich_menu_id: lineRichMenuId, is_active: true })
            .eq("id", data.id);

          if (selected) {
            await setDefaultRichMenu(lineRichMenuId);
          }

          console.log("[Rich Menu POST after] LINE menu created:", lineRichMenuId);
        } catch (e) {
          console.error("[Rich Menu POST after] Error:", e);
        }
      });
    }

    return NextResponse.json({ menu: data });
  } catch (e: any) {
    console.error("[Rich Menu POST] Unhandled error:", e?.message || e);
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }
}
