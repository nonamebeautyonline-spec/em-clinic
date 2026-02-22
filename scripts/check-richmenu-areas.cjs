const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const envContent = fs.readFileSync(path.resolve(__dirname, "../.env.local"), "utf-8");
const env = {};
envContent.split("\n").forEach((l) => {
  const t = l.trim();
  if (!t || t.startsWith("#")) return;
  const i = t.indexOf("=");
  if (i === -1) return;
  let v = t.substring(i + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  env[t.substring(0, i).trim()] = v;
});

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  // 全リッチメニューの areas を取得
  const { data: menus } = await sb.from("rich_menus")
    .select("id, name, areas, chat_bar_text, selected");

  for (const menu of (menus || [])) {
    console.log(`\n=== ${menu.name} (id=${menu.id}, selected=${menu.selected}) ===`);
    console.log("chat_bar_text:", menu.chat_bar_text);
    const areas = menu.areas || [];
    areas.forEach((area, i) => {
      console.log(`  ボタン${i + 1}:`, JSON.stringify(area, null, 2));
    });
  }
}

main().catch(console.error);
