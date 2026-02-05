import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const envContent = readFileSync("/Users/administer/em-clinic/.env.local", "utf-8");
const envVars = {};
envContent.split("\n").forEach((line) => {
  const [key, ...vals] = line.split("=");
  if (key && vals.length) envVars[key.trim()] = vals.join("=").trim();
});

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.SUPABASE_SERVICE_ROLE_KEY
);

// 2026/02/04 06:33 JST = 2026/02/03 21:33 UTC
const cutoff = "2026-02-03T21:33:00.000Z";

console.log("=== 2026/02/04 06:33 JST以降の振込注文 ===\n");

const { data: orders, error } = await supabase
  .from("orders")
  .select("id, patient_id, payment_method, status, created_at, paid_at, amount, shipping_name")
  .eq("payment_method", "bank_transfer")
  .gte("created_at", cutoff)
  .order("created_at", { ascending: true });

if (error) {
  console.error("Error:", error);
  process.exit(1);
}

console.log("振込注文数:", orders?.length || 0);
if (orders && orders.length > 0) {
  for (const o of orders) {
    const createdJST = new Date(new Date(o.created_at).getTime() + 9*60*60*1000).toISOString().replace("T", " ").slice(0, 19);
    console.log("\n[" + o.id + "]");
    console.log("  patient_id: " + o.patient_id);
    console.log("  status: " + o.status);
    console.log("  created_at(JST): " + createdJST);
    console.log("  paid_at: " + (o.paid_at || "(未入金)"));
    console.log("  amount: ¥" + (o.amount?.toLocaleString() || "0"));
    console.log("  shipping_name: " + (o.shipping_name || "(なし)"));
  }
} else {
  console.log("\n該当する注文はありません");
}
