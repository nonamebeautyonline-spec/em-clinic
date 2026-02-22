// scripts/check-richmenu-sync.mjs
// LINE API vs DB のリッチメニュー状態を診断

import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

// .env.local パース
const envPath = resolve(process.cwd(), ".env.local");
const envContent = readFileSync(envPath, "utf-8");
const envVars = {};
envContent.split("\n").forEach((line) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return;
  const [key, ...valueParts] = trimmed.split("=");
  if (key && valueParts.length > 0) {
    let value = valueParts.join("=").trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    envVars[key.trim()] = value;
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY;
const lineToken = envVars.LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN || envVars.LINE_CHANNEL_ACCESS_TOKEN;
const baseUrl = envVars.NEXT_PUBLIC_BASE_URL || "(未設定)";

console.log(`\n── リッチメニュー診断 ──`);
console.log(`NEXT_PUBLIC_BASE_URL: ${baseUrl}`);

const supabase = createClient(supabaseUrl, supabaseKey);

// 1. DB上のリッチメニュー一覧
const { data: dbMenus, error: dbErr } = await supabase
  .from("rich_menus")
  .select("*")
  .order("created_at", { ascending: false });

if (dbErr) {
  console.error("DB取得エラー:", dbErr.message);
  process.exit(1);
}

console.log(`\n── DB上のリッチメニュー (${dbMenus.length}件) ──`);
for (const m of dbMenus) {
  console.log(`  ID: ${m.id}`);
  console.log(`  名前: ${m.name}`);
  console.log(`  LINE側ID: ${m.line_rich_menu_id || "(なし)"}`);
  console.log(`  is_active: ${m.is_active}`);
  console.log(`  selected: ${m.selected}`);
  console.log(`  image_url: ${m.image_url ? m.image_url.substring(0, 80) + "..." : "(なし)"}`);
  console.log(`  areas数: ${m.areas?.length || 0}`);
  console.log(`  更新日: ${m.updated_at}`);
  console.log(`  ---`);
}

// 2. LINE API: リッチメニュー一覧
const lineRes = await fetch("https://api.line.me/v2/bot/richmenu/list", {
  headers: { Authorization: `Bearer ${lineToken}` },
});

if (!lineRes.ok) {
  console.error(`LINE API リッチメニュー一覧取得失敗: ${lineRes.status}`);
  const text = await lineRes.text();
  console.error(text);
} else {
  const lineData = await lineRes.json();
  const lineMenus = lineData.richmenus || [];
  console.log(`\n── LINE API上のリッチメニュー (${lineMenus.length}件) ──`);
  for (const lm of lineMenus) {
    const dbMatch = dbMenus.find(d => d.line_rich_menu_id === lm.richMenuId);
    console.log(`  richMenuId: ${lm.richMenuId}`);
    console.log(`  name: ${lm.name}`);
    console.log(`  selected: ${lm.selected}`);
    console.log(`  chatBarText: ${lm.chatBarText}`);
    console.log(`  areas数: ${lm.areas?.length || 0}`);
    console.log(`  DB対応: ${dbMatch ? `DB ID ${dbMatch.id} (${dbMatch.name})` : "❌ DBに対応なし"}`);
    // アクション詳細
    if (lm.areas) {
      for (let i = 0; i < lm.areas.length; i++) {
        const area = lm.areas[i];
        console.log(`    ボタン${i+1}: type=${area.action.type}, uri=${area.action.uri || ""}, text=${area.action.text || ""}, data=${area.action.data ? area.action.data.substring(0, 60) : ""}`);
      }
    }
    console.log(`  ---`);
  }
}

// 3. LINE API: デフォルトリッチメニュー
const defaultRes = await fetch("https://api.line.me/v2/bot/user/all/richmenu", {
  headers: { Authorization: `Bearer ${lineToken}` },
});

if (!defaultRes.ok) {
  console.log(`\n── デフォルトリッチメニュー: 未設定 (${defaultRes.status}) ──`);
} else {
  const defaultData = await defaultRes.json();
  console.log(`\n── デフォルトリッチメニュー ──`);
  console.log(`  richMenuId: ${defaultData.richMenuId}`);
  const dbMatch = dbMenus.find(d => d.line_rich_menu_id === defaultData.richMenuId);
  console.log(`  DB対応: ${dbMatch ? `DB ID ${dbMatch.id} (${dbMatch.name})` : "❌ DBに対応なし"}`);
}

// 4. DB メニューのアクション詳細
console.log(`\n── DB上のアクション詳細 ──`);
for (const m of dbMenus) {
  console.log(`\n  [${m.name}] (DB ID: ${m.id})`);
  if (m.areas) {
    for (let i = 0; i < m.areas.length; i++) {
      const area = m.areas[i];
      console.log(`    ボタン${i+1}: type=${area.action?.type}, uri=${area.action?.uri || ""}, text=${area.action?.text || ""}, formSlug=${area.action?.formSlug || ""}, displayMethod=${area.action?.displayMethod || ""}`);
      if (area.action?.actions?.length) {
        for (const a of area.action.actions) {
          console.log(`      アクション: ${a.type} = ${a.value || ""}`);
        }
      }
    }
  }
}
