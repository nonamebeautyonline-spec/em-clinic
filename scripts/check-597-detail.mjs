// scripts/check-597-detail.mjs
// patient_id=20260101597 の詳細データを確認（画像のカルテ）

import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

// .env.localを手動でパース
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

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check597Detail() {
  const patientId = "20260101597";

  console.log("=== Patient ID: 20260101597 詳細確認（画像のカルテ） ===\n");

  // 1. intake テーブル
  console.log("--- intake テーブル ---");
  const { data: intakes, error: intError } = await supabase
    .from("intake")
    .select("*")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });

  if (intError) {
    console.error("Error:", intError);
  } else if (!intakes || intakes.length === 0) {
    console.log("❌ No intake records found\n");
  } else {
    console.log(`Found ${intakes.length} intake record(s):\n`);
    const intake = intakes[0]; // 最新のみ表示
    console.log(`  patient_id: ${intake.patient_id}`);
    console.log(`  patient_name: ${intake.patient_name || "(null)"}`);
    console.log(`  answerer_id: ${intake.answerer_id || "(null)"}`);
    console.log(`  line_id: ${intake.line_id || "(null)"}`);
    console.log(`  sex: ${intake.sex || "(null)"}`);
    console.log(`  birthday: ${intake.birthday || "(null)"}`);
    console.log(`  tel: ${intake.tel || "(null)"}`);
    console.log(`  reserve_id: ${intake.reserve_id || "(null)"}`);
    console.log(`  reserved_date: ${intake.reserved_date || "(null)"}`);
    console.log(`  reserved_time: ${intake.reserved_time || "(null)"}`);
    console.log(`  status: ${intake.status || "(null)"}`);
    console.log(`  created_at: ${intake.created_at}`);
    console.log("");
  }

  // 2. reservations テーブル
  console.log("--- reservations テーブル ---");
  const { data: reservations, error: resError } = await supabase
    .from("reservations")
    .select("*")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });

  if (resError) {
    console.error("Error:", resError);
  } else if (!reservations || reservations.length === 0) {
    console.log("❌ No reservations found\n");
  } else {
    console.log(`Found ${reservations.length} reservation(s):\n`);
    reservations.forEach((res, i) => {
      console.log(`Reservation ${i + 1}:`);
      console.log(`  reserve_id: ${res.reserve_id}`);
      console.log(`  patient_name: ${res.patient_name || "(null)"}`);
      console.log(`  reserved_date: ${res.reserved_date || "(null)"}`);
      console.log(`  reserved_time: ${res.reserved_time || "(null)"}`);
      console.log(`  status: ${res.status}`);
      console.log(`  note: ${res.note || "(null)"}`);
      console.log(`  prescription_menu: ${res.prescription_menu || "(null)"}`);
      console.log("");
    });
  }

  // 3. GASから取得したデータと比較
  console.log("--- GAS データ確認 ---");
  const gasIntakeUrl = envVars.GAS_INTAKE_LIST_URL;

  const response = await fetch(gasIntakeUrl, {
    method: "GET",
    redirect: "follow",
  });

  if (!response.ok) {
    console.error("GAS fetch failed");
    return;
  }

  const gasData = await response.json();
  let rows;
  if (gasData.ok && Array.isArray(gasData.rows)) {
    rows = gasData.rows;
  } else if (Array.isArray(gasData)) {
    rows = gasData;
  } else {
    console.error("Invalid GAS response");
    return;
  }

  const gasRecord = rows.find(r => r.patient_id === patientId);

  if (!gasRecord) {
    console.log("❌ No record found in GAS\n");
  } else {
    console.log("✅ Found in GAS:");
    console.log(`  patient_id: ${gasRecord.patient_id}`);
    console.log(`  name: ${gasRecord.name || "(empty)"}`);
    console.log(`  answerer_id: ${gasRecord.answerer_id || "(empty)"}`);
    console.log(`  line_id: ${gasRecord.line_id || "(empty)"}`);
    console.log(`  sex: ${gasRecord.sex || "(empty)"}`);
    console.log(`  birthday: ${gasRecord.birthday || "(empty)"}`);
    console.log(`  tel: ${gasRecord.tel || "(empty)"}`);
    console.log(`  reserve_id: ${gasRecord.reserve_id || "(empty)"}`);
    console.log(`  reserved_date: ${gasRecord.reserved_date || "(empty)"}`);
    console.log(`  status: ${gasRecord.status || "(empty)"}`);
    console.log("");
  }
}

check597Detail();
