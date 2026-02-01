// scripts/test-full-bank-transfer-flow.mjs
// 完全な銀行振込フローのテスト（初回 + 再購入）

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

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

console.log("=== 銀行振込フロー完全テスト ===\n");

// Test 1: 初回購入フロー
console.log("【Test 1】初回購入フロー\n");

const test1Data = {
  patientId: "TEST_FIRST_" + Date.now(),
  productCode: "MJL_2.5mg_1m",
  mode: "first",
  reorderId: null,
  accountName: "ヤマダタロウ",
  phoneNumber: "09012345678",
  email: "test-first@example.com",
  postalCode: "123-4567",
  address: "東京都千代田区丸の内1-1-1 テストビル101号室",
};

console.log("リクエストデータ:");
console.log(JSON.stringify(test1Data, null, 2));
console.log();

try {
  const res1 = await fetch(`${BASE_URL}/api/bank-transfer/shipping`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(test1Data),
  });

  console.log(`レスポンス: ${res1.status} ${res1.statusText}`);
  const json1 = await res1.json();
  console.log("レスポンスボディ:", JSON.stringify(json1, null, 2));

  if (res1.ok) {
    console.log("\n✅ API成功");

    // DB確認
    const { data: check1 } = await supabase
      .from("bank_transfer_orders")
      .select("*")
      .eq("patient_id", test1Data.patientId)
      .single();

    if (check1) {
      console.log("\n✅ DB保存確認:");
      console.log("  ID:", check1.id);
      console.log("  patient_id:", check1.patient_id);
      console.log("  product_code:", check1.product_code);
      console.log("  mode:", check1.mode);
      console.log("  reorder_id:", check1.reorder_id);
      console.log("  status:", check1.status);
      console.log("  account_name:", check1.account_name);
      console.log("  phone_number:", check1.phone_number);
      console.log("  email:", check1.email);
      console.log("  address:", check1.address);

      if (check1.mode === "first" && !check1.reorder_id) {
        console.log("\n✅ 初回購入データが正しく保存されています");
      }
    }
  } else {
    console.log("\n❌ Test 1 失敗");
  }
} catch (e) {
  console.error("\n❌ Test 1 エラー:", e.message);
}

console.log("\n" + "=".repeat(60) + "\n");

// Test 2: 再購入フロー
console.log("【Test 2】再購入フロー\n");

const test2Data = {
  patientId: "TEST_REORDER_" + Date.now(),
  productCode: "MJL_5mg_2m",
  mode: "reorder",
  reorderId: "999", // テスト用ID
  accountName: "サトウハナコ",
  phoneNumber: "08012345678",
  email: "test-reorder@example.com",
  postalCode: "456-7890",
  address: "大阪府大阪市北区梅田1-1-1 テストマンション202号室",
};

console.log("リクエストデータ:");
console.log(JSON.stringify(test2Data, null, 2));
console.log();

try {
  const res2 = await fetch(`${BASE_URL}/api/bank-transfer/shipping`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(test2Data),
  });

  console.log(`レスポンス: ${res2.status} ${res2.statusText}`);
  const json2 = await res2.json();
  console.log("レスポンスボディ:", JSON.stringify(json2, null, 2));

  if (res2.ok) {
    console.log("\n✅ API成功");

    // DB確認
    const { data: check2 } = await supabase
      .from("bank_transfer_orders")
      .select("*")
      .eq("patient_id", test2Data.patientId)
      .single();

    if (check2) {
      console.log("\n✅ DB保存確認:");
      console.log("  ID:", check2.id);
      console.log("  patient_id:", check2.patient_id);
      console.log("  product_code:", check2.product_code);
      console.log("  mode:", check2.mode);
      console.log("  reorder_id:", check2.reorder_id);
      console.log("  status:", check2.status);
      console.log("  account_name:", check2.account_name);

      if (check2.mode === "reorder" && check2.reorder_id === "999") {
        console.log("\n✅ 再購入データが正しく保存されています");
        console.log("\n注意: GAS_REORDER_URL への reorder status 更新は");
        console.log("      reorder_id=999 が存在しないためエラーになります。");
        console.log("      実際の運用では有効なreorder_idが使用されます。");
      }
    }
  } else {
    console.log("\n❌ Test 2 失敗");
  }
} catch (e) {
  console.error("\n❌ Test 2 エラー:", e.message);
}

console.log("\n" + "=".repeat(60) + "\n");

// 全体サマリー
console.log("【全体サマリー】\n");

const { data: allOrders } = await supabase
  .from("bank_transfer_orders")
  .select("*")
  .or(`patient_id.eq.${test1Data.patientId},patient_id.eq.${test2Data.patientId}`)
  .order("created_at", { ascending: false });

if (allOrders) {
  console.log(`✅ 今回のテストで ${allOrders.length} 件保存されました:\n`);
  allOrders.forEach((order, i) => {
    console.log(`${i + 1}. ID ${order.id}`);
    console.log(`   patient_id: ${order.patient_id}`);
    console.log(`   mode: ${order.mode}`);
    console.log(`   reorder_id: ${order.reorder_id || "(なし)"}`);
    console.log(`   product: ${order.product_code}`);
    console.log();
  });
}

console.log("=== テスト完了 ===");
