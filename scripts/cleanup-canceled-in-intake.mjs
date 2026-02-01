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
  envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const today = new Date().toISOString().slice(0, 10);

console.log("=== Intakeテーブルのキャンセル済み予約をクリーンアップ ===\n");

// 1. intakeテーブルから今日の予約を取得
const { data: intakeReservations } = await supabase
  .from("intake")
  .select("reserve_id, patient_id, reserved_time, patient_name")
  .eq("reserved_date", today)
  .not("reserved_date", "is", null);

console.log(`Intakeの今日の予約: ${intakeReservations.length}件\n`);

// 2. 各reserve_idがreservationsでキャンセルされているか確認
let toCleanup = [];

for (const intake of intakeReservations) {
  const { data: res } = await supabase
    .from("reservations")
    .select("status")
    .eq("reserve_id", intake.reserve_id)
    .single();
  
  if (res && res.status === "canceled") {
    toCleanup.push(intake);
  }
}

console.log(`キャンセル済みでクリーンアップ対象: ${toCleanup.length}件\n`);

if (toCleanup.length === 0) {
  console.log("クリーンアップ不要です。");
  process.exit(0);
}

console.log("クリーンアップ対象:");
toCleanup.forEach((intake, i) => {
  console.log(`  ${i+1}. ${intake.reserved_time} - ${intake.patient_name} (reserve_id: ${intake.reserve_id})`);
});

console.log("\nクリーンアップを実行します...\n");

// 3. クリーンアップ実行
let cleaned = 0;
let errors = 0;

for (const intake of toCleanup) {
  const { error } = await supabase
    .from("intake")
    .update({
      reserve_id: null,
      reserved_date: null,
      reserved_time: null,
    })
    .eq("reserve_id", intake.reserve_id);
  
  if (error) {
    console.error(`  エラー: ${intake.patient_name}`, error);
    errors++;
  } else {
    cleaned++;
    console.log(`  ✓ ${intake.patient_name} (${intake.reserved_time})`);
  }
}

console.log(`\n=== クリーンアップ完了 ===`);
console.log(`成功: ${cleaned}件`);
console.log(`エラー: ${errors}件`);
