// scripts/clear-cache-20260100576.mjs
// 20260100576のキャッシュをクリア

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
const patientId = "20260100576";
const productionUrl = "https://app.noname-beauty.jp";

async function clearCache() {
  console.log("=== キャッシュクリア ===\n");
  console.log(`URL: ${productionUrl}`);
  console.log(`patient_id: ${patientId}\n`);

  const url = `${productionUrl}/api/admin/invalidate-cache`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        patient_id: patientId
      })
    });

    const status = response.status;
    const text = await response.text();

    console.log(`Status: ${status}`);

    if (status >= 200 && status < 300) {
      console.log("✅ キャッシュクリア成功\n");
      const json = JSON.parse(text);
      console.log(JSON.stringify(json, null, 2));
    } else {
      console.log("❌ 失敗");
      console.log(text);
    }
  } catch (error) {
    console.error("❌ エラー:", error.message);
  }
}

clearCache();
