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
  const patientId = "20260200180";

  // reorders
  const { data: reorders } = await supabase
    .from("reorders")
    .select("*")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });

  console.log(`=== Reorders for ${patientId} ===`);
  for (const r of reorders || []) {
    console.log(`id:${r.id} | status:${r.status} | product:${r.product_code} | created:${(r.created_at || "").slice(0,19)}`);
  }
  if (!reorders || reorders.length === 0) {
    console.log("(なし)");
  }

  // orders
  const { data: orders } = await supabase
    .from("orders")
    .select("id, payment_status, product_code, paid_at")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });

  console.log(`\n=== Orders for ${patientId} ===`);
  for (const o of orders || []) {
    console.log(`id:${o.id} | status:${o.payment_status} | product:${o.product_code} | paid:${(o.paid_at || "").slice(0,19)}`);
  }
  if (!orders || orders.length === 0) {
    console.log("(なし)");
  }
}

main();
