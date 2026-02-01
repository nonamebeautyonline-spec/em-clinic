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
  envVars.SUPABASE_SERVICE_KEY || envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

console.log("=== GASとDBの同期修正 (2026-01-30) ===\n");

// 1. DBにあってGASにない予約をcanceledに変更
console.log("【1. 不正データをcanceledに変更】");

const toCancel = [
  { reserve_id: "resv-1769700832432", patient_id: "20260101576", time: "16:30" },
  { reserve_id: "resv-1769749065463", patient_id: "20260101632", time: "14:30" }
];

for (const item of toCancel) {
  const { error } = await supabase
    .from("reservations")
    .update({ status: "canceled", updated_at: new Date().toISOString() })
    .eq("reserve_id", item.reserve_id);

  if (error) {
    console.error(`❌ ${item.patient_id} (${item.time}): ${error.message}`);
  } else {
    console.log(`✅ ${item.patient_id} (${item.time}): canceled`);
  }
}

// 2. GASにある予約をpendingに戻す
console.log("\n【2. GASの予約をpendingに戻す】");

const toPending = [
  { reserve_id: "resv-1769729904218", patient_id: "20260100211", time: "15:15" },
  { reserve_id: "resv-1769700681889", patient_id: "20260101576", time: "17:15" }
];

for (const item of toPending) {
  const { error } = await supabase
    .from("reservations")
    .update({ status: "pending", updated_at: new Date().toISOString() })
    .eq("reserve_id", item.reserve_id);

  if (error) {
    console.error(`❌ ${item.patient_id} (${item.time}): ${error.message}`);
  } else {
    console.log(`✅ ${item.patient_id} (${item.time}): pending`);
  }
}

// 3. 確認
console.log("\n【3. 修正後の確認】");

const { data: pending } = await supabase
  .from("reservations")
  .select("patient_id, reserve_id, reserved_time")
  .eq("reserved_date", "2026-01-30")
  .eq("status", "pending")
  .order("reserved_time");

console.log(`pending予約数: ${pending.length}件（目標: 48件）\n`);

console.log("=== 修正完了 ===");
