// scripts/fix-today-reservations.mjs
// 今日の予約で日時が変更された2件を修正

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

const updates = [
  {
    reserve_id: "resv-1768540874096",
    patient_id: "20260100950",
    reserved_date: "2026-01-30",
    reserved_time: "12:00",
  },
  {
    reserve_id: "resv-1769638664327",
    patient_id: "20260101578",
    reserved_date: "2026-01-30",
    reserved_time: "13:00",
  },
];

console.log("=== 今日の予約日時修正 ===\n");

async function fixTodayReservations() {
  for (const update of updates) {
    console.log(`【${update.reserve_id}】`);

    const { data, error } = await supabase
      .from("reservations")
      .update({
        reserved_date: update.reserved_date,
        reserved_time: update.reserved_time,
      })
      .eq("reserve_id", update.reserve_id)
      .select();

    if (error) {
      console.log(`  ❌ エラー: ${error.message}`);
    } else if (!data || data.length === 0) {
      console.log(`  ❌ 更新対象なし`);
    } else {
      console.log(`  ✅ 更新成功`);
      console.log(`      patient_id: ${data[0].patient_id}`);
      console.log(`      reserved_date: ${data[0].reserved_date}`);
      console.log(`      reserved_time: ${data[0].reserved_time}`);
    }
    console.log();
  }

  console.log("=== 修正完了 ===");
}

fixTodayReservations();
