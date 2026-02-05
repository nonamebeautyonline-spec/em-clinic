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

async function fetchAllReservations() {
  const allData = [];
  let offset = 0;
  const limit = 1000;

  while (true) {
    const { data, error } = await supabase
      .from("reservations")
      .select("patient_id, patient_name, reserve_id, reserved_date, reserved_time, status, created_at")
      .neq("status", "canceled")
      .order("patient_id")
      .order("reserved_date")
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Error:", error);
      break;
    }

    if (!data || data.length === 0) break;

    allData.push(...data);
    console.log(`Fetched ${allData.length} reservations...`);

    if (data.length < limit) break;
    offset += limit;
  }

  return allData;
}

async function main() {
  console.log("=== 有効な予約が複数ある患者を検索 ===\n");

  const reservations = await fetchAllReservations();
  console.log(`\n総予約数: ${reservations.length}件\n`);

  // patient_idでグループ化
  const grouped = {};
  reservations.forEach(r => {
    if (!grouped[r.patient_id]) grouped[r.patient_id] = [];
    grouped[r.patient_id].push(r);
  });

  // 2件以上の患者を抽出
  const duplicates = Object.entries(grouped)
    .filter(([_, reservations]) => reservations.length >= 2)
    .sort((a, b) => b[1].length - a[1].length);

  console.log(`複数予約を持つ患者: ${duplicates.length}名\n`);
  console.log("=".repeat(70));

  for (const [pid, records] of duplicates) {
    console.log(`\n患者ID: ${pid} (${records[0].patient_name}) - ${records.length}件`);
    records.forEach((r, i) => {
      const created = new Date(new Date(r.created_at).getTime() + 9*60*60*1000);
      console.log(`  [${i+1}] ${r.reserved_date} ${r.reserved_time} | ${r.reserve_id}`);
      console.log(`       status: ${r.status || "(null)"} | 作成: ${created.toISOString().slice(0,16).replace("T"," ")}`);
    });
  }

  console.log("\n" + "=".repeat(70));
  console.log(`合計: ${duplicates.length}名が複数予約を保持`);
}

main();
