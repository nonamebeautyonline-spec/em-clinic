// intakeテーブルの予約情報を修正（GAS問診シートと同期）
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

console.log("=== intakeテーブルの予約情報修正 (2026-01-30) ===\n");

// 1. 20260100211: reserve_idと日時を設定
console.log("【1. 20260100211: 予約情報を設定】");
const update1 = {
  reserve_id: "resv-1769729904218",
  reserved_date: "2026-01-30",
  reserved_time: "15:15",
  updated_at: new Date().toISOString()
};

const { error: error1 } = await supabase
  .from("intake")
  .update(update1)
  .eq("patient_id", "20260100211");

if (error1) {
  console.error(`❌ 20260100211: ${error1.message}`);
} else {
  console.log(`✅ 20260100211: reserve_id=${update1.reserve_id}, time=${update1.reserved_time}`);
}

// 2. 20260101576: reserve_idと時刻を修正（17:15に）
console.log("\n【2. 20260101576: 予約情報を修正】");
const update2 = {
  reserve_id: "resv-1769700681889",
  reserved_date: "2026-01-30",
  reserved_time: "17:15",
  updated_at: new Date().toISOString()
};

const { error: error2 } = await supabase
  .from("intake")
  .update(update2)
  .eq("patient_id", "20260101576");

if (error2) {
  console.error(`❌ 20260101576: ${error2.message}`);
} else {
  console.log(`✅ 20260101576: reserve_id=${update2.reserve_id}, time=${update2.reserved_time}`);
}

// 3. 20260101632: 予約情報をクリア（キャンセル済み）
console.log("\n【3. 20260101632: 予約情報をクリア（キャンセル済み）】");
const update3 = {
  reserve_id: null,
  reserved_date: null,
  reserved_time: null,
  updated_at: new Date().toISOString()
};

const { error: error3 } = await supabase
  .from("intake")
  .update(update3)
  .eq("patient_id", "20260101632");

if (error3) {
  console.error(`❌ 20260101632: ${error3.message}`);
} else {
  console.log(`✅ 20260101632: 予約情報クリア完了`);
}

// 4. 確認
console.log("\n【4. 修正後の確認】");

for (const patientId of ["20260100211", "20260101576", "20260101632"]) {
  const { data, error } = await supabase
    .from("intake")
    .select("patient_id, reserve_id, reserved_date, reserved_time, status")
    .eq("patient_id", patientId)
    .single();

  if (error) {
    console.error(`❌ ${patientId}: ${error.message}`);
  } else {
    console.log(`${patientId}:`);
    console.log(`  reserve_id: ${data.reserve_id || "null"}`);
    console.log(`  reserved_date: ${data.reserved_date || "null"}`);
    console.log(`  reserved_time: ${data.reserved_time || "null"}`);
    console.log(`  status: ${data.status || "null"}`);
  }
}

console.log("\n=== 修正完了 ===");
console.log("\n次のステップ:");
console.log("1. カルテページ (/doctor) をリロード");
console.log("2. 20260100211, 20260101576 が表示されることを確認");
console.log("3. 各患者カードでOK/NGをクリック");
console.log("4. statusが更新され、カルテから消えることを確認");
