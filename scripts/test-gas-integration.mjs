// 新規データがSupabase + GASシート両方に入るかテスト
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

console.log("=== GAS統合テスト（新規データ） ===\n");

const testData = {
  patientId: "TEST_GAS_" + Date.now(),
  productCode: "MJL_2.5mg_1m",
  mode: "first",
  reorderId: null,
  accountName: "テストイチロウ",
  phoneNumber: "09011112222",
  email: "gas-test@example.com",
  postalCode: "100-0001",
  address: "東京都千代田区千代田1-1",
};

console.log("送信データ:");
console.log(JSON.stringify(testData, null, 2));
console.log();

try {
  console.log("📤 API送信中...");
  const res = await fetch(`${BASE_URL}/api/bank-transfer/shipping`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(testData),
  });

  console.log(`📥 レスポンス: ${res.status} ${res.statusText}\n`);

  const json = await res.json();
  console.log("レスポンス:");
  console.log(JSON.stringify(json, null, 2));
  console.log();

  if (res.ok) {
    // Supabaseで確認
    const supabase = createClient(
      envVars.NEXT_PUBLIC_SUPABASE_URL,
      envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const { data: order } = await supabase
      .from("bank_transfer_orders")
      .select("*")
      .eq("patient_id", testData.patientId)
      .single();

    if (order) {
      console.log("✅ Supabaseに保存確認:");
      console.log(`  ID: ${order.id}`);
      console.log(`  patient_id: ${order.patient_id}`);
      console.log(`  mode: ${order.mode}`);
      console.log();
    }

    console.log("🔍 次のステップ:");
    console.log("  1. GASスプレッドシートを開く");
    console.log("  2. 「2026-01 住所情報」シートを確認");
    console.log(`  3. patient_id: ${testData.patientId} が記録されているか確認`);
  }
} catch (e) {
  console.error("❌ エラー:", e.message);
}

console.log("\n=== テスト完了 ===");
