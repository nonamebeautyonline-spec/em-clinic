import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

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

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  // 全件数
  const { data: all, count: allCount } = await supabase
    .from("reorders")
    .select("*", { count: "exact" });

  console.log(`=== DBの再処方データ ===`);
  console.log(`総件数: ${all?.length || 0}件`);

  // ステータス別
  const statusCount = {};
  for (const r of all || []) {
    statusCount[r.status] = (statusCount[r.status] || 0) + 1;
  }
  console.log("\nステータス別:");
  for (const [status, count] of Object.entries(statusCount)) {
    console.log(`  ${status}: ${count}件`);
  }

  // 今日のデータ
  const today = new Date().toISOString().slice(0, 10);
  const todayData = (all || []).filter(r => (r.timestamp || r.created_at || "").startsWith(today));
  console.log(`\n今日(${today})のデータ: ${todayData.length}件`);

  // gas_row_number の最大値
  const maxGasRow = Math.max(...(all || []).map(r => r.gas_row_number || 0));
  console.log(`\ngas_row_number 最大値: ${maxGasRow}`);

  // id の最大値
  const maxId = Math.max(...(all || []).map(r => r.id || 0));
  console.log(`id 最大値: ${maxId}`);

  // 19時以降のデータ（DB切り替え後）
  console.log("\n=== 19時以降のデータ（DB切り替え後） ===");
  const after19 = (all || []).filter(r => {
    const ts = r.timestamp || r.created_at || "";
    return ts >= `${today}T10:00:00`; // JST 19:00 = UTC 10:00
  }).sort((a, b) => (a.timestamp || a.created_at || "").localeCompare(b.timestamp || b.created_at || ""));

  for (const r of after19) {
    const ts = (r.timestamp || r.created_at || "").slice(11, 19);
    console.log(`id:${r.id} gas_row:${r.gas_row_number} status:${r.status} ts:${ts} patient:${r.patient_id}`);
  }
}

main();
