// マイページAPIをテストして銀行振込注文が表示されるか確認
import { createClient } from "@supabase/supabase-js";
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

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

console.log("=== マイページAPI テスト ===\n");

// 銀行振込顧客を1人選択
const testPatientId = "20251200394"; // フクヤマトモミ

console.log(`テスト対象: patient_id = ${testPatientId}\n`);

// 1. Supabaseで直接確認
console.log("【1. Supabase直接確認】");

const { data: creditOrders } = await supabase
  .from("orders")
  .select("id, product_code, amount, paid_at")
  .eq("patient_id", testPatientId);

console.log(`クレカ決済: ${creditOrders?.length || 0} 件`);
if (creditOrders && creditOrders.length > 0) {
  creditOrders.forEach(o => {
    console.log(`  - ID: ${o.id}, ${o.product_code}, ${o.amount}円`);
  });
}

const { data: bankOrders } = await supabase
  .from("bank_transfer_orders")
  .select("id, product_code, status, confirmed_at")
  .eq("patient_id", testPatientId);

console.log(`銀行振込: ${bankOrders?.length || 0} 件`);
if (bankOrders && bankOrders.length > 0) {
  bankOrders.forEach(o => {
    console.log(`  - ID: ${o.id}, ${o.product_code}, status: ${o.status}, confirmed_at: ${o.confirmed_at}`);
  });
}

// 2. マイページAPIを呼び出し
console.log("\n【2. マイページAPI呼び出し】");
console.log("USE_SUPABASE:", envVars.USE_SUPABASE);

const apiUrl = "http://localhost:3000/api/mypage";

try {
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cookie": `patient_id=${testPatientId}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("❌ API呼び出し失敗:", response.status, data);
    process.exit(1);
  }

  console.log(`✅ API呼び出し成功`);
  console.log(`\norders配列: ${data.orders?.length || 0} 件\n`);

  if (data.orders && data.orders.length > 0) {
    data.orders.forEach((o, i) => {
      console.log(`${i + 1}. ID: ${o.id}`);
      console.log(`   商品: ${o.productName} (${o.productCode})`);
      console.log(`   金額: ${o.amount}円`);
      console.log(`   決済日: ${o.paidAt}`);
      console.log(`   決済方法: ${o.paymentMethod || "(未指定)"}`);
      console.log(`   配送状況: ${o.shippingStatus}`);
      console.log();
    });
  } else {
    console.log("⚠️ 注文が0件です");
  }

  // 銀行振込注文が含まれているか確認
  const hasBankTransfer = data.orders?.some(o => o.id.toString().startsWith("bank_"));
  console.log(`銀行振込注文が含まれているか: ${hasBankTransfer ? "✅ YES" : "❌ NO"}`);

} catch (e) {
  console.error("❌ エラー:", e.message);
}

console.log("\n=== テスト完了 ===");
