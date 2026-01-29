// clear-20251200374-cache.mjs
// 患者20251200374のキャッシュをクリアして原因調査

import { readFileSync } from "fs";

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
const reorderGasUrl = envVars.GAS_REORDER_URL;

const patientId = "20251200133";

console.log("=== 患者20251200133のキャッシュクリア & 原因調査 ===\n");
console.log("患者ID:", patientId);
console.log("Vercel URL:", vercelUrl);
console.log("GAS URL:", reorderGasUrl);
console.log("");

// 1. Vercel Redis キャッシュクリア
console.log("[1] Vercel キャッシュクリア実行中...");
try {
  const response = await fetch(`${vercelUrl}/api/admin/invalidate-cache`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${adminToken}`
    },
    body: JSON.stringify({ patient_id: patientId })
  });

  console.log("  Status:", response.status);
  const result = await response.json();
  console.log("  Response:", JSON.stringify(result, null, 2));
} catch (e) {
  console.error("  ❌ エラー:", e.message);
}

console.log("");

// 2. GAS Script Cache クリア（debug actionを使う）
console.log("[2] GAS Script Cache クリア実行中...");
try {
  const response = await fetch(reorderGasUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      action: "debug",
      patient_id: patientId
    })
  });

  console.log("  Status:", response.status);
  const result = await response.json();
  console.log("  Response:", JSON.stringify(result, null, 2));
} catch (e) {
  console.error("  ❌ エラー:", e.message);
}

console.log("");

// 3. 再度GASからデータ取得して確認
console.log("[3] GASから再処方データ取得（キャッシュクリア後）...");
try {
  const response = await fetch(reorderGasUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      action: "list",
      patient_id: patientId
    })
  });

  const result = await response.json();
  console.log("  Response:", JSON.stringify(result, null, 2));
} catch (e) {
  console.error("  ❌ エラー:", e.message);
}

console.log("\n=== 完了 ===");
