// GASデプロイメントテスト: 新しいコードが正しく動作するか確認
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

console.log("=== GASデプロイメント動作確認 ===\n");

// テスト1: 初回購入
const test1 = {
  patientId: "TEST_DEPLOY_FIRST_" + Date.now(),
  productCode: "MJL_2.5mg_2m",
  mode: "first",
  reorderId: null,
  accountName: "デプロイテストイチロウ",
  phoneNumber: "09099998888",
  email: "deploy-test1@example.com",
  postalCode: "100-0005",
  address: "東京都千代田区丸の内2-3-4",
};

console.log("【テスト1: 初回購入】");
console.log(JSON.stringify(test1, null, 2));
console.log();

try {
  const res1 = await fetch(`${BASE_URL}/api/bank-transfer/shipping`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(test1),
  });

  const json1 = await res1.json();
  console.log(`レスポンス: ${res1.status}`);
  console.log(JSON.stringify(json1, null, 2));

  if (!res1.ok) {
    console.log("❌ テスト1失敗");
    process.exit(1);
  }

  console.log("✅ テスト1成功\n");

  // 少し待機
  await new Promise(r => setTimeout(r, 1000));

  // テスト2: 再購入
  const test2 = {
    patientId: "TEST_DEPLOY_REORDER_" + Date.now(),
    productCode: "MJL_5mg_3m",
    mode: "reorder",
    reorderId: "777",
    accountName: "デプロイテストジロウ",
    phoneNumber: "08077776666",
    email: "deploy-test2@example.com",
    postalCode: "150-0002",
    address: "東京都渋谷区渋谷3-4-5",
  };

  console.log("【テスト2: 再購入】");
  console.log(JSON.stringify(test2, null, 2));
  console.log();

  const res2 = await fetch(`${BASE_URL}/api/bank-transfer/shipping`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(test2),
  });

  const json2 = await res2.json();
  console.log(`レスポンス: ${res2.status}`);
  console.log(JSON.stringify(json2, null, 2));

  if (!res2.ok) {
    console.log("❌ テスト2失敗");
    process.exit(1);
  }

  console.log("✅ テスト2成功\n");

  // Supabase確認
  const supabase = createClient(
    envVars.NEXT_PUBLIC_SUPABASE_URL,
    envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const { data: orders } = await supabase
    .from("bank_transfer_orders")
    .select("*")
    .in("patient_id", [test1.patientId, test2.patientId])
    .order("created_at", { ascending: true });

  console.log("📊 Supabase確認:");
  orders.forEach(o => {
    console.log(`  ✅ ID: ${o.id}, patient_id: ${o.patient_id}, mode: ${o.mode}, reorder_id: ${o.reorder_id || "(なし)"}, status: ${o.status}`);
  });

  console.log("\n🔍 GASスプレッドシート確認:");
  console.log("  - 「2026-01 住所情報」シートを開いてください");
  console.log(`  - ${test1.patientId} (mode: first) が記録されているか`);
  console.log(`  - ${test2.patientId} (mode: reorder, reorder_id: 777) が記録されているか`);
  console.log("  - ステータスが「confirmed」になっているか");
  console.log("  - E列（モード）とF列（再購入ID）が正しく入っているか");

  console.log("\n✅ 両方のテストが成功しました！");
  console.log("\n📝 次のステップ:");
  console.log("  1. GASスプレッドシートでシート構造を確認");
  console.log("  2. 既存データの構造を修正するため、fixSheetStructure関数を実行");
  console.log("     - スプレッドシートを開く → 拡張機能 → Apps Script");
  console.log("     - 関数選択: fixSheetStructure");
  console.log("     - 実行ボタン（▶）をクリック");

} catch (e) {
  console.error("❌ エラー:", e.message);
  process.exit(1);
}

console.log("\n=== テスト完了 ===");
