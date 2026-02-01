// scripts/test-bank-transfer-detailed.mjs
// 銀行振込フローのテスト（詳細版）

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

const BASE_URL = "http://localhost:3000";

// 環境変数読み込み
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

console.log("=== 銀行振込フロー詳細テスト ===\n");

// 1. まずSupabaseに直接挿入してみる
console.log("📊 Step 1: Supabaseに直接挿入テスト\n");

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const testData = {
  patient_id: "TEST_DIRECT_" + Date.now(),
  product_code: "MJL_2.5mg_1m",
  account_name: "テストタロウ",
  phone_number: "09012345678",
  email: "test@example.com",
  postal_code: "123-4567",
  address: "東京都千代田区丸の内1-1-1",
  status: "confirmed",
  mode: "first",
  reorder_id: null,
};

console.log("挿入データ:");
console.log(JSON.stringify(testData, null, 2));
console.log();

const { data: inserted, error: insertError } = await supabase
  .from("bank_transfer_orders")
  .insert(testData)
  .select();

if (insertError) {
  console.log("❌ Supabase直接挿入エラー:");
  console.log(JSON.stringify(insertError, null, 2));
} else {
  console.log("✅ Supabase直接挿入成功:");
  console.log("  ID:", inserted[0].id);
  console.log("  patient_id:", inserted[0].patient_id);
  console.log("  mode:", inserted[0].mode);
  console.log();
}

// 2. API経由でテスト
console.log("📤 Step 2: API経由テスト\n");

const apiTestData = {
  patientId: "TEST_API_" + Date.now(),
  productCode: "MJL_2.5mg_1m",
  mode: "first",
  reorderId: null,
  accountName: "ヤマダタロウ",
  phoneNumber: "09012345678",
  email: "test@example.com",
  postalCode: "123-4567",
  address: "東京都千代田区丸の内1-1-1 テストビル101号室",
};

console.log("APIリクエストデータ:");
console.log(JSON.stringify(apiTestData, null, 2));
console.log();

try {
  const res = await fetch(`${BASE_URL}/api/bank-transfer/shipping`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(apiTestData),
  });

  console.log(`レスポンス: ${res.status} ${res.statusText}`);

  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }

  console.log("\nレスポンスボディ:");
  console.log(JSON.stringify(json, null, 2));

  if (res.ok) {
    console.log("\n✅ API経由テスト成功");

    // DBで確認
    const { data: check } = await supabase
      .from("bank_transfer_orders")
      .select("*")
      .eq("patient_id", apiTestData.patientId)
      .single();

    if (check) {
      console.log("\n✅ DBに保存確認:");
      console.log("  ID:", check.id);
      console.log("  patient_id:", check.patient_id);
      console.log("  mode:", check.mode);
      console.log("  reorder_id:", check.reorder_id);
    }
  } else {
    console.log("\n❌ API経由テスト失敗");
  }
} catch (e) {
  console.error("\n❌ エラー:", e.message);
}

console.log("\n=== テスト完了 ===");
