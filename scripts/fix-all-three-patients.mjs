// 3名の患者の予約情報を修正（GASシート＋DB）
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

const gasIntakeUrl = envVars.GAS_INTAKE_URL;
const adminToken = envVars.ADMIN_TOKEN;

console.log("=== 3名の患者の予約情報修正 ===\n");

const patients = [
  {
    patient_id: "20260100211",
    reserve_id: "resv-1769729904218",
    reserved_date: "2026-01-30",
    reserved_time: "15:15"
  },
  {
    patient_id: "20260101576",
    reserve_id: "resv-1769700681889",
    reserved_date: "2026-01-30",
    reserved_time: "17:15"
  },
  {
    patient_id: "20260101632",
    reserve_id: "resv-1769749065463",
    reserved_date: "2026-01-30",
    reserved_time: "14:30"
  }
];

// 1. reservationsテーブルで必要な予約をpendingに設定
console.log("【1. reservationsテーブルを更新】");
for (const p of patients) {
  const { error } = await supabase
    .from("reservations")
    .update({
      status: "pending",
      reserved_date: p.reserved_date,
      reserved_time: p.reserved_time,
      updated_at: new Date().toISOString()
    })
    .eq("reserve_id", p.reserve_id);

  if (error) {
    console.error(`❌ ${p.patient_id}: ${error.message}`);
  } else {
    console.log(`✅ ${p.patient_id}: reservations updated (${p.reserved_time})`);
  }
}

// 2. intakeテーブルを更新
console.log("\n【2. intakeテーブルを更新】");
for (const p of patients) {
  const { error } = await supabase
    .from("intake")
    .update({
      reserve_id: p.reserve_id,
      reserved_date: p.reserved_date,
      reserved_time: p.reserved_time,
      updated_at: new Date().toISOString()
    })
    .eq("patient_id", p.patient_id);

  if (error) {
    console.error(`❌ ${p.patient_id}: ${error.message}`);
  } else {
    console.log(`✅ ${p.patient_id}: intake updated`);
  }
}

// 3. GAS問診シートを更新（doctor_update API経由）
console.log("\n【3. GAS問診シートを更新】");
for (const p of patients) {
  try {
    const response = await fetch(gasIntakeUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "update_reservation_info",
        token: adminToken,
        patient_id: p.patient_id,
        reserve_id: p.reserve_id,
        reserved_date: p.reserved_date,
        reserved_time: p.reserved_time
      })
    });

    const result = await response.json();

    if (result.ok || response.ok) {
      console.log(`✅ ${p.patient_id}: GAS sheet updated`);
    } else {
      console.log(`⚠️ ${p.patient_id}: GAS update may have failed - ${result.error || "unknown"}`);
      console.log(`   (GASにこのAPI typeがない可能性があります。手動で確認してください)`);
    }
  } catch (e) {
    console.error(`❌ ${p.patient_id}: GAS update error - ${e.message}`);
  }
}

// 4. 確認
console.log("\n【4. 修正後の確認】");

// DB確認
for (const p of patients) {
  const { data: intake } = await supabase
    .from("intake")
    .select("patient_id, reserve_id, reserved_date, reserved_time, status")
    .eq("patient_id", p.patient_id)
    .single();

  console.log(`\n${p.patient_id}:`);
  console.log(`  DB reserve_id: ${intake?.reserve_id || "null"}`);
  console.log(`  DB reserved_date: ${intake?.reserved_date || "null"}`);
  console.log(`  DB reserved_time: ${intake?.reserved_time || "null"}`);
  console.log(`  DB status: ${intake?.status || "null"}`);
}

// GAS確認
console.log("\n\n【GAS問診シート確認】");
try {
  const gasListUrl = envVars.GAS_INTAKE_LIST_URL;
  const response = await fetch(gasListUrl);
  const allData = await response.json();

  for (const p of patients) {
    const found = allData.find(row => {
      const pid = String(row.patient_id || row.PatientID || "").trim();
      return pid === p.patient_id;
    });

    if (found) {
      console.log(`\n${p.patient_id}:`);
      console.log(`  GAS reserve_id: ${found.reserveId || found.reserve_id || "null"}`);
      console.log(`  GAS reserved_date: ${found.reserved_date || "null"}`);
      console.log(`  GAS reserved_time: ${found.reserved_time || "null"}`);
      console.log(`  GAS status: ${found.status || "null"}`);
    } else {
      console.log(`\n${p.patient_id}: GAS問診シートに見つかりません`);
    }
  }
} catch (e) {
  console.error("GAS確認エラー:", e.message);
}

console.log("\n\n=== 修正完了 ===");
console.log("\n次のステップ:");
console.log("1. カルテページ (/doctor) をリロード");
console.log("2. 3名の患者が表示されることを確認");
console.log("3. 各患者でOK/NGをクリックして、statusが更新されることを確認");
