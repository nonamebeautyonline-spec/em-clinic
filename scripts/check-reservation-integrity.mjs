// scripts/check-reservation-integrity.mjs
// 予約データの整合性チェック（定期実行推奨）

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

console.log("=== 予約データ整合性チェック ===\n");

// 今日〜1週間後の予約を対象
const today = new Date();
const nextWeek = new Date(today);
nextWeek.setDate(today.getDate() + 7);

const dateFrom = today.toISOString().slice(0, 10);
const dateTo = nextWeek.toISOString().slice(0, 10);

console.log(`対象期間: ${dateFrom} 〜 ${dateTo}\n`);

// 1. intakeテーブルから予約を持つレコードを取得
const { data: intakeRecords } = await supabase
  .from("intake")
  .select("patient_id, reserve_id, reserved_date, reserved_time, patient_name")
  .gte("reserved_date", dateFrom)
  .lte("reserved_date", dateTo)
  .not("reserve_id", "is", null);

console.log(`Intakeテーブルの予約: ${intakeRecords.length}件\n`);

let issues = 0;

for (const intake of intakeRecords) {
  // 対応するreservationsレコードを取得
  const { data: reservation } = await supabase
    .from("reservations")
    .select("reserve_id, reserved_date, reserved_time, status")
    .eq("reserve_id", intake.reserve_id)
    .single();

  if (!reservation) {
    console.log(`❌ 問題: intakeにあってreservationsにない`);
    console.log(`   patient_id: ${intake.patient_id}`);
    console.log(`   reserve_id: ${intake.reserve_id}`);
    console.log(`   intake日時: ${intake.reserved_date} ${intake.reserved_time}`);
    console.log();
    issues++;
    continue;
  }

  // キャンセル済みの予約
  if (reservation.status === "canceled") {
    console.log(`❌ 問題: キャンセル済み予約がintakeに残っている`);
    console.log(`   patient: ${intake.patient_name} (${intake.patient_id})`);
    console.log(`   reserve_id: ${intake.reserve_id}`);
    console.log(`   intake日時: ${intake.reserved_date} ${intake.reserved_time}`);
    console.log();
    issues++;
    continue;
  }

  // 日時の不一致チェック
  if (reservation.reserved_date !== intake.reserved_date ||
      reservation.reserved_time !== intake.reserved_time) {
    console.log(`❌ 問題: 日時が不一致`);
    console.log(`   patient: ${intake.patient_name} (${intake.patient_id})`);
    console.log(`   reserve_id: ${intake.reserve_id}`);
    console.log(`   Reservations: ${reservation.reserved_date} ${reservation.reserved_time}`);
    console.log(`   Intake:       ${intake.reserved_date} ${intake.reserved_time}`);
    console.log();
    issues++;
  }
}

console.log(`\n=== チェック完了 ===`);
console.log(`問題件数: ${issues}件`);

if (issues === 0) {
  console.log("✓ 整合性チェック正常終了");
} else {
  console.log("⚠️  問題が見つかりました。手動で修正が必要です。");
}
