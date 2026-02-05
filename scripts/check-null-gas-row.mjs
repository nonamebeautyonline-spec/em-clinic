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
  // gas_row_numberがnullのconfirmed reordersを確認
  const { data } = await supabase
    .from("reorders")
    .select("id, patient_id, status, gas_row_number, product_code")
    .eq("status", "confirmed");

  console.log("=== confirmed reordersのgas_row_number ===");
  let nullCount = 0;
  for (const r of data || []) {
    if (!r.gas_row_number) {
      console.log(`id:${r.id} | ${r.patient_id} | gas_row_number: NULL`);
      nullCount++;
    }
  }
  console.log(`\ngas_row_number NULL: ${nullCount}件 / ${(data || []).length}件`);
}

main();
