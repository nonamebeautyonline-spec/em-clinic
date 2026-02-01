// GAS銀行振込エンドポイントをテスト
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

const gasUrl = envVars.GAS_BANK_TRANSFER_URL;

console.log("=== GAS銀行振込エンドポイントテスト ===\n");
console.log("GAS URL:", gasUrl);
console.log("\nテストデータを送信中...\n");

const testPayload = {
  type: "bank_transfer_order",
  order_id: "TEST_DEBUG_" + Date.now(),
  patient_id: "TEST_DEBUG_PATIENT",
  product_code: "MJL_2.5mg_1m",
  mode: "first",
  reorder_id: null,
  account_name: "テストデバッグ",
  phone_number: "09012345678",
  email: "test@example.com",
  postal_code: "123-4567",
  address: "東京都テスト区1-2-3",
  submitted_at: new Date().toISOString(),
};

try {
  const response = await fetch(gasUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(testPayload),
  });

  console.log("ステータスコード:", response.status);
  console.log("ステータステキスト:", response.statusText);

  const responseText = await response.text();
  console.log("\nレスポンスボディ:");
  console.log(responseText);

  if (response.ok) {
    console.log("\n✅ GAS呼び出し成功");
    console.log("GASシートにデータが追加されたはずです。");
  } else {
    console.log("\n❌ GAS呼び出し失敗");
    console.log("エラーの詳細を確認してください。");
  }
} catch (e) {
  console.error("\n❌ エラー:", e.message);
}
