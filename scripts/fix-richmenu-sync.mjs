// scripts/fix-richmenu-sync.mjs
// 1. LINE上の旧リッチメニュー削除
// 2. 全ユーザーを正しいメニューに再リンク

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

const supabase = createClient(supabaseUrl, supabaseKey);

// ── ページネーション付き全件取得 ──
async function fetchAll(table, columns, filter) {
  const all = [];
  const PAGE = 1000;
  let from = 0;
  while (true) {
    let q = supabase.from(table).select(columns).range(from, from + PAGE - 1);
    if (filter) q = filter(q);
    const { data, error } = await q;
    if (error) { console.error(`${table}取得エラー:`, error.message); break; }
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

console.log(`\n══════════════════════════════`);
console.log(`  リッチメニュー修復スクリプト`);
console.log(`══════════════════════════════\n`);

// ============================================================
// Step 1: DB上の正しいメニューIDを取得
// ============================================================
const { data: dbMenus } = await supabase
  .from("rich_menus")
  .select("id, name, line_rich_menu_id, selected")
  .order("id");

const validLineMenuIds = new Set(dbMenus.map(m => m.line_rich_menu_id).filter(Boolean));

console.log("── DB上の正しいメニュー ──");
for (const m of dbMenus) {
  console.log(`  [${m.name}] → ${m.line_rich_menu_id || "(未登録)"} ${m.selected ? "(デフォルト)" : ""}`);
}

// ============================================================
// Step 2: LINE上の旧メニューを削除
// ============================================================
console.log("\n── LINE上の旧メニュー削除 ──");

const lineRes = await fetch("https://api.line.me/v2/bot/richmenu/list", {
  headers: { Authorization: `Bearer ${lineToken}` },
});
const lineData = await lineRes.json();
const lineMenus = lineData.richmenus || [];

let deletedCount = 0;
for (const lm of lineMenus) {
  if (!validLineMenuIds.has(lm.richMenuId)) {
    // まずユーザーのリンクを解除してから削除
    console.log(`  削除中: ${lm.richMenuId} (${lm.name})`);
    const delRes = await fetch(`https://api.line.me/v2/bot/richmenu/${lm.richMenuId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${lineToken}` },
    });
    if (delRes.ok) {
      console.log(`    ✓ 削除成功`);
      deletedCount++;
    } else {
      const text = await delRes.text();
      console.log(`    ✗ 削除失敗: ${delRes.status} ${text}`);
    }
  }
}
console.log(`  → ${deletedCount}個の旧メニューを削除`);

// ============================================================
// Step 3: デフォルトメニューを再設定
// ============================================================
const defaultMenu = dbMenus.find(m => m.selected && m.line_rich_menu_id);
if (defaultMenu) {
  console.log(`\n── デフォルトメニュー再設定 ──`);
  console.log(`  設定: ${defaultMenu.name} (${defaultMenu.line_rich_menu_id})`);
  const setRes = await fetch(`https://api.line.me/v2/bot/user/all/richmenu/${defaultMenu.line_rich_menu_id}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${lineToken}`,
    },
  });
  console.log(`  → ${setRes.ok ? "✓ 成功" : "✗ 失敗 " + setRes.status}`);
}

// ============================================================
// Step 4: 個別リンクされたユーザーを正しいメニューに再リンク
// ============================================================
console.log(`\n── ユーザーリリンク ──`);

// メニュー名マップ
const menuByName = {};
for (const m of dbMenus) {
  if (m.line_rich_menu_id) menuByName[m.name] = m.line_rich_menu_id;
}

const postRegMenu = menuByName["個人情報入力後"];
const postRxMenu = menuByName["処方後"];
const preRegMenu = menuByName["個人情報入力前"];

console.log(`  個人情報入力前: ${preRegMenu || "なし"}`);
console.log(`  個人情報入力後: ${postRegMenu || "なし"}`);
console.log(`  処方後: ${postRxMenu || "なし"}`);

// intake からすべての line_id を持つ患者を取得
const patients = await fetchAll("intake", "patient_id, line_id, patient_name");

const patientsWithLine = patients.filter(p => p.line_id);
console.log(`\n  LINE連携済み患者: ${patientsWithLine.length}人`);

// 各患者のメニュー決定ロジック:
// - orders があれば「処方後」
// - answerers.name があれば「個人情報入力後」
// - それ以外（LINE_プレフィックス等）はスキップ → デフォルト（個人情報入力前）が適用

let relinked = 0;
let skipped = 0;
let errors = 0;
const batchSize = 50;

for (let i = 0; i < patientsWithLine.length; i += batchSize) {
  const batch = patientsWithLine.slice(i, i + batchSize);

  for (const p of batch) {
    // orders チェック
    const { data: order } = await supabase
      .from("orders")
      .select("id")
      .eq("patient_id", p.patient_id)
      .limit(1)
      .maybeSingle();

    // answerers に名前があるか確認（個人情報入力済みの判定）
    const { data: answerer } = await supabase
      .from("answerers")
      .select("name")
      .eq("patient_id", p.patient_id)
      .maybeSingle();

    let targetMenuId;
    let targetMenuName;

    if (order && postRxMenu) {
      targetMenuId = postRxMenu;
      targetMenuName = "処方後";
    } else if (answerer?.name && postRegMenu) {
      // answerers.name がある人だけ「個人情報入力後」に設定
      targetMenuId = postRegMenu;
      targetMenuName = "個人情報入力後";
    }

    if (!targetMenuId) {
      skipped++;
      continue;
    }

    // LINE APIで個別リンク
    const linkRes = await fetch(`https://api.line.me/v2/bot/user/${p.line_id}/richmenu/${targetMenuId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lineToken}`,
      },
    });

    if (linkRes.ok) {
      relinked++;
    } else {
      errors++;
      if (errors <= 5) {
        const text = await linkRes.text();
        console.log(`    ✗ ${p.patient_id} (${p.patient_name}): ${linkRes.status} ${text}`);
      }
    }
  }

  if ((i + batchSize) % 200 === 0 || i + batchSize >= patientsWithLine.length) {
    console.log(`  進捗: ${Math.min(i + batchSize, patientsWithLine.length)}/${patientsWithLine.length}`);
  }
}

console.log(`\n══════════════════════════════`);
console.log(`  修復結果`);
console.log(`══════════════════════════════`);
console.log(`  旧メニュー削除:  ${deletedCount}個`);
console.log(`  リリンク成功:    ${relinked}人`);
console.log(`  スキップ:        ${skipped}人`);
console.log(`  エラー:          ${errors}人`);
console.log(`══════════════════════════════\n`);
