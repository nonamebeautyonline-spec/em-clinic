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
  // 1. 現在のデフォルト確認
  console.log("=== 変更前: デフォルトリッチメニュー確認 ===");
  const defRes = await fetch("https://api.line.me/v2/bot/user/all/richmenu", {
    headers: { Authorization: `Bearer ${LINE_TOKEN}` },
  });
  if (defRes.ok) {
    const d = await defRes.json();
    console.log("現在のデフォルト:", d.richMenuId);
  }

  // 2. 「個人情報入力前」をデフォルトに設定
  const newDefaultId = "richmenu-a833fc4dab3495fc3eb421130675d37e"; // 個人情報入力前
  console.log("\n=== LINE APIデフォルトを「個人情報入力前」に変更 ===");
  const setRes = await fetch(`https://api.line.me/v2/bot/user/all/richmenu/${newDefaultId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LINE_TOKEN}`,
    },
  });
  
  if (setRes.ok) {
    console.log("LINE APIデフォルト変更: 成功");
  } else {
    console.error("LINE APIデフォルト変更: 失敗", setRes.status, await setRes.text());
    return;
  }

  // 3. DB の selected フラグ更新
  console.log("\n=== DB selected フラグ更新 ===");
  const { error: e1 } = await sb.from("rich_menus").update({ selected: false }).neq("id", 2);
  if (e1) console.error("selected false 更新失敗:", e1.message);
  else console.log("旧デフォルト解除: OK");

  const { error: e2 } = await sb.from("rich_menus").update({ selected: true }).eq("id", 2);
  if (e2) console.error("selected true 更新失敗:", e2.message);
  else console.log("「個人情報入力前」をselected=true: OK");

  // 4. 変更後確認
  console.log("\n=== 変更後: デフォルトリッチメニュー確認 ===");
  const verifyRes = await fetch("https://api.line.me/v2/bot/user/all/richmenu", {
    headers: { Authorization: `Bearer ${LINE_TOKEN}` },
  });
  if (verifyRes.ok) {
    const d = await verifyRes.json();
    console.log("新しいデフォルト:", d.richMenuId);
    
    const { data: menu } = await sb.from("rich_menus")
      .select("name, selected")
      .eq("line_rich_menu_id", d.richMenuId)
      .maybeSingle();
    console.log("メニュー名:", menu?.name, "selected:", menu?.selected);
  }

  // 5. 全メニューの状態確認
  console.log("\n=== rich_menus 全件確認 ===");
  const { data: all } = await sb.from("rich_menus").select("id, name, selected, line_rich_menu_id");
  (all || []).forEach(r => console.log(r));
}

main().catch(console.error);
