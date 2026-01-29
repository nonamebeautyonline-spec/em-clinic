// clear-5patients-gas-cache.mjs
// 5人の患者のGASキャッシュ（reorders）をクリア

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

const gasIntakeUrl = envVars.GAS_INTAKE_URL;
const adminToken = envVars.ADMIN_TOKEN;

if (!gasIntakeUrl || !adminToken) {
  console.error("❌ 環境変数が設定されていません");
  process.exit(1);
}

const patientIds = ["20251200832", "20251201077", "20260100025", "20260100295"];

console.log("=== 5人の患者のGASキャッシュ（reorders）をクリア ===\n");

for (const patientId of patientIds) {
  console.log(`患者ID: ${patientId}`);

  try {
    const response = await fetch(gasIntakeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        type: "invalidate_cache",
        patient_id: patientId
      })
    });

    const result = await response.json();
    if (result.ok) {
      console.log(`  ✅ GASキャッシュクリア成功`);
    } else {
      console.log(`  ⚠️  レスポンス:`, result);
    }
  } catch (e) {
    console.log(`  ❌ エラー: ${e.message}`);
  }
}

console.log("\n=== 完了 ===");
