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

// bank_transfer_ordersの構造確認
const { data: sample } = await supabase
  .from("bank_transfer_orders")
  .select("*")
  .limit(3);

console.log("Sample bank_transfer_orders:");
console.log(JSON.stringify(sample, null, 2));

// 特定の患者で確認
const patientId = "20260200132";
const { data: patientBT } = await supabase
  .from("bank_transfer_orders")
  .select("*")
  .eq("patient_id", patientId);

console.log(`\nbank_transfer_orders for ${patientId}:`);
console.log(JSON.stringify(patientBT, null, 2));

// ordersテーブルで銀行振込未確定を確認
const { data: pendingOrders } = await supabase
  .from("orders")
  .select("id, patient_id, product_code, payment_method, status, created_at")
  .eq("payment_method", "bank_transfer")
  .eq("status", "pending_confirmation")
  .limit(5);

console.log("\nOrders with pending_confirmation (bank_transfer):");
console.log(JSON.stringify(pendingOrders, null, 2));
