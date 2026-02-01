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

console.log("=== キャンセル済み予約のクリーンアップ ===\n");

// 1. intakeテーブルで予約を持っているレコードを全件取得
const { data: intakesWithReservation, error: intakeError } = await supabase
  .from("intake")
  .select("patient_id, reserve_id, reserved_date, reserved_time")
  .not("reserve_id", "is", null);

if (intakeError) {
  console.error("Intakeテーブルエラー:", intakeError);
  process.exit(1);
}

console.log(`予約情報を持つintakeレコード: ${intakesWithReservation.length}件\n`);

// 2. それぞれのreserve_idがreservationsテーブルでキャンセル済みか確認
let toCleanup = [];

for (const intake of intakesWithReservation) {
  const { data: resData } = await supabase
    .from("reservations")
    .select("reserve_id, status")
    .eq("reserve_id", intake.reserve_id)
    .single();
  
  if (!resData || resData.status === "canceled") {
    toCleanup.push(intake);
  }
}

console.log(`クリーンアップ対象: ${toCleanup.length}件\n`);

if (toCleanup.length === 0) {
  console.log("クリーンアップ不要です。");
  process.exit(0);
}

console.log("クリーンアップ対象の最初の10件:");
toCleanup.slice(0, 10).forEach((intake, i) => {
  console.log(`  ${i+1}. patient_id: ${intake.patient_id}, reserve_id: ${intake.reserve_id}, 日時: ${intake.reserved_date} ${intake.reserved_time}`);
});

console.log("\nクリーンアップを実行します...\n");

// 3. バッチでクリーンアップ
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
    .eq("patient_id", intake.patient_id)
    .eq("reserve_id", intake.reserve_id);
  
  if (error) {
    console.error(`  エラー: patient_id=${intake.patient_id}`, error);
    errors++;
  } else {
    cleaned++;
    if (cleaned % 10 === 0) {
      console.log(`  進捗: ${cleaned}/${toCleanup.length}件完了`);
    }
  }
}

console.log(`\n=== クリーンアップ完了 ===`);
console.log(`成功: ${cleaned}件`);
console.log(`エラー: ${errors}件`);
