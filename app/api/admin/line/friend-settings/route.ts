import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { setDefaultRichMenu } from "@/lib/line-richmenu";

// 友達追加時設定一覧
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("friend_add_settings")
    .select("*")
    .order("id", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ settings: data });
}

// 友達追加時設定更新
export async function PUT(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { setting_key, setting_value, enabled } = await req.json();
  if (!setting_key) {
    return NextResponse.json({ error: "setting_keyは必須です" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("friend_add_settings")
    .update({ setting_value, enabled, updated_at: new Date().toISOString() })
    .eq("setting_key", setting_key)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 新規友だち設定のメニュー変更 → LINE APIデフォルトリッチメニューも連動
  if (setting_key === "new_friend" && setting_value?.menu_change) {
    const { data: menu } = await supabaseAdmin
      .from("rich_menus")
      .select("line_rich_menu_id")
      .eq("id", Number(setting_value.menu_change))
      .maybeSingle();

    if (menu?.line_rich_menu_id) {
      // LINE APIデフォルトを設定
      const ok = await setDefaultRichMenu(menu.line_rich_menu_id);
      if (ok) {
        // DB上の selected フラグも更新（旧デフォルトを解除 → 新デフォルトを設定）
        await supabaseAdmin.from("rich_menus").update({ selected: false }).neq("id", Number(setting_value.menu_change));
        await supabaseAdmin.from("rich_menus").update({ selected: true }).eq("id", Number(setting_value.menu_change));
        console.log("[friend-settings] LINE APIデフォルトメニューを更新:", setting_value.menu_change);
      } else {
        console.error("[friend-settings] LINE APIデフォルトメニュー更新失敗");
      }
    }
  }

  return NextResponse.json({ setting: data });
}
