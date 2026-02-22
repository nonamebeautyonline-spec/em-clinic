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
const LINE_TOKEN = env.LINE_CHANNEL_ACCESS_TOKEN;

async function main() {
  const lineUid = "U03dabc044e7b04d2a695b3c33b119cfd";

  // 1. LINE API: このユーザーに割り当てられているリッチメニューIDを取得
  console.log("=== LINE API: getRichMenuIdOfUser ===");
  const res = await fetch(`https://api.line.me/v2/bot/user/${lineUid}/richmenu`, {
    headers: { Authorization: `Bearer ${LINE_TOKEN}` },
  });
  
  if (res.ok) {
    const data = await res.json();
    console.log("リッチメニューID:", data.richMenuId);
    
    // 2. rich_menus テーブルで照合
    const { data: menu } = await sb.from("rich_menus")
      .select("*")
      .eq("line_rich_menu_id", data.richMenuId)
      .maybeSingle();
    
    if (menu) {
      console.log("メニュー名:", menu.name);
      console.log("メニュー詳細:", menu);
    } else {
      console.log("DBに該当メニューなし（デフォルトメニューの可能性）");
      
      // デフォルトリッチメニューを取得
      const defRes = await fetch("https://api.line.me/v2/bot/user/all/richmenu", {
        headers: { Authorization: `Bearer ${LINE_TOKEN}` },
      });
      if (defRes.ok) {
        const defData = await defRes.json();
        console.log("デフォルトリッチメニューID:", defData.richMenuId);
        if (defData.richMenuId === data.richMenuId) {
          console.log("→ デフォルトメニューが割り当てられています");
        }
      }
    }
  } else {
    console.log("ステータス:", res.status);
    const text = await res.text();
    console.log("エラー:", text);
    
    // リッチメニューが個別に割り当てられていない場合、デフォルトを確認
    console.log("\n=== デフォルトリッチメニュー確認 ===");
    const defRes = await fetch("https://api.line.me/v2/bot/user/all/richmenu", {
      headers: { Authorization: `Bearer ${LINE_TOKEN}` },
    });
    if (defRes.ok) {
      const defData = await defRes.json();
      console.log("デフォルトリッチメニューID:", defData.richMenuId);
      
      const { data: defMenu } = await sb.from("rich_menus")
        .select("*")
        .eq("line_rich_menu_id", defData.richMenuId)
        .maybeSingle();
      console.log("デフォルトメニュー名:", defMenu?.name || "不明");
    }
  }

  // 3. rich_menus テーブルの全メニュー一覧
  console.log("\n=== rich_menus テーブル一覧 ===");
  const { data: allMenus } = await sb.from("rich_menus")
    .select("id, name, line_rich_menu_id, created_at");
  (allMenus || []).forEach(r => console.log(r));
}

main().catch(console.error);
