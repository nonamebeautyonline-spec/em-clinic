// scripts/invalidate-cache-localhost.mjs
// localhostの開発サーバーに対してキャッシュ無効化

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

async function invalidateCache() {
  console.log("=== キャッシュ無効化（localhost） ===\n");
  console.log(`patient_id: ${patientId}`);

  if (!adminToken) {
    console.log("\n❌ ADMIN_TOKEN が設定されていません");
    return;
  }

  // localhost:3000 の開発サーバーに接続
  const url = "http://localhost:3000/api/admin/invalidate-cache";

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
        console.log("\n【削除されたキャッシュ】");
        console.log(`  - Vercel Redis: dashboard:${patientId}`);
        console.log("  - GAS問診シートキャッシュ");
      } catch {
        console.log("\nResponse:", text);
      }
    } else {
      console.log("❌ キャッシュ無効化失敗");
      console.log("\nResponse:", text);

      if (status === 401) {
        console.log("\n原因: ADMIN_TOKENが一致しません");
      } else if (text.includes("ECONNREFUSED")) {
        console.log("\n原因: 開発サーバーが起動していません");
        console.log("→ 別のターミナルで `npm run dev` を実行してください");
      }
    }
  } catch (error) {
    console.error("\n❌ エラー発生:", error.message);

    if (error.message.includes("ECONNREFUSED")) {
      console.log("\n原因: 開発サーバーが起動していません");
      console.log("→ 別のターミナルで `npm run dev` を実行してください");
    }
  }
}

invalidateCache();
