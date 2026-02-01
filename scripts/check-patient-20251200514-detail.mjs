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

console.log("=== patient_id: 20251200514 の詳細確認 ===\n");

const patientId = "20251200514";

// 1. Intakeテーブル
const { data: intakeData } = await supabase
  .from("intake")
  .select("patient_id, reserve_id, reserved_date, reserved_time, patient_name")
  .eq("patient_id", patientId);

console.log("【Intakeテーブル】");
if (intakeData && intakeData.length > 0) {
  intakeData.forEach(i => {
    console.log(`  patient: ${i.patient_name} (${i.patient_id})`);
    console.log(`  reserve_id: ${i.reserve_id}`);
    console.log(`  日時: ${i.reserved_date} ${i.reserved_time}\n`);
  });
} else {
  console.log("  データなし\n");
}

// 2. Reservationsテーブル（全て）
const { data: reservationsData } = await supabase
  .from("reservations")
  .select("reserve_id, patient_id, reserved_date, reserved_time, status, created_at")
  .eq("patient_id", patientId)
  .order("created_at", { ascending: false });

console.log("【Reservationsテーブル】");
if (reservationsData && reservationsData.length > 0) {
  reservationsData.forEach(r => {
    const statusLabel = r.status === "canceled" ? "キャンセル" : r.status;
    console.log(`  reserve_id: ${r.reserve_id}`);
    console.log(`  日時: ${r.reserved_date} ${r.reserved_time}`);
    console.log(`  status: ${statusLabel}`);
    console.log(`  作成日時: ${r.created_at}\n`);
  });
} else {
  console.log("  データなし\n");
}

// 3. GASシート
const gasIntakeListUrl = envVars.GAS_INTAKE_LIST_URL;
const response = await fetch(gasIntakeListUrl, { method: "GET" });
const gasData = await response.json();

const patient = gasData.find(r => {
  const pid = r.patient_id || r.患者ID;
  return String(pid) === patientId;
});

console.log("【GASシート】");
if (patient) {
  console.log(`  patient_id: ${patient.patient_id}`);
  console.log(`  reserve_id: ${patient.reserve_id || patient.予約ID}`);
  console.log(`  日時: ${patient.reserved_date || patient.予約日} ${patient.reserved_time || patient.予約時間}`);
  console.log(`  status: ${patient.status || patient.ステータス}\n`);
} else {
  console.log("  データなし\n");
}

console.log("=== 確認完了 ===");
