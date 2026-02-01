// scripts/cleanup-duplicate-reservations-20260100321.mjs
// patient_id 20260100321の重複予約を整理

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

console.log("=== patient_id: 20260100321 の重複予約整理 ===\n");

// intakeに紐づいている正しい予約ID
const correctReserveId = "resv-1769736525803";

// キャンセルする重複予約ID
const duplicateReserveIds = [
  "resv-1769736691381",
  "resv-1769736700850",
  "resv-1769737150944",
];

console.log("正しい予約:", correctReserveId, "(11:00)");
console.log("重複予約をキャンセル:", duplicateReserveIds.length, "件\n");

for (const reserveId of duplicateReserveIds) {
  const { data, error } = await supabase
    .from("reservations")
    .update({ status: "canceled" })
    .eq("reserve_id", reserveId)
    .select();

  if (error) {
    console.log(`❌ ${reserveId}: エラー - ${error.message}`);
  } else {
    console.log(`✅ ${reserveId}: キャンセル完了`);
  }
}

console.log("\n=== 整理完了 ===");
