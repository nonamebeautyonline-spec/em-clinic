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
  // GASスクリーンショットから confirmed のもの（患者ID）
  // 458: 20260100647 confirmed
  // 459: 20251200994 confirmed ✅ 済
  // 460: 20260100190 confirmed
  // 461: 20251200280 confirmed
  // 463: 20260200180 confirmed
  // 464: 20260100499 confirmed

  const shouldBeConfirmed = [
    { patient: "20260100647", product: "MJL_2.5mg_1m" },  // GAS row 458
    { patient: "20260100190", product: "MJL_2.5mg_1m" },  // GAS row 460
    { patient: "20251200280", product: "MJL_5mg_1m" },    // GAS row 461
    { patient: "20260200180", product: "MJL_5mg_1m" },    // GAS row 463
    { patient: "20260100499", product: "MJL_5mg_1m" },    // GAS row 464
  ];

  for (const item of shouldBeConfirmed) {
    // 該当するpendingのreorderを探す
    const { data: reorders } = await supabase
      .from("reorders")
      .select("id, gas_row_number, status, product_code, created_at")
      .eq("patient_id", item.patient)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (!reorders || reorders.length === 0) {
      console.log(`${item.patient}: pending なし（既にconfirmedか）`);
      continue;
    }

    // 最新のpendingを更新
    const target = reorders[0];
    console.log(`\n${item.patient}: id=${target.id} gas_row=${target.gas_row_number} product=${target.product_code}`);

    const { error } = await supabase
      .from("reorders")
      .update({
        status: "confirmed",
        approved_at: new Date().toISOString()
      })
      .eq("id", target.id);

    if (error) {
      console.log(`  ❌ Error: ${error.message}`);
    } else {
      console.log(`  ✅ pending → confirmed`);
    }
  }

  // 最終確認
  console.log("\n=== 更新後の pending reorders ===");
  const { data: remaining } = await supabase
    .from("reorders")
    .select("id, gas_row_number, patient_id, status, product_code")
    .eq("status", "pending")
    .order("id", { ascending: false });

  for (const r of remaining || []) {
    console.log(`id:${r.id} gas_row:${r.gas_row_number} patient:${r.patient_id} product:${r.product_code}`);
  }
}

main();
