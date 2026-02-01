// scripts/check-cleaned-patients-detail.mjs
// 重複削除した患者のreservationsとintakeの詳細確認

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

async function checkDetails() {
  console.log("=== 重複削除した患者の詳細確認 ===\n");

  const patients = [
    '20260101586',
    '20260101381',
    '20260100132',
    '20260100576'
  ];

  for (const patientId of patients) {
    console.log(`\n========================================`);
    console.log(`patient_id: ${patientId}`);
    console.log(`========================================`);

    // reservationsテーブル
    const { data: reservations } = await supabase
      .from("reservations")
      .select("reserve_id, reserved_date, reserved_time, status, created_at")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false });

    console.log(`\n【reservationsテーブル】`);
    if (reservations && reservations.length > 0) {
      reservations.forEach((r, idx) => {
        const label = idx === 0 ? '[最新]' : `  ${idx + 1}  `;
        console.log(`${label} ${r.reserve_id}`);
        console.log(`      date: ${r.reserved_date}, time: ${r.reserved_time || 'NULL ⚠️'}, status: ${r.status || 'null'}`);
      });
    } else {
      console.log(`  ❌ データなし`);
    }

    // intakeテーブル
    const { data: intake } = await supabase
      .from("intake")
      .select("reserve_id, reserved_date, reserved_time, patient_name")
      .eq("patient_id", patientId)
      .maybeSingle();

    console.log(`\n【intakeテーブル】`);
    if (intake) {
      console.log(`  reserve_id: ${intake.reserve_id || 'NULL ⚠️'}`);
      console.log(`  reserved_date: ${intake.reserved_date || 'NULL ⚠️'}`);
      console.log(`  reserved_time: ${intake.reserved_time || 'NULL ⚠️'}`);
      console.log(`  patient_name: ${intake.patient_name || 'NULL ⚠️'}`);
    } else {
      console.log(`  ❌ データなし`);
    }

    // 不一致チェック
    if (reservations && reservations.length > 0 && intake) {
      const activeReservation = reservations.find(r => r.status === 'pending');
      if (activeReservation) {
        const issues = [];

        if (intake.reserve_id !== activeReservation.reserve_id) {
          issues.push(`reserve_id不一致: intake=${intake.reserve_id}, reservations=${activeReservation.reserve_id}`);
        }

        if (intake.reserved_date !== activeReservation.reserved_date) {
          issues.push(`reserved_date不一致: intake=${intake.reserved_date}, reservations=${activeReservation.reserved_date}`);
        }

        if (intake.reserved_time !== activeReservation.reserved_time) {
          issues.push(`reserved_time不一致: intake=${intake.reserved_time}, reservations=${activeReservation.reserved_time}`);
        }

        if (issues.length > 0) {
          console.log(`\n【⚠️ 不一致検出】`);
          issues.forEach(issue => console.log(`  - ${issue}`));
        }
      }
    }
  }

  console.log(`\n\n=== 確認完了 ===`);
}

checkDetails();
