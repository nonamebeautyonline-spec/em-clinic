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
  const lineUid = "U03dabc044e7b04d2a695b3c33b119cfd";

  // 1. LINE API: このユーザーに割り当てられているリッチメニューIDを取得
  console.log("=== LINE API: getRichMenuIdOfUser ===");
  const res = await fetch(`https://api.line.me/v2/bot/user/${lineUid}/richmenu`, {
    headers: { Authorization: `Bearer ${LINE_TOKEN}` },
  });

  if (res.ok) {
    const data = await res.json();
    console.log("リッチメニューID:", data.richMenuId);

    // rich_menus テーブルで照合
    const { data: menu } = await sb.from("rich_menus")
      .select("*")
      .eq("line_rich_menu_id", data.richMenuId)
      .maybeSingle();

    if (menu) {
      console.log("メニュー名:", menu.name);
    } else {
      console.log("DBに該当メニューなし");
    }
  } else {
    console.log("ステータス:", res.status);
    const text = await res.text();
    console.log("レスポンス:", text);
  }

  // 2. デフォルトリッチメニュー確認
  console.log("\n=== デフォルトリッチメニュー ===");
  const defRes = await fetch("https://api.line.me/v2/bot/user/all/richmenu", {
    headers: { Authorization: `Bearer ${LINE_TOKEN}` },
  });
  if (defRes.ok) {
    const defData = await defRes.json();
    console.log("デフォルトメニューID:", defData.richMenuId);
    const { data: defMenu } = await sb.from("rich_menus")
      .select("name")
      .eq("line_rich_menu_id", defData.richMenuId)
      .maybeSingle();
    console.log("デフォルトメニュー名:", defMenu?.name || "不明");
  } else {
    console.log("デフォルトメニュー取得失敗:", defRes.status);
  }

  // 3. rich_menus テーブル一覧
  console.log("\n=== rich_menus テーブル ===");
  const { data: allMenus } = await sb.from("rich_menus")
    .select("id, name, line_rich_menu_id");
  (allMenus || []).forEach(r => console.log(r));
}

main().catch(console.error);
