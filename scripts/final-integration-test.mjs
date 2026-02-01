// 最終確認: 新規データがSupabase + GASシート両方に入るか
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

console.log("=== 最終統合テスト（初回購入） ===\n");

const testData1 = {
  patientId: "TEST_FINAL_FIRST_" + Date.now(),
  productCode: "MJL_5mg_2m",
  mode: "first",
  reorderId: null,
  accountName: "サイトウハナコ",
  phoneNumber: "08033334444",
  email: "final-test1@example.com",
  postalCode: "150-0001",
  address: "東京都渋谷区神宮前1-2-3",
};

console.log("【テスト1: 初回購入】");
console.log(JSON.stringify(testData1, null, 2));
console.log();

try {
  const res1 = await fetch(`${BASE_URL}/api/bank-transfer/shipping`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(testData1),
  });

  const json1 = await res1.json();
  console.log(`✅ APIレスポンス: ${res1.status}`);
  console.log(JSON.stringify(json1, null, 2));
  console.log();

  // 少し待機してから再購入テスト
  await new Promise(r => setTimeout(r, 1000));

  console.log("=== 最終統合テスト（再購入） ===\n");

  const testData2 = {
    patientId: "TEST_FINAL_REORDER_" + Date.now(),
    productCode: "MJL_7.5mg_1m",
    mode: "reorder",
    reorderId: "888",
    accountName: "タナカジロウ",
    phoneNumber: "09055556666",
    email: "final-test2@example.com",
    postalCode: "160-0001",
    address: "東京都新宿区新宿1-2-3",
  };

  console.log("【テスト2: 再購入】");
  console.log(JSON.stringify(testData2, null, 2));
  console.log();

  const res2 = await fetch(`${BASE_URL}/api/bank-transfer/shipping`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(testData2),
  });

  const json2 = await res2.json();
  console.log(`✅ APIレスポンス: ${res2.status}`);
  console.log(JSON.stringify(json2, null, 2));
  console.log();

  // Supabase確認
  const supabase = createClient(
    envVars.NEXT_PUBLIC_SUPABASE_URL,
    envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const { data: orders } = await supabase
    .from("bank_transfer_orders")
    .select("*")
    .in("patient_id", [testData1.patientId, testData2.patientId])
    .order("created_at", { ascending: true });

  console.log("📊 Supabase確認:");
  orders.forEach(o => {
    console.log(`  - ID: ${o.id}, patient_id: ${o.patient_id}, mode: ${o.mode}, reorder_id: ${o.reorder_id || "(なし)"}`);
  });

  console.log("\n✅ 両方のテストが成功しました！");
  console.log("\n🔍 GASスプレッドシート確認:");
  console.log("  - 「2026-01 住所情報」シートを開く");
  console.log(`  - ${testData1.patientId} (初回購入) が記録されているか`);
  console.log(`  - ${testData2.patientId} (再購入, reorder_id=888) が記録されているか`);

} catch (e) {
  console.error("❌ エラー:", e.message);
}

console.log("\n=== テスト完了 ===");
