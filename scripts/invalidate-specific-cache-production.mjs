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
const patientId = process.argv[2] || "20260101640";
const productionUrl = process.argv[3] || "https://noname-beauty.jp";

console.log("=== キャッシュ無効化（本番環境） ===\n");
console.log(`本番URL: ${productionUrl}`);
console.log(`patient_id: ${patientId}`);

if (!adminToken) {
  console.log("\n❌ ADMIN_TOKEN が設定されていません");
  process.exit(1);
}

const url = `${productionUrl}/api/admin/invalidate-cache`;

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
      console.log("\n患者のマイページをリロードすると、最新データが表示されます。");
    } catch {
      console.log("\nResponse:", text);
    }
  } else {
    console.log("❌ キャッシュ無効化失敗");
    console.log("\nResponse:", text);

    if (status === 401) {
      console.log("\n原因: ADMIN_TOKENが一致しません");
    } else if (status === 404) {
      console.log("\n原因: APIエンドポイントが見つかりません");
      console.log(`確認: ${productionUrl} が正しい本番URLですか？`);
    }
  }
} catch (error) {
  console.error("\n❌ エラー発生:", error.message);

  if (error.message.includes("fetch failed") || error.message.includes("ENOTFOUND")) {
    console.log("\n原因: 本番URLに接続できません");
    console.log(`確認: ${productionUrl} が正しい本番URLですか？`);
    console.log("\n使い方: node scripts/invalidate-specific-cache-production.mjs PATIENT_ID [URL]");
  }
}
