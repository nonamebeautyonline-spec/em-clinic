// scripts/switch-menu-today-shipped.mjs
// shipping_date が今日 & shipping_status=shipped の患者を「処方後」メニューに切替

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

if (!supabaseUrl || !supabaseKey || !lineToken) {
  console.error("✗ 環境変数が不足しています");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const today = "2026-02-08";
console.log(`\n══════════════════════════════`);
console.log(`  処方後メニュー切替`);
console.log(`  対象: shipping_date = ${today}`);
console.log(`══════════════════════════════\n`);

// Step 1: 「処方後」メニュー取得
const { data: menus } = await supabase
  .from("rich_menus")
  .select("id, name, line_rich_menu_id")
  .eq("name", "処方後")
  .not("line_rich_menu_id", "is", null);

if (!menus || menus.length === 0) {
  console.error("✗ 「処方後」リッチメニューが見つかりません");
  process.exit(1);
}

const postRxMenu = menus[0];
console.log(`処方後メニュー: ${postRxMenu.line_rich_menu_id}\n`);

// Step 2: 今日発送の注文を取得
const { data: todayOrders, error: ordersErr } = await supabase
  .from("orders")
  .select("patient_id")
  .eq("shipping_status", "shipped")
  .gte("shipping_date", today)
  .lt("shipping_date", "2026-02-09");

if (ordersErr) {
  console.error("✗ orders取得エラー:", ordersErr);
  process.exit(1);
}

const patientIds = [...new Set(todayOrders.map(o => o.patient_id))];
console.log(`対象患者: ${patientIds.length}人\n`);

// Step 3: 各患者のメニューを切替
let linked = 0;
let alreadyOk = 0;
let noLine = 0;
let errors = 0;

for (const pid of patientIds) {
  const { data: intake } = await supabase
    .from("intake")
    .select("line_id, patient_name")
    .eq("patient_id", pid)
    .maybeSingle();

  if (!intake || !intake.line_id) {
    noLine++;
    continue;
  }

  // 現在のメニュー確認
  const checkRes = await fetch(`https://api.line.me/v2/bot/user/${intake.line_id}/richmenu`, {
    headers: { Authorization: `Bearer ${lineToken}` },
  });

  if (checkRes.ok) {
    const current = await checkRes.json();
    if (current.richMenuId === postRxMenu.line_rich_menu_id) {
      alreadyOk++;
      console.log(`  - ${pid} (${intake.patient_name}) 切替済み`);
      continue;
    }
  }

  // 処方後メニューにリンク
  const linkRes = await fetch(`https://api.line.me/v2/bot/user/${intake.line_id}/richmenu/${postRxMenu.line_rich_menu_id}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${lineToken}`,
    },
  });

  if (linkRes.ok) {
    linked++;
    console.log(`  ✓ ${pid} (${intake.patient_name}) → 処方後メニューに切替`);
  } else {
    errors++;
    const text = await linkRes.text();
    console.log(`  ✗ ${pid} (${intake.patient_name}): ${linkRes.status} ${text}`);
  }
}

console.log(`\n══════════════════════════════`);
console.log(`  結果`);
console.log(`══════════════════════════════`);
console.log(`  切替成功:    ${linked}人`);
console.log(`  切替済み:    ${alreadyOk}人`);
console.log(`  LINE未連携:  ${noLine}人`);
console.log(`  エラー:      ${errors}人`);
console.log(`══════════════════════════════\n`);
