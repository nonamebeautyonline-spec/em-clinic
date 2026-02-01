// scripts/check-specific-reservations.mjs
// 特定のreserve_idがSupabaseに存在するか確認

import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

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

const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const reserveIds = [
  "resv-1768540874096",
  "resv-1769638664327"
];

async function checkReservations() {
  console.log("=== 特定のreserve_id確認 ===\n");

  for (const reserveId of reserveIds) {
    console.log(`【${reserveId}】`);

    const { data, error } = await supabase
      .from("reservations")
      .select("*")
      .eq("reserve_id", reserveId)
      .maybeSingle();

    if (error) {
      console.log(`  ❌ エラー: ${error.message}`);
    } else if (!data) {
      console.log(`  ❌ 存在しません`);
    } else {
      console.log(`  ✅ 存在します:`);
      console.log(`      patient_id: ${data.patient_id}`);
      console.log(`      reserved_date: ${data.reserved_date}`);
      console.log(`      reserved_time: ${data.reserved_time}`);
      console.log(`      status: ${data.status}`);
    }
    console.log();
  }
}

checkReservations();
