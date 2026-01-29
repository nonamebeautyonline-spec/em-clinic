// scripts/create-missing-from-reservations.mjs
// reservationsにしかない患者のanswersersとintakeを作成

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

async function createMissingFromReservations() {
  console.log("=== reservationsにしかない患者を作成 ===\n");

  const missingPatients = [
    "20260101430",
    "20260100253",
    "20260101355",
    "20260101457",
    "20260101538",
    "20260101580"
  ];

  for (const patientId of missingPatients) {
    console.log(`--- patient_id: ${patientId} ---`);

    // reservationsから情報を取得
    const { data: reservation } = await supabase
      .from("reservations")
      .select("*")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!reservation) {
      console.log(`  ❌ reservationsにもデータなし - スキップ\n`);
      continue;
    }

    console.log(`  reservationsから取得: ${reservation.patient_name} (${reservation.reserved_date})`);

    // answersersテーブルに作成
    const { error: answererError } = await supabase
      .from("answerers")
      .insert({
        patient_id: patientId,
        answerer_id: null,
        line_id: null,
        name: reservation.patient_name,
        name_kana: null,
        sex: null,
        birthday: null,
        tel: null,
      });

    if (answererError) {
      console.log(`  ⚠️ answerers作成:`, answererError.message);
    } else {
      console.log(`  ✅ answerers作成成功`);
    }

    // intakeテーブルに作成
    const { error: intakeError } = await supabase
      .from("intake")
      .insert({
        patient_id: patientId,
        patient_name: reservation.patient_name,
        answerer_id: null,
        line_id: null,
        reserve_id: reservation.reserve_id,
        reserved_date: reservation.reserved_date,
        reserved_time: reservation.reserved_time,
        status: reservation.status,
        note: reservation.note,
        prescription_menu: reservation.prescription_menu,
        answers: {
          name: reservation.patient_name,
          Patient_ID: patientId,
        },
      });

    if (intakeError) {
      console.log(`  ⚠️ intake作成:`, intakeError.message);
    } else {
      console.log(`  ✅ intake作成成功`);
    }

    console.log("");
  }

  console.log("=== 完了 ===");
}

createMissingFromReservations();
