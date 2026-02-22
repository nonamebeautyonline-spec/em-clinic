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
const LINE_TOKEN = env.LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN;

async function main() {
  // DBから全メニュー取得
  const { data: menus } = await sb.from("rich_menus").select("id, name, areas, line_rich_menu_id");
  
  for (const menu of (menus || [])) {
    console.log(`\n========== ${menu.name} (id=${menu.id}) ==========`);
    
    // LINE APIからも取得して照合
    if (menu.line_rich_menu_id) {
      const res = await fetch(`https://api.line.me/v2/bot/richmenu/${menu.line_rich_menu_id}`, {
        headers: { Authorization: `Bearer ${LINE_TOKEN}` },
      });
      if (res.ok) {
        const lineMenu = await res.json();
        console.log("LINE API側のareas:");
        (lineMenu.areas || []).forEach((area, i) => {
          console.log(`  ボタン${i+1}: action=${JSON.stringify(area.action)}`);
        });
      }
    }
    
    console.log("\nDB側のareas:");
    const areas = menu.areas || [];
    areas.forEach((area, i) => {
      console.log(`  ボタン${i+1}:`, JSON.stringify(area));
    });
  }
}

main().catch(console.error);
