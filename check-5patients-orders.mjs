// check-5patients-orders.mjs
// 5人の患者のordersデータを確認

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

// .env.productionから環境変数を読み込む
const envFile = readFileSync(".env.production", "utf-8");
const envVars = {};
envFile.split("\n").forEach(line => {
  const match = line.match(/^([^=]+)="?([^"]*)"?$/);
  if (match) {
    envVars[match[1]] = match[2];
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const gasIntakeUrl = envVars.GAS_INTAKE_URL;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Supabase環境変数が設定されていません");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const patientIds = ["20251200832", "20251201077", "20260100025", "20260100295"];

console.log("=== 5人の患者のorders/reorderデータ確認 ===\n");

for (const pid of patientIds) {
  console.log(`\n========== 患者ID: ${pid} ==========`);

  // ordersテーブル確認
  const { data: ordersData, error: ordersError } = await supabase
    .from("orders")
    .select("*")
    .eq("patient_id", pid)
    .order("created_at", { ascending: false });

  if (ordersError) {
    console.error("❌ ordersテーブルエラー:", ordersError);
  } else if (ordersData.length === 0) {
    console.log("⚠️  注文データなし");
  } else {
    console.log(`✅ 注文データ: ${ordersData.length}件`);
    for (const o of ordersData.slice(0, 3)) {
      console.log(`   - Order ID: ${o.order_id}, Type: ${o.order_type || "(なし)"}, Status: ${o.status || "(なし)"}, Created: ${new Date(o.created_at).toLocaleString("ja-JP")}`);
    }
  }

  // GASダッシュボードからreorders確認
  try {
    const gasUrl = gasIntakeUrl + "?type=getDashboard&patient_id=" + pid + "&full=1";
    const response = await fetch(gasUrl);
    const dashboard = await response.json();

    console.log("\n【GAS reorders】");
    if (dashboard.reorders && dashboard.reorders.length > 0) {
      console.log(`   ${dashboard.reorders.length}件`);
      for (const r of dashboard.reorders.slice(0, 3)) {
        console.log(`   - ${r.date || "(日付なし)"}: ${r.status} (approved: ${r.approved})`);
        console.log(`     Note: ${r.note || "(なし)"}`);
        console.log(`     Menu: ${r.menu || "(なし)"}`);
      }
    } else {
      console.log("   0件");
    }
  } catch (e) {
    console.error("❌ GASエラー:", e.message);
  }
}

console.log("\n=== 完了 ===");
