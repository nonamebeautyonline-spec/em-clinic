// scripts/cleanup-test-data.mjs
// TEST_FLOW_ で始まるテストデータを全て削除

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

console.log("=== テストデータクリーンアップ ===\n");

async function cleanup() {
  // ========================================
  // 1. Supabase intake テーブル
  // ========================================
  console.log("【1】Supabase intake テーブル");

  const { data: intakeRecords, error: intakeSelectError } = await supabase
    .from("intake")
    .select("patient_id, patient_name, created_at")
    .like("patient_id", "TEST_%");

  if (intakeSelectError) {
    console.log(`  ❌ 取得エラー: ${intakeSelectError.message}\n`);
  } else if (!intakeRecords || intakeRecords.length === 0) {
    console.log("  ✅ 削除対象なし\n");
  } else {
    console.log(`  📋 削除対象: ${intakeRecords.length}件`);
    intakeRecords.forEach((r, idx) => {
      console.log(`      [${idx + 1}] ${r.patient_id} (${r.patient_name || "名前なし"})`);
    });

    const { error: intakeDeleteError } = await supabase
      .from("intake")
      .delete()
      .like("patient_id", "TEST_%");

    if (intakeDeleteError) {
      console.log(`  ❌ 削除エラー: ${intakeDeleteError.message}\n`);
    } else {
      console.log(`  ✅ ${intakeRecords.length}件削除完了\n`);
    }
  }

  // ========================================
  // 2. Supabase answerers テーブル
  // ========================================
  console.log("【2】Supabase answerers テーブル");

  const { data: answererRecords, error: answererSelectError } = await supabase
    .from("answerers")
    .select("patient_id, name")
    .like("patient_id", "TEST_%");

  if (answererSelectError) {
    console.log(`  ❌ 取得エラー: ${answererSelectError.message}\n`);
  } else if (!answererRecords || answererRecords.length === 0) {
    console.log("  ✅ 削除対象なし\n");
  } else {
    console.log(`  📋 削除対象: ${answererRecords.length}件`);

    const { error: answererDeleteError } = await supabase
      .from("answerers")
      .delete()
      .like("patient_id", "TEST_%");

    if (answererDeleteError) {
      console.log(`  ❌ 削除エラー: ${answererDeleteError.message}\n`);
    } else {
      console.log(`  ✅ ${answererRecords.length}件削除完了\n`);
    }
  }

  // ========================================
  // 3. Supabase reservations テーブル
  // ========================================
  console.log("【3】Supabase reservations テーブル");

  const { data: reservationRecords, error: reservationSelectError } = await supabase
    .from("reservations")
    .select("patient_id, reserve_id, reserved_date, reserved_time")
    .like("patient_id", "TEST_%");

  if (reservationSelectError) {
    console.log(`  ❌ 取得エラー: ${reservationSelectError.message}\n`);
  } else if (!reservationRecords || reservationRecords.length === 0) {
    console.log("  ✅ 削除対象なし\n");
  } else {
    console.log(`  📋 削除対象: ${reservationRecords.length}件`);
    reservationRecords.forEach((r, idx) => {
      console.log(`      [${idx + 1}] ${r.patient_id}: ${r.reserved_date} ${r.reserved_time}`);
    });

    const { error: reservationDeleteError } = await supabase
      .from("reservations")
      .delete()
      .like("patient_id", "TEST_%");

    if (reservationDeleteError) {
      console.log(`  ❌ 削除エラー: ${reservationDeleteError.message}\n`);
    } else {
      console.log(`  ✅ ${reservationRecords.length}件削除完了\n`);
    }
  }

  // ========================================
  // 4. GASシートからも削除（API経由）
  // ========================================
  console.log("【4】GASシートからの削除");
  console.log("  ⚠️ GAS側には削除APIが実装されていないため、手動で削除してください");
  console.log("  削除対象:");
  console.log("    - 問診シート: patient_id が TEST_ で始まる行");
  console.log("    - 予約シート: patient_id が TEST_ で始まる行");
  console.log("    - 問診マスターシート: patient_id が TEST_ で始まる行\n");

  console.log("=== クリーンアップ完了 ===");
}

cleanup();
