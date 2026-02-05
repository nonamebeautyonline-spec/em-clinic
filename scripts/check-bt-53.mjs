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
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    envVars[key.trim()] = value;
  }
});

const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);

// ID 53のデータ
const { data: bt53 } = await supabase.from("bank_transfer_orders").select("*").eq("id", 53).single();
console.log("bank_transfer_orders ID 53:");
console.log(JSON.stringify(bt53, null, 2));

// patient_id 20260101083 のordersを確認
const { data: patientOrders } = await supabase.from("orders").select("id, patient_id, product_code, payment_method, status, created_at, amount").eq("patient_id", "20260101083");
console.log("\norders for patient 20260101083:");
console.log(JSON.stringify(patientOrders, null, 2));
