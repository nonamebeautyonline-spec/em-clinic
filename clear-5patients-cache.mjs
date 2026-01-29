// clear-5patients-cache.mjs
// 5人の患者のキャッシュをクリア

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

const vercelUrl = envVars.APP_BASE_URL;
const adminToken = envVars.ADMIN_TOKEN;

if (!vercelUrl || !adminToken) {
  console.error("❌ Vercel環境変数が設定されていません");
  process.exit(1);
}

const patientIds = ["20251200832", "20251201077", "20260100025", "20260100295"];

console.log("=== 5人の患者のキャッシュをクリア ===\n");

for (const patientId of patientIds) {
  console.log(`患者ID: ${patientId}`);

  try {
    const response = await fetch(`${vercelUrl}/api/admin/invalidate-cache`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminToken}`
      },
      body: JSON.stringify({ patient_id: patientId })
    });

    if (response.ok) {
      const result = await response.json();
      console.log(`  ✅ キャッシュクリア成功:`, result);
    } else {
      console.log(`  ❌ キャッシュクリア失敗: ${response.status}`);
    }
  } catch (e) {
    console.log(`  ❌ エラー: ${e.message}`);
  }
}

console.log("\n=== 完了 ===");
