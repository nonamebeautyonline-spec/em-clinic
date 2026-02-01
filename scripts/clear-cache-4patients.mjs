// scripts/clear-cache-4patients.mjs
// 直近4人のキャッシュをクリア

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

const adminToken = envVars.ADMIN_TOKEN;
const productionUrl = "https://app.noname-beauty.jp";
const targetPatients = ["20251200228", "20260101580", "20260101559", "20260101613"];

async function clearCacheForAll() {
  console.log("=== キャッシュクリア（直近4人） ===\n");

  for (const patientId of targetPatients) {
    console.log(`【patient_id: ${patientId}】`);

    const url = `${productionUrl}/api/admin/invalidate-cache`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${adminToken}`
        },
        body: JSON.stringify({ patient_id: patientId })
      });

      const status = response.status;
      const text = await response.text();

      if (status >= 200 && status < 300) {
        console.log(`  ✅ キャッシュクリア成功`);
        const json = JSON.parse(text);
        if (json.deleted) {
          console.log(`  削除されたキー: ${json.deleted.join(", ")}`);
        }
      } else {
        console.log(`  ❌ 失敗 (${status})`);
        console.log(`  ${text}`);
      }
    } catch (error) {
      console.error(`  ❌ エラー: ${error.message}`);
    }

    console.log();
  }

  console.log("完了");
}

clearCacheForAll();
