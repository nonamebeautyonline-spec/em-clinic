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
  const today = new Date().toISOString().slice(0, 10);

  console.log(`=== 今日 (${today}) の reorders ===\n`);

  const { data } = await supabase
    .from("reorders")
    .select("id, gas_row_number, patient_id, status, product_code, created_at")
    .gte("created_at", today + "T00:00:00")
    .order("created_at", { ascending: true });

  for (const r of data || []) {
    const time = (r.created_at || "").slice(11, 16);
    console.log(`${time} id:${r.id} gas_row:${r.gas_row_number} ${r.patient_id} ${r.product_code} [${r.status}]`);
  }

  console.log(`\n合計: ${(data || []).length}件`);

  // ステータス別集計
  const statusCount = {};
  for (const r of data || []) {
    statusCount[r.status] = (statusCount[r.status] || 0) + 1;
  }
  console.log("\nステータス別:");
  for (const [status, count] of Object.entries(statusCount)) {
    console.log(`  ${status}: ${count}件`);
  }
}

main();
