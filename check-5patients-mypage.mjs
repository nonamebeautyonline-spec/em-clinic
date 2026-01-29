// check-5patients-mypage.mjs
// 5人の患者のマイページデータを確認

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
const gasIntakeUrl = envVars.GAS_INTAKE_URL;

if (!supabaseUrl || !supabaseKey || !gasIntakeUrl) {
  console.error("❌ 環境変数が設定されていません");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const patientIds = ["20251200832", "20251201077", "20260100025", "20260100295"];

console.log("=== 5人の患者のマイページデータ確認 ===\n");

for (const pid of patientIds) {
  console.log(`\n========== 患者ID: ${pid} ==========`);

  // 1. Supabase intakeテーブル確認
  const { data: intakeData, error: intakeError } = await supabase
    .from("intake")
    .select("*")
    .eq("patient_id", pid);

  if (intakeError) {
    console.error("❌ intakeテーブルエラー:", intakeError);
    continue;
  }

  if (intakeData.length === 0) {
    console.log("⚠️  問診データなし");
  } else {
    const intake = intakeData[0];
    console.log("✅ 問診データあり");
    console.log("   氏名:", intake.patient_name || "(なし)");
    console.log("   Reserve ID:", intake.reserve_id || "(なし)");
    console.log("   Reserved Date:", intake.reserved_date || "(なし)");
    console.log("   Reserved Time:", intake.reserved_time || "(なし)");
    console.log("   Status:", intake.status || "(なし)");
  }

  // 2. Supabase reservationsテーブル確認
  const { data: reserveData, error: reserveError } = await supabase
    .from("reservations")
    .select("*")
    .eq("patient_id", pid)
    .order("reserved_date", { ascending: false });

  if (reserveError) {
    console.error("❌ reservationsテーブルエラー:", reserveError);
  } else if (reserveData.length === 0) {
    console.log("⚠️  予約データなし");
  } else {
    console.log(`✅ 予約データ: ${reserveData.length}件`);
    for (const r of reserveData.slice(0, 3)) {
      console.log(`   - ${r.reserved_date} ${r.reserved_time} (ID: ${r.reserve_id}, Status: ${r.status || "なし"})`);
    }
  }

  // 3. GASのダッシュボードAPI確認
  try {
    const gasUrl = gasIntakeUrl + "?type=getDashboard&patient_id=" + pid + "&full=1";
    const response = await fetch(gasUrl);
    const dashboard = await response.json();

    console.log("\n【GASダッシュボード】");
    console.log("   問診あり:", dashboard.hasIntake);
    console.log("   次回予約:", dashboard.nextReservation ? `${dashboard.nextReservation.date} ${dashboard.nextReservation.time}` : "(なし)");
    console.log("   初回診察:", dashboard.history && dashboard.history.length > 0 ? "あり" : "なし");

    if (dashboard.history && dashboard.history.length > 0) {
      console.log("   診察履歴:");
      for (const h of dashboard.history.slice(0, 3)) {
        console.log(`     - ${h.date} ${h.status} (${h.menu || ""})`);
      }
    }
  } catch (e) {
    console.error("❌ GASエラー:", e.message);
  }
}

console.log("\n=== 完了 ===");
