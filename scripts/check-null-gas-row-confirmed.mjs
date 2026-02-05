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
  // confirmed で gas_row_number が null のものを探す
  const { data: nullGasRows } = await supabase
    .from("reorders")
    .select("id, gas_row_number, patient_id, status, product_code, created_at")
    .eq("status", "confirmed")
    .is("gas_row_number", null);

  console.log("=== confirmed で gas_row_number が null のレコード ===");
  if (!nullGasRows || nullGasRows.length === 0) {
    console.log("なし");
  } else {
    for (const r of nullGasRows) {
      console.log(`id:${r.id} patient:${r.patient_id} product:${r.product_code}`);
    }
  }

  // 全 confirmed を確認
  console.log("\n=== 全 confirmed reorders ===");
  const { data: confirmedReorders } = await supabase
    .from("reorders")
    .select("id, gas_row_number, patient_id, status, product_code")
    .eq("status", "confirmed")
    .order("id", { ascending: false });

  for (const r of confirmedReorders || []) {
    const hasGasRow = r.gas_row_number ? "✓" : "❌";
    console.log(`id:${r.id} gas_row:${r.gas_row_number || "NULL"} ${hasGasRow} patient:${r.patient_id} product:${r.product_code}`);
  }
}

main();
