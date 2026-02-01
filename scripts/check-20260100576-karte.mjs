// scripts/check-20260100576-karte.mjs
// 20260100576がカルテに表示されない原因を調査

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
const gasIntakeUrl = envVars.GAS_INTAKE_LIST_URL;

const patientId = "20260100576";

async function checkKarte() {
  console.log("=== 20260100576のカルテ表示確認 ===\n");

  // 1. Supabase intakeテーブル
  console.log("【1. Supabase intakeテーブル】");
  const { data: intake } = await supabase
    .from("intake")
    .select("*")
    .eq("patient_id", patientId)
    .maybeSingle();

  if (intake) {
    console.log(`  patient_id: ${intake.patient_id}`);
    console.log(`  patient_name: ${intake.patient_name || 'NULL ⚠️'}`);
    console.log(`  reserve_id: ${intake.reserve_id || 'NULL ⚠️'}`);
    console.log(`  reserved_date: ${intake.reserved_date || 'NULL ⚠️'}`);
    console.log(`  reserved_time: ${intake.reserved_time || 'NULL ⚠️'}`);
    console.log(`  created_at: ${intake.created_at}`);
  } else {
    console.log(`  ❌ データなし`);
  }

  // 2. Supabase reservationsテーブル
  console.log(`\n【2. Supabase reservationsテーブル】`);
  const { data: reservations } = await supabase
    .from("reservations")
    .select("reserve_id, reserved_date, reserved_time, status, created_at")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });

  if (reservations && reservations.length > 0) {
    console.log(`  総予約数: ${reservations.length} 件`);
    reservations.forEach((r, idx) => {
      const label = idx === 0 ? '[最新]' : `  ${idx + 1}  `;
      console.log(`  ${label} ${r.reserve_id}`);
      console.log(`       date: ${r.reserved_date}, time: ${r.reserved_time}, status: ${r.status}`);
    });
  } else {
    console.log(`  ❌ 予約なし`);
  }

  // 3. Supabase answerersテーブル
  console.log(`\n【3. Supabase answerersテーブル】`);
  const { data: answerer } = await supabase
    .from("answerers")
    .select("patient_id, name, name_kana, sex, birthday, tel")
    .eq("patient_id", patientId)
    .maybeSingle();

  if (answerer) {
    console.log(`  patient_id: ${answerer.patient_id}`);
    console.log(`  name: ${answerer.name || 'NULL ⚠️'}`);
    console.log(`  name_kana: ${answerer.name_kana || 'NULL ⚠️'}`);
    console.log(`  sex: ${answerer.sex || 'NULL ⚠️'}`);
    console.log(`  birthday: ${answerer.birthday || 'NULL ⚠️'}`);
    console.log(`  tel: ${answerer.tel || 'NULL ⚠️'}`);
  } else {
    console.log(`  ❌ データなし`);
  }

  // 4. GAS問診シート
  console.log(`\n【4. GAS問診シート】`);
  const gasResponse = await fetch(gasIntakeUrl, { method: "GET", redirect: "follow" });

  if (!gasResponse.ok) {
    console.error(`  ❌ GAS API Error: ${gasResponse.status}`);
  } else {
    const gasData = await gasResponse.json();
    let gasRows = gasData.ok && Array.isArray(gasData.rows) ? gasData.rows : gasData;

    const gasRecord = gasRows.find(r => String(r.patient_id || "").trim() === patientId);

    if (gasRecord) {
      console.log(`  ✅ GASにデータあり`);
      console.log(`  patient_id: ${gasRecord.patient_id}`);
      console.log(`  name: ${gasRecord.name || 'なし'}`);
      console.log(`  reserve_id: ${gasRecord.reserved || gasRecord.reserve_id || 'なし'}`);
      console.log(`  reserved_date: ${gasRecord.reserved_date || 'なし'}`);
      console.log(`  reserved_time: ${gasRecord.reserved_time || 'なし'}`);
      console.log(`  status: ${gasRecord.status || 'なし'}`);
    } else {
      console.log(`  ❌ GASにデータなし`);
    }
  }

  // 5. カルテ表示に必要な条件チェック
  console.log(`\n【5. カルテ表示条件チェック】`);
  const issues = [];

  if (!intake) {
    issues.push("❌ intakeテーブルにデータがない");
  } else {
    if (!intake.patient_name) issues.push("⚠️ patient_nameがNULL");
    if (!intake.reserve_id) issues.push("⚠️ reserve_idがNULL");
    if (!intake.reserved_date) issues.push("⚠️ reserved_dateがNULL");
  }

  if (!reservations || reservations.length === 0) {
    issues.push("❌ reservationsテーブルにデータがない");
  } else {
    const pendingReservation = reservations.find(r => r.status === 'pending');
    if (!pendingReservation) {
      issues.push("⚠️ pending状態の予約がない");
    }
  }

  if (!answerer) {
    issues.push("⚠️ answerersテーブルにデータがない（問診マスター未登録）");
  }

  if (issues.length > 0) {
    console.log(`  問題点:`);
    issues.forEach(issue => console.log(`    ${issue}`));
  } else {
    console.log(`  ✅ すべての条件を満たしている`);
  }

  console.log(`\n【結論】`);
  if (issues.length > 0) {
    console.log(`  カルテに表示されない可能性が高い原因:`);
    console.log(`  ${issues[0]}`);
  } else {
    console.log(`  データは正常。カルテ表示ロジックに問題がある可能性。`);
  }
}

checkKarte();
