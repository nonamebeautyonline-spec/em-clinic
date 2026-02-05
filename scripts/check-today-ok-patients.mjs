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
  const today = "2026-02-04";

  console.log("=== 今日(" + today + ")の予約でstatus=OK/NGの患者 ===\n");

  const { data: intakes } = await supabase
    .from("intake")
    .select("patient_id, patient_name, reserve_id, reserved_date, status, prescription_menu")
    .eq("reserved_date", today)
    .in("status", ["OK", "NG"]);

  if (!intakes || intakes.length === 0) {
    console.log("該当なし");
    return;
  }

  console.log("該当: " + intakes.length + "件\n");

  for (const intake of intakes) {
    const { data: orders } = await supabase
      .from("orders")
      .select("id")
      .eq("patient_id", intake.patient_id)
      .limit(1);

    const hasOrders = orders && orders.length > 0;

    console.log("患者ID:", intake.patient_id, "/", intake.patient_name);
    console.log("  reserve_id:", intake.reserve_id);
    console.log("  status:", intake.status);
    console.log("  prescription_menu:", intake.prescription_menu || "(なし)");
    console.log("  orders:", hasOrders ? "あり" : "なし ← 決済ボタン表示すべき");
    console.log("---");
  }
}

main().catch(console.error);
