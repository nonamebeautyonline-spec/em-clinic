// scripts/check-patient-intake-in-gas.mjs
// GAS DashboardからAPIから特定のpatient_idのデータを確認

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

const gasMypageUrl = envVars.GAS_MYPAGE_URL;
const adminToken = envVars.ADMIN_TOKEN;
const patientId = "20260100211";

async function checkGasDashboard() {
  console.log(`=== GAS Dashboard patient_id: ${patientId} の確認 ===\n`);

  // getDashboard APIで全データを取得（GETパラメータ使用）
  const url = `${gasMypageUrl}?type=getDashboard&patient_id=${encodeURIComponent(patientId)}&token=${encodeURIComponent(adminToken)}&full=1`;

  const response = await fetch(url, {
    method: "GET",
  });

  const status = response.status;
  const text = await response.text();

  console.log(`Response status: ${status}`);
  console.log(`Response text length: ${text.length}`);
  console.log();

  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    console.log("❌ JSONパースエラー");
    console.log("Response text:", text.substring(0, 500));
    return;
  }

  console.log("データ:");
  console.log(JSON.stringify(data, null, 2).substring(0, 1000));
  console.log();

  if (!data.ok && !data.intake && !data.patient) {
    console.log("❌ エラー:", data.error || "不明");
    return;
  }

  // 問診データを確認
  if (data.intake) {
    console.log("✅ GASに問診データが存在します:");
    console.log(JSON.stringify(data.intake, null, 2));
    console.log();
    console.log("結論: 問診データはGASにある → Supabaseに同期されていない");
  } else {
    console.log("❌ GASに問診データが存在しません（data.intake が null）");
  }

  // 予約データを確認
  if (data.nextReservation) {
    console.log("\n✅ 次回予約:");
    console.log(JSON.stringify(data.nextReservation, null, 2));
  }
}

checkGasDashboard();
