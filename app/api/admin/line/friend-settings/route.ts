import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { setDefaultRichMenu } from "@/lib/line-richmenu";
import { resolveTenantId, withTenant } from "@/lib/tenant";
import { parseBody } from "@/lib/validations/helpers";
import { updateFriendSettingsSchema } from "@/lib/validations/line-management";

// 友達追加時設定一覧
export async function GET(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);

  const { data, error } = await withTenant(
    supabaseAdmin
      .from("friend_add_settings")
      .select("*")
      .order("id", { ascending: true }),
    tenantId
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ settings: data });
}

// 友達追加時設定更新
export async function PUT(req: NextRequest) {
  const isAuthorized = await verifyAdminAuth(req);
  if (!isAuthorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = resolveTenantId(req);
  const parsed = await parseBody(req, updateFriendSettingsSchema);
  if ("error" in parsed) return parsed.error;
  const { setting_key, setting_value, enabled } = parsed.data as { setting_key: string; setting_value: any; enabled?: boolean };

  const { data, error } = await withTenant(
    supabaseAdmin
      .from("friend_add_settings")
      .update({ setting_value, enabled, updated_at: new Date().toISOString() })
      .eq("setting_key", setting_key),
    tenantId
  ).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 新規友だち設定のメニュー変更 → LINE APIデフォルトリッチメニューも連動
  if (setting_key === "new_friend" && setting_value?.menu_change) {
    const { data: menu } = await withTenant(
      supabaseAdmin
        .from("rich_menus")
        .select("line_rich_menu_id")
        .eq("id", Number(setting_value.menu_change)),
      tenantId
    ).maybeSingle();

    if (menu?.line_rich_menu_id) {
      // LINE APIデフォルトを設定
      const ok = await setDefaultRichMenu(menu.line_rich_menu_id, tenantId ?? undefined);
      if (ok) {
        // DB上の selected フラグも更新（旧デフォルトを解除 → 新デフォルトを設定）
        await withTenant(
          supabaseAdmin.from("rich_menus").update({ selected: false }).neq("id", Number(setting_value.menu_change)),
          tenantId
        );
        await withTenant(
          supabaseAdmin.from("rich_menus").update({ selected: true }).eq("id", Number(setting_value.menu_change)),
          tenantId
        );
        console.log("[friend-settings] LINE APIデフォルトメニューを更新:", setting_value.menu_change);
      } else {
        console.error("[friend-settings] LINE APIデフォルトメニュー更新失敗");
      }
    }
  }

  return NextResponse.json({ setting: data });
}
