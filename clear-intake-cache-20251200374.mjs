// clear-intake-cache-20251200374.mjs
// intake GAS のキャッシュをクリア

import { readFileSync } from "fs";

const envFile = readFileSync(".env.production", "utf-8");
const envVars = {};
envFile.split("\n").forEach(line => {
  const match = line.match(/^([^=]+)="?([^"]*)"?$/);
  if (match) {
    envVars[match[1]] = match[2];
  }
});

const intakeGasUrl = envVars.GAS_MYPAGE_URL;

const patientId = "20251200374";

console.log("=== intake GAS のキャッシュをクリア ===\n");
console.log("患者ID:", patientId);
console.log("Intake GAS URL:", intakeGasUrl);
console.log("");

try {
  const response = await fetch(intakeGasUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      type: "invalidate_cache",
      patient_id: patientId
    })
  });

  console.log("Status:", response.status);
  const result = await response.json();
  console.log("Response:", JSON.stringify(result, null, 2));
} catch (e) {
  console.error("❌ エラー:", e.message);
}

console.log("\n=== 完了 ===");
