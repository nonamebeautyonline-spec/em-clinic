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
  console.log("=== shipping_date = 2026-02-04 で tracking_number なしを NULL に戻す ===\n");

  // まず対象のIDを取得
  const { data: orders } = await supabase
    .from("orders")
    .select("id, patient_id, tracking_number")
    .eq("shipping_date", "2026-02-04");

  if (!orders || orders.length === 0) {
    console.log("対象なし");
    return;
  }

  // tracking_numberがnullまたは空のものをフィルタ
  const toReset = orders.filter(o => !o.tracking_number || o.tracking_number === "");
  console.log(`対象: ${toReset.length} 件`);

  if (toReset.length === 0) {
    console.log("リセット対象なし");
    return;
  }

  const ids = toReset.map(o => o.id);

  const { error } = await supabase
    .from("orders")
    .update({ shipping_date: null })
    .in("id", ids);

  if (error) {
    console.error("Error:", error.message);
  } else {
    console.log(`✅ ${ids.length} 件をリセットしました`);
    toReset.forEach(o => console.log(`  - ${o.id}`));
  }
}

main().catch(console.error);
