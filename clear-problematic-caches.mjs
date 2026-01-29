// clear-problematic-caches.mjs
// problematic-patient-ids.json に記載された患者のキャッシュを一括クリア

import fs from "fs";

const VERCEL_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "secret";

console.log("=== 問題のある顧客のキャッシュを一括クリア ===\n");

// 患者IDリストを読み込み
let patientIds;
try {
  const data = fs.readFileSync("problematic-patient-ids.json", "utf8");
  patientIds = JSON.parse(data);
} catch (err) {
  console.error("❌ problematic-patient-ids.json が見つかりません");
  console.error("   先に check-all-confirmed-cache.mjs を実行してください");
  process.exit(1);
}

if (!patientIds || patientIds.length === 0) {
  console.log("✓ クリアが必要な患者IDがありません");
  process.exit(0);
}

console.log(`${patientIds.length}件の患者のキャッシュをクリアします...\n`);

const results = {
  success: [],
  failed: [],
};

for (const patientId of patientIds) {
  process.stdout.write(`Patient ${patientId}...`);

  try {
    const response = await fetch(`${VERCEL_URL}/api/admin/invalidate-cache`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${ADMIN_TOKEN}`,
      },
      body: JSON.stringify({ patient_id: patientId }),
    });

    if (response.ok) {
      results.success.push(patientId);
      console.log(" ✓");
    } else {
      results.failed.push({ patientId, error: `HTTP ${response.status}` });
      console.log(` ❌ (${response.status})`);
    }
  } catch (err) {
    results.failed.push({ patientId, error: err.message });
    console.log(` ❌ (${err.message})`);
  }

  // レート制限を避けるため少し待つ
  await new Promise(resolve => setTimeout(resolve, 100));
}

console.log("\n=== 完了 ===\n");
console.log(`✓ 成功: ${results.success.length}件`);
console.log(`❌ 失敗: ${results.failed.length}件`);

if (results.failed.length > 0) {
  console.log("\n失敗した患者ID:");
  results.failed.forEach(f => {
    console.log(`  - ${f.patientId}: ${f.error}`);
  });
}

console.log("\n数秒後に、もう一度 check-all-confirmed-cache.mjs を実行して確認してください。");
