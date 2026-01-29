// sync-5patients-reservations.mjs
// 5人の患者の予約データをreservationsテーブルに作成

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

// .env.productionから環境変数を読み込む
const envFile = readFileSync(".env.production", "utf-8");
const envVars = {};
envFile.split("\n").forEach(line => {
  const match = line.match(/^([^=]+)="?([^"]*)"?$/);
  if (match) {
    envVars[match[1]] = match[2];
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Supabase環境変数が設定されていません");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const patientIds = ["20251200832", "20251201077", "20260100025", "20260100295"];

console.log("=== 5人の患者の予約データをreservationsテーブルに同期 ===\n");

for (const pid of patientIds) {
  console.log(`患者ID: ${pid}`);

  // intakeテーブルから予約情報を取得
  const { data: intakeData, error: intakeError } = await supabase
    .from("intake")
    .select("reserve_id, reserved_date, reserved_time, patient_name, status")
    .eq("patient_id", pid)
    .single();

  if (intakeError || !intakeData) {
    console.error("  ❌ intakeデータ取得エラー:", intakeError);
    continue;
  }

  if (!intakeData.reserve_id || !intakeData.reserved_date || !intakeData.reserved_time) {
    console.log("  ⚠️  予約情報が不完全");
    continue;
  }

  console.log(`  Reserve ID: ${intakeData.reserve_id}`);
  console.log(`  予約日時: ${intakeData.reserved_date} ${intakeData.reserved_time}`);
  console.log(`  氏名: ${intakeData.patient_name}`);
  console.log(`  Status: ${intakeData.status}`);

  // reservationsテーブルに存在確認
  const { data: existingReserve } = await supabase
    .from("reservations")
    .select("reserve_id")
    .eq("reserve_id", intakeData.reserve_id)
    .single();

  if (existingReserve) {
    console.log("  ℹ️  予約レコードは既に存在します");
    continue;
  }

  // reservationsテーブルに作成
  const { error: insertError } = await supabase
    .from("reservations")
    .insert({
      reserve_id: intakeData.reserve_id,
      patient_id: pid,
      reserved_date: intakeData.reserved_date,
      reserved_time: intakeData.reserved_time,
      status: intakeData.status || "confirmed"
    });

  if (insertError) {
    console.error("  ❌ 予約作成エラー:", insertError);
  } else {
    console.log("  ✅ 予約レコード作成成功");
  }
  console.log("");
}

console.log("=== 完了 ===");
