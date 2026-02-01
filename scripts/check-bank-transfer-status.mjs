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
  envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

console.log("=== 銀行振込注文のstatus確認 ===\n");

const { data, error } = await supabase
  .from("bank_transfer_orders")
  .select("id, patient_id, product_code, status, created_at, confirmed_at")
  .not("patient_id", "like", "TEST%")
  .order("id");

if (error) {
  console.error("❌ エラー:", error);
  process.exit(1);
}

console.log(`合計: ${data.length} 件\n`);

data.forEach(o => {
  console.log(`ID: ${o.id}`);
  console.log(`  patient_id: ${o.patient_id}`);
  console.log(`  product_code: ${o.product_code}`);
  console.log(`  status: ${o.status}`);
  console.log(`  created_at: ${o.created_at}`);
  console.log(`  confirmed_at: ${o.confirmed_at || "(null)"}`);
  console.log();
});
