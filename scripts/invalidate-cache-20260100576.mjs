// scripts/invalidate-cache-20260100576.mjs
// patient_id 20260100576 のキャッシュを無効化

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

const vercelUrl = envVars.VERCEL_URL || envVars.NEXT_PUBLIC_VERCEL_URL;
const adminToken = envVars.ADMIN_TOKEN;
const patientId = "20260100576";

async function invalidateCache() {
  console.log("=== キャッシュ無効化 ===\n");
  console.log(`patient_id: ${patientId}`);

  if (!vercelUrl) {
    console.log("\n❌ VERCEL_URL が設定されていません");
    return;
  }

  if (!adminToken) {
    console.log("\n❌ ADMIN_TOKEN が設定されていません");
    return;
  }

  const url = `${vercelUrl}/api/admin/invalidate-cache`;

  console.log(`\nAPI URL: ${url}`);
  console.log("リクエスト送信中...\n");

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

    console.log(`Status: ${status} ${response.statusText}`);

    if (status >= 200 && status < 300) {
      console.log("✅ キャッシュ無効化成功");
      try {
        const json = JSON.parse(text);
        console.log("\nResponse:", JSON.stringify(json, null, 2));
      } catch {
        console.log("\nResponse:", text);
      }
    } else {
      console.log("❌ キャッシュ無効化失敗");
      console.log("\nResponse:", text);
    }
  } catch (error) {
    console.error("\n❌ エラー発生:", error.message);
  }
}

invalidateCache();
