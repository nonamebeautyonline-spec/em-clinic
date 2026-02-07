import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const token = process.env.LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN || process.env.LINE_NOTIFY_CHANNEL_ACCESS_TOKEN;

// LINE APIからリッチメニュー一覧取得
const res = await fetch("https://api.line.me/v2/bot/richmenu/list", {
  headers: { Authorization: `Bearer ${token}` },
});
const { richmenus } = await res.json();

console.log("LINE API menus:");
for (const rm of richmenus) {
  console.log(`  ${rm.richMenuId} -> "${rm.name}"`);
}

// DB取得
const { data: dbMenus } = await sb.from("rich_menus").select("id, name, line_rich_menu_id").order("id");

console.log("\nDB menus:");
for (const m of dbMenus) {
  console.log(`  id=${m.id} "${m.name}" -> ${m.line_rich_menu_id || "NULL"}`);
}

// マッチング
const used = new Set();
for (const dbMenu of dbMenus) {
  if (dbMenu.line_rich_menu_id) continue;

  // 完全一致を優先
  let match = richmenus.find((rm) => rm.name === dbMenu.name && !used.has(rm.richMenuId));
  // 部分一致
  if (!match) {
    match = richmenus.find((rm) => (rm.name.includes(dbMenu.name) || dbMenu.name.includes(rm.name)) && !used.has(rm.richMenuId));
  }

  if (match) {
    used.add(match.richMenuId);
    console.log(`\nMATCH: DB id=${dbMenu.id} "${dbMenu.name}" -> ${match.richMenuId} (LINE: "${match.name}")`);

    const { error } = await sb
      .from("rich_menus")
      .update({ line_rich_menu_id: match.richMenuId, is_active: true })
      .eq("id", dbMenu.id);

    if (error) {
      console.log("  ERROR:", error.message);
    } else {
      console.log("  UPDATED OK");
    }
  } else {
    console.log(`\nNO MATCH: DB id=${dbMenu.id} "${dbMenu.name}"`);
  }
}

// 確認
const { data: verify } = await sb.from("rich_menus").select("id, name, line_rich_menu_id, is_active").order("id");
console.log("\n=== After update ===");
for (const m of verify) console.log(JSON.stringify(m));
