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
  // gas_row_number = 468 を探す
  console.log("=== gas_row_number = 468 を探す ===");
  const { data: byGasRow } = await supabase
    .from("reorders")
    .select("id, gas_row_number, patient_id, status, product_code, created_at")
    .eq("gas_row_number", 468);

  console.log(byGasRow);

  // id = 468 を探す
  console.log("\n=== id = 468 を探す ===");
  const { data: byId } = await supabase
    .from("reorders")
    .select("id, gas_row_number, patient_id, status, product_code, created_at")
    .eq("id", 468);

  console.log(byId);

  // 最新のreorders確認
  console.log("\n=== 最新5件の reorders ===");
  const { data: latest } = await supabase
    .from("reorders")
    .select("id, gas_row_number, patient_id, status, product_code, created_at")
    .order("id", { ascending: false })
    .limit(10);

  for (const r of latest || []) {
    console.log(`id:${r.id} gas_row:${r.gas_row_number} patient:${r.patient_id} status:${r.status}`);
  }
}

main();
