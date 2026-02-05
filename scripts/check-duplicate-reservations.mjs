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

const targetDate = process.argv[2] || "2026-02-04";

async function main() {
  const { data } = await supabase
    .from("reservations")
    .select("patient_id, patient_name, reserve_id, reserved_time, status, created_at")
    .eq("reserved_date", targetDate)
    .neq("status", "canceled")
    .order("patient_id")
    .order("reserved_time");

  // patient_idでグループ化
  const grouped = {};
  data.forEach(r => {
    if (!grouped[r.patient_id]) grouped[r.patient_id] = [];
    grouped[r.patient_id].push(r);
  });

  console.log(`=== ${targetDate} 同一患者で複数予約 ===\n`);
  let found = false;
  for (const [pid, reservations] of Object.entries(grouped)) {
    if (reservations.length > 1) {
      found = true;
      console.log(`患者ID: ${pid} (${reservations[0].patient_name})`);
      reservations.forEach((r, i) => {
        const created = new Date(new Date(r.created_at).getTime() + 9*60*60*1000);
        console.log(`  [${i+1}] ${r.reserve_id}`);
        console.log(`      時間: ${r.reserved_time}`);
        console.log(`      status: ${r.status}`);
        console.log(`      作成: ${created.toISOString().slice(0,19).replace("T"," ")}`);
      });
      console.log("");
    }
  }

  if (!found) {
    console.log("重複なし");
  }
}

main();
