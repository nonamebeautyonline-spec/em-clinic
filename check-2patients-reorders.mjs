// check-2patients-reorders.mjs
// 2人の患者の再処方データを確認（GASシートから直接）

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

const reorderGasUrl = envVars.GAS_REORDER_URL;

if (!reorderGasUrl) {
  console.error("❌ GAS_REORDER_URL環境変数が設定されていません");
  process.exit(1);
}

const patientIds = ["20251200374", "20260100015"];

console.log("=== 2人の患者の再処方データ確認（GAS） ===\n");

for (const pid of patientIds) {
  console.log(`\n========== 患者ID: ${pid} ==========`);

  try {
    const response = await fetch(reorderGasUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        action: "debug",
        patient_id: pid
      })
    });

    const result = await response.json();

    if (result.ok) {
      console.log(`✅ 再処方データ: ${result.count}件`);

      for (const r of result.reorders) {
        console.log(`\n   Row: ${r.row}`);
        console.log(`   Status: ${r.status}`);
        console.log(`   Product Code: ${r.product_code}`);
        console.log(`   Timestamp: ${r.timestamp}`);
        console.log(`   Note: ${r.note || "(なし)"}`);
      }
    } else {
      console.log(`  ⚠️  エラー:`, result);
    }
  } catch (e) {
    console.log(`  ❌ エラー: ${e.message}`);
  }
}

console.log("\n=== 完了 ===");
