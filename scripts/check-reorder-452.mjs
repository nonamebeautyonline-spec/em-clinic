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
  // Reorder 452の詳細
  const { data: reorder } = await supabase
    .from("reorders")
    .select("*")
    .eq("id", 452)
    .single();

  console.log("=== Reorder 452 ===");
  console.log("id:", reorder.id);
  console.log("gas_row_number:", reorder.gas_row_number);
  console.log("status:", reorder.status);
  console.log("patient_id:", reorder.patient_id);
  console.log("product_code:", reorder.product_code);
  console.log("created_at:", reorder.created_at);

  // 決済時のnoteに入れたreorder IDは gas_row_number
  // checkout確認ページでnoteを作成している
  console.log("\n決済のnote形式: Reorder:<gas_row_number>");
  console.log("期待されるReorder ID:", reorder.gas_row_number);

  // ordersから対応するorderの情報を確認
  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("patient_id", "20251200649")
    .eq("product_code", "MJL_5mg_1m")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  console.log("\n=== 対応するOrder ===");
  console.log("id:", order.id);
  console.log("paid_at:", order.paid_at);
  console.log("note:", order.note || "(なし)");
}

main();
